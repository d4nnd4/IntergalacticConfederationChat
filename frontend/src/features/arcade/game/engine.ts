import { bakeArtBook, type ArtBook, type Baked } from "./art";
import { paintBackdrop, paintSkyline } from "./backdrop";
import { Input } from "./input";
import { Pool } from "./pool";
import { buildWaves, SECTORS, SECTOR_DURATION, type EnemyKind, type Wave } from "./sectors";

export const WIDTH = 320;
export const HEIGHT = 180;

const STEP = 1 / 60;
const MAX_FRAME = 0.1;
const HORIZON = Math.round(HEIGHT * 0.78);
const PLAY_TOP = 6;
const PLAY_BOTTOM = HEIGHT - 6;
const SKYLINE_HEIGHT = 34;
const SCROLL_SPEED = 40;
const PLAYER_SPEED = 120;
const SHOT_SPEED = 260;
const FIRE_INTERVAL = 0.11;
const HEAT_PER_SHOT = 8;
const HEAT_COOL_FIRING = 24;
const HEAT_COOL_IDLE = 60;
const HEAT_RECOVER = 35;
const START_LIVES = 3;
const START_PULSES = 2;
const MAX_PULSES = 5;
const EXTRA_LIFE_EVERY = 5000;
const INVULNERABLE_AFTER_HIT = 2.2;
const PULSE_RADIUS = 230;
const PULSE_DURATION = 0.6;
const PULSE_DAMAGE = 3;
const TWIN_DURATION = 10;
const DROP_CHANCE = 0.09;
const CLEAR_DELAY = 3.5;
const BANNER_TIME = 2.6;

export interface Hud {
  score: number;
  lives: number;
  heat: number;
  overheated: boolean;
  pulses: number;
  sector: string;
  loop: number;
  bossHealth: number | null;
  twin: boolean;
}

export interface EngineEvents {
  hud: (hud: Hud) => void;
  banner: (text: string | null) => void;
  paused: (paused: boolean) => void;
  over: (score: number) => void;
}

interface Body {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
}

interface Enemy extends Body {
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  age: number;
  baseY: number;
  phase: number;
  fireIn: number;
  burstIn: number;
  flash: number;
  pulseMark: number;
}

interface Particle extends Body {
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Pickup extends Body {
  kind: "coolant" | "twin";
  age: number;
}

const STATS: Record<EnemyKind, { hp: number; score: number }> = {
  monolith: { hp: 1, score: 10 },
  wisp: { hp: 1, score: 15 },
  skull: { hp: 4, score: 50 },
  spire: { hp: 5, score: 60 },
  warden: { hp: 90, score: 1000 },
};

const body = (): Body => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0 });

const overlaps = (a: Body, b: Body) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class RingfallEngine {
  readonly input = new Input();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly art: ArtBook;
  private readonly enemies = new Pool<Enemy>(48, () => ({
    ...body(),
    kind: "monolith",
    hp: 0,
    maxHp: 0,
    age: 0,
    baseY: 0,
    phase: 0,
    fireIn: 0,
    burstIn: 0,
    flash: 0,
    pulseMark: -1,
  }));
  private readonly shots = new Pool<Body>(48, body);
  private readonly hostile = new Pool<Body>(160, body);
  private readonly particles = new Pool<Particle>(320, () => ({ ...body(), life: 0, maxLife: 1, color: "#fff", size: 1 }));
  private readonly pickups = new Pool<Pickup>(8, () => ({ ...body(), kind: "coolant", age: 0 }));
  private readonly streaks = Array.from({ length: 22 }, (_, i) => ({
    x: (i * 53) % WIDTH,
    y: HORIZON + 3 + ((i * 37) % (HEIGHT - HORIZON - 4)),
    w: 4 + (i % 5) * 3,
  }));

  private readonly player = { x: 40, y: HEIGHT / 2, w: 16, h: 9, invulnerable: 0, thrust: 0 };
  private readonly hitbox = body();
  private readonly hull = body();
  private backdrop: HTMLCanvasElement | null = null;
  private skyline: HTMLCanvasElement | null = null;
  private waves: Wave[] = [];
  private waveIndex = 0;
  private sectorIndex = 0;
  private loop = 0;
  private sectorTime = 0;
  private bossSpawned = false;
  private clearIn = 0;
  private bannerIn = 0;
  private scroll = 0;
  private shake = 0;
  private score = 0;
  private nextExtraLife = EXTRA_LIFE_EVERY;
  private lives = START_LIVES;
  private pulses = START_PULSES;
  private heat = 0;
  private overheated = false;
  private fireIn = 0;
  private lastShotAt = -1;
  private twinFor = 0;
  private clock = 0;
  private pulse = { active: false, x: 0, y: 0, age: 0, id: 0 };
  private running = false;
  private paused = false;
  private frameHandle = 0;
  private lastFrame = 0;
  private accumulator = 0;
  private lastHud = "";
  private detachInput: (() => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly events: EngineEvents,
  ) {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("Canvas 2D is not available");
    }
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.art = bakeArtBook();
    this.detachInput = this.input.attach(canvas, WIDTH, HEIGHT);
    this.prepareSector();
    this.render();
  }

  start(): void {
    this.enemies.clear();
    this.shots.clear();
    this.hostile.clear();
    this.particles.clear();
    this.pickups.clear();
    this.input.reset();
    Object.assign(this.player, { x: 40, y: HEIGHT / 2, invulnerable: 1.5 });
    this.sectorIndex = 0;
    this.loop = 0;
    this.score = 0;
    this.nextExtraLife = EXTRA_LIFE_EVERY;
    this.lives = START_LIVES;
    this.pulses = START_PULSES;
    this.heat = 0;
    this.overheated = false;
    this.twinFor = 0;
    this.pulse.active = false;
    this.prepareSector();
    this.running = true;
    this.paused = false;
    this.resumeLoop();
  }

  setPaused(paused: boolean): void {
    if (!this.running || paused === this.paused) {
      return;
    }
    this.paused = paused;
    this.events.paused(paused);
    if (paused) {
      cancelAnimationFrame(this.frameHandle);
      this.input.reset();
    } else {
      this.resumeLoop();
    }
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
    this.detachInput?.();
    this.detachInput = null;
  }

  private resumeLoop(): void {
    cancelAnimationFrame(this.frameHandle);
    this.lastFrame = performance.now();
    this.accumulator = 0;
    this.frameHandle = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number) => {
    if (!this.running || this.paused) {
      return;
    }
    this.frameHandle = requestAnimationFrame(this.frame);
    this.accumulator += Math.min((now - this.lastFrame) / 1000, MAX_FRAME);
    this.lastFrame = now;
    while (this.accumulator >= STEP && this.running && !this.paused) {
      this.update(STEP);
      this.accumulator -= STEP;
    }
    this.render();
    this.emitHud();
  };

  private prepareSector(): void {
    const sector = SECTORS[this.sectorIndex]!;
    this.backdrop = paintBackdrop(sector, WIDTH, HEIGHT, HORIZON);
    this.skyline = paintSkyline(sector, WIDTH * 2, SKYLINE_HEIGHT);
    this.waves = buildWaves(this.sectorIndex, this.loop, PLAY_TOP, PLAY_BOTTOM);
    this.waveIndex = 0;
    this.sectorTime = 0;
    this.bossSpawned = false;
    this.clearIn = 0;
    this.announce(`Sector ${this.sectorIndex + 1} · ${sector.name}${this.loop > 0 ? ` · Loop ${this.loop + 1}` : ""}`);
  }

  private announce(text: string): void {
    this.bannerIn = BANNER_TIME;
    this.events.banner(text);
  }

  private get difficulty(): number {
    return 1 + 0.15 * this.sectorIndex + 0.35 * this.loop;
  }

  private update(dt: number): void {
    this.clock += dt;
    this.sectorTime += dt;
    this.scroll += SCROLL_SPEED * dt;
    this.shake = Math.max(0, this.shake - dt * 12);

    if (this.bannerIn > 0) {
      this.bannerIn -= dt;
      if (this.bannerIn <= 0) {
        this.events.banner(null);
      }
    }
    if (this.input.consumePause()) {
      this.setPaused(true);
      return;
    }

    this.updatePlayer(dt);
    this.updateSpawning();
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updatePulse(dt);
    this.resolveCollisions();

    if (this.clearIn > 0) {
      this.clearIn -= dt;
      if (this.clearIn <= 0) {
        this.sectorIndex += 1;
        if (this.sectorIndex >= SECTORS.length) {
          this.sectorIndex = 0;
          this.loop += 1;
        }
        this.prepareSector();
      }
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    const input = this.input;
    let dx = input.axisX;
    let dy = input.axisY;
    if (input.pointer.active) {
      const tx = input.pointer.x - p.w / 2 - 18;
      const ty = input.pointer.y - p.h / 2;
      dx = clamp((tx - p.x) / 12, -1, 1);
      dy = clamp((ty - p.y) / 12, -1, 1);
    } else if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    p.x = clamp(p.x + dx * PLAYER_SPEED * dt, 2, WIDTH * 0.72);
    p.y = clamp(p.y + dy * PLAYER_SPEED * dt, PLAY_TOP, PLAY_BOTTOM - p.h);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.thrust += dt;

    const idle = this.clock - this.lastShotAt > 0.35;
    this.heat = Math.max(0, this.heat - (idle ? HEAT_COOL_IDLE : HEAT_COOL_FIRING) * dt);
    if (this.overheated && this.heat <= HEAT_RECOVER) {
      this.overheated = false;
    }
    this.fireIn -= dt;
    this.twinFor = Math.max(0, this.twinFor - dt);

    if (input.firing && this.fireIn <= 0 && !this.overheated) {
      this.fireIn = FIRE_INTERVAL;
      this.lastShotAt = this.clock;
      const offsets = this.twinFor > 0 ? [-3, 3] : [0];
      for (const offset of offsets) {
        const shot = this.shots.spawn();
        if (shot) {
          Object.assign(shot, { x: p.x + p.w - 2, y: p.y + 3.5 + offset, vx: SHOT_SPEED, vy: 0, w: 6, h: 2 });
        }
      }
      this.heat += HEAT_PER_SHOT;
      if (this.heat >= 100) {
        this.heat = 100;
        this.overheated = true;
        this.burst(p.x + 2, p.y + 4, 8, "#ef5a2a", 40);
      }
    }

    if (input.consumePulse() && this.pulses > 0 && !this.pulse.active) {
      this.pulses -= 1;
      Object.assign(this.pulse, { active: true, x: p.x + p.w / 2, y: p.y + p.h / 2, age: 0, id: this.pulse.id + 1 });
      p.invulnerable = Math.max(p.invulnerable, PULSE_DURATION);
      this.shake = 2;
    }
  }

  private updateSpawning(): void {
    while (this.waveIndex < this.waves.length && this.sectorTime >= this.waves[this.waveIndex]!.at) {
      this.spawnWave(this.waves[this.waveIndex]!);
      this.waveIndex += 1;
    }
    if (!this.bossSpawned && this.waveIndex >= this.waves.length && this.sectorTime > SECTOR_DURATION + 3) {
      this.bossSpawned = true;
      this.spawnEnemy("warden", WIDTH + 10, HEIGHT / 2 - 24, 0);
      this.announce("Warning · The Ring Warden approaches");
    }
  }

  private spawnWave(wave: Wave): void {
    const mid = (wave.count - 1) / 2;
    for (let i = 0; i < wave.count; i++) {
      let x = WIDTH + 8;
      let y = wave.y;
      switch (wave.formation) {
        case "line":
        case "sine":
          x += i * 22;
          break;
        case "column":
          y += (i - mid) * 16;
          break;
        case "vee":
          x += Math.abs(i - mid) * 14;
          y += (i - mid) * 12;
          break;
      }
      if (wave.kind === "spire") {
        x = WIDTH + 8 + i * 70;
      }
      this.spawnEnemy(wave.kind, x, y, i * 0.6);
    }
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number, phase: number): void {
    const enemy = this.enemies.spawn();
    if (!enemy) {
      return;
    }
    const sprite = this.spriteFor(kind);
    const hp = Math.round(STATS[kind].hp * (kind === "warden" ? 1 + 0.35 * this.sectorIndex + 0.5 * this.loop : 1));
    const d = this.difficulty;
    Object.assign(enemy, {
      kind,
      x,
      y: kind === "spire" ? PLAY_BOTTOM - sprite.height + 2 : clamp(y, PLAY_TOP, PLAY_BOTTOM - sprite.height),
      w: sprite.width,
      h: sprite.height,
      hp,
      maxHp: hp,
      age: 0,
      phase,
      flash: 0,
      pulseMark: -1,
      vy: 0,
      fireIn: 1 + Math.random() * 1.2,
      burstIn: 3,
      vx: kind === "monolith" ? -(55 + Math.random() * 20) * d : kind === "wisp" ? -48 * d : kind === "spire" ? -SCROLL_SPEED : -60,
    });
    enemy.baseY = enemy.y;
  }

  private spriteFor(kind: EnemyKind): Baked {
    return this.art[kind];
  }

  private updateEnemies(dt: number): void {
    const d = this.difficulty;
    for (const e of this.enemies.items) {
      if (!e.active) {
        continue;
      }
      e.age += dt;
      e.flash = Math.max(0, e.flash - dt);
      switch (e.kind) {
        case "monolith":
          e.x += e.vx * dt;
          break;
        case "wisp":
          e.x += e.vx * dt;
          e.y = clamp(e.baseY + Math.sin(e.age * 3 + e.phase) * 22, PLAY_TOP, PLAY_BOTTOM - e.h);
          break;
        case "skull":
          if (e.age < 5 && e.x > 246) {
            e.x += e.vx * dt;
          } else if (e.age >= 5) {
            e.x -= 110 * dt;
          }
          e.y = clamp(e.baseY + Math.sin(e.age * 1.5) * 10, PLAY_TOP, PLAY_BOTTOM - e.h);
          this.tickFire(e, dt, 1.3 / d, () => this.aimAt(e, 80 * d, 0));
          break;
        case "spire":
          e.x += e.vx * dt;
          this.tickFire(e, dt, 1.8 / d, () => this.aimAt(e, 70 * d, 0));
          break;
        case "warden":
          this.updateWarden(e, dt, d);
          break;
      }
      if (e.x < -e.w - 8 || (e.kind !== "warden" && e.x > WIDTH + 400)) {
        e.active = false;
      }
    }
  }

  private updateWarden(e: Enemy, dt: number, d: number): void {
    if (e.x > 236) {
      e.x -= 36 * dt;
    }
    e.y = HEIGHT / 2 - e.h / 2 + Math.sin(e.age * 0.8) * 44;
    const enraged = e.hp < e.maxHp / 2;
    this.tickFire(e, dt, (enraged ? 1.0 : 1.4) / d, () => {
      for (let i = -2; i <= 2; i++) {
        this.aimAt(e, 90 * d, i * 0.22);
      }
    });
    if (enraged) {
      e.burstIn -= dt;
      if (e.burstIn <= 0) {
        e.burstIn = 2.6 / d;
        const cx = e.x + e.w / 2;
        const cy = e.y + e.h / 2;
        for (let i = 0; i < 14; i++) {
          const angle = (i / 14) * Math.PI * 2 + e.age;
          this.fireHostile(cx, cy, Math.cos(angle) * 70 * d, Math.sin(angle) * 70 * d);
        }
        this.spawnEnemy("wisp", WIDTH + 8, e.y - 20, 0);
        this.spawnEnemy("wisp", WIDTH + 8, e.y + e.h + 10, Math.PI);
      }
    }
  }

  private tickFire(e: Enemy, dt: number, interval: number, fire: () => void): void {
    e.fireIn -= dt;
    if (e.fireIn <= 0 && e.x < WIDTH - 12) {
      e.fireIn = interval;
      fire();
    }
  }

  private aimAt(e: Enemy, speed: number, spread: number): void {
    const p = this.player;
    const sx = e.x + (e.kind === "warden" ? 20 : 2);
    const sy = e.y + e.h / 2;
    const angle = Math.atan2(p.y + p.h / 2 - sy, p.x + p.w / 2 - sx) + spread;
    this.fireHostile(sx, sy, Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  private fireHostile(x: number, y: number, vx: number, vy: number): void {
    const shot = this.hostile.spawn();
    if (shot) {
      Object.assign(shot, { x: x - 2, y: y - 2, vx, vy, w: 4, h: 4 });
    }
  }

  private updateProjectiles(dt: number): void {
    for (const s of this.shots.items) {
      if (s.active) {
        s.x += s.vx * dt;
        if (s.x > WIDTH) {
          s.active = false;
        }
      }
    }
    for (const s of this.hostile.items) {
      if (s.active) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x < -6 || s.x > WIDTH + 6 || s.y < -6 || s.y > HEIGHT + 6) {
          s.active = false;
        }
      }
    }
  }

  private updatePickups(dt: number): void {
    for (const pickup of this.pickups.items) {
      if (pickup.active) {
        pickup.age += dt;
        pickup.x -= 30 * dt;
        pickup.y += Math.sin(pickup.age * 4) * 0.3;
        if (pickup.x < -10) {
          pickup.active = false;
        }
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles.items) {
      if (particle.active) {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 0.96;
        particle.vy *= 0.96;
        if (particle.life <= 0) {
          particle.active = false;
        }
      }
    }
  }

  private updatePulse(dt: number): void {
    const pulse = this.pulse;
    if (!pulse.active) {
      return;
    }
    pulse.age += dt;
    if (pulse.age >= PULSE_DURATION) {
      pulse.active = false;
      return;
    }
    const radius = (pulse.age / PULSE_DURATION) * PULSE_RADIUS;
    const r2 = radius * radius;
    for (const s of this.hostile.items) {
      if (s.active && (s.x - pulse.x) ** 2 + (s.y - pulse.y) ** 2 <= r2) {
        s.active = false;
        this.burst(s.x, s.y, 2, "#ffd166", 30);
      }
    }
    for (const e of this.enemies.items) {
      if (e.active && e.pulseMark !== pulse.id) {
        const cx = e.x + e.w / 2;
        const cy = e.y + e.h / 2;
        if ((cx - pulse.x) ** 2 + (cy - pulse.y) ** 2 <= r2) {
          e.pulseMark = pulse.id;
          this.damage(e, PULSE_DAMAGE);
        }
      }
    }
  }

  private resolveCollisions(): void {
    const p = this.player;
    const hitbox = Object.assign(this.hitbox, { x: p.x + 4, y: p.y + 3, w: 9, h: 3 });

    for (const e of this.enemies.items) {
      if (!e.active) {
        continue;
      }
      for (const s of this.shots.items) {
        if (s.active && e.active && overlaps(s, e)) {
          s.active = false;
          this.damage(e, 1);
        }
      }
      if (e.active && p.invulnerable <= 0 && overlaps(hitbox, e)) {
        this.hurtPlayer();
        if (e.kind !== "warden") {
          this.damage(e, 2);
        }
      }
    }

    if (p.invulnerable <= 0) {
      for (const s of this.hostile.items) {
        if (s.active && overlaps(hitbox, s)) {
          s.active = false;
          this.hurtPlayer();
          break;
        }
      }
    }

    const hull = Object.assign(this.hull, { x: p.x, y: p.y, w: p.w, h: p.h });
    for (const pickup of this.pickups.items) {
      if (pickup.active && overlaps(hull, pickup)) {
        pickup.active = false;
        if (pickup.kind === "coolant") {
          this.heat = 0;
          this.overheated = false;
          this.pulses = Math.min(MAX_PULSES, this.pulses + 1);
        } else {
          this.twinFor = TWIN_DURATION;
        }
        this.addScore(25);
        this.burst(pickup.x + 4, pickup.y + 4, 10, pickup.kind === "coolant" ? "#5fd0c8" : "#ffd166", 50);
      }
    }
  }

  private damage(e: Enemy, amount: number): void {
    e.hp -= amount;
    e.flash = 0.06;
    if (e.hp > 0) {
      return;
    }
    e.active = false;
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    this.addScore(STATS[e.kind].score);
    if (e.kind === "warden") {
      this.burst(cx, cy, 120, "#ffd166", 140);
      this.burst(cx, cy, 80, "#ef5a2a", 100);
      this.burst(cx, cy, 40, "#ffffff", 60);
      this.shake = 6;
      this.hostile.clear();
      this.clearIn = CLEAR_DELAY;
      this.announce("Sector clear");
      return;
    }
    this.burst(cx, cy, e.kind === "skull" || e.kind === "spire" ? 26 : 14, "#ffd166", 70);
    this.burst(cx, cy, 8, "#ef5a2a", 50);
    const chance = e.kind === "skull" ? 0.35 : DROP_CHANCE;
    if (Math.random() < chance) {
      const pickup = this.pickups.spawn();
      if (pickup) {
        Object.assign(pickup, { kind: Math.random() < 0.6 ? "coolant" : "twin", x: cx - 4, y: cy - 4, w: 8, h: 8, age: 0 });
      }
    }
  }

  private hurtPlayer(): void {
    const p = this.player;
    this.burst(p.x + 8, p.y + 4, 40, "#ffffff", 90);
    this.burst(p.x + 8, p.y + 4, 30, "#ef5a2a", 70);
    this.shake = 4;
    this.lives -= 1;
    this.heat = 0;
    this.overheated = false;
    this.twinFor = 0;
    p.invulnerable = INVULNERABLE_AFTER_HIT;
    if (this.lives <= 0) {
      this.running = false;
      this.emitHud();
      this.render();
      this.events.banner(null);
      this.events.over(this.score);
    }
  }

  private addScore(points: number): void {
    this.score += points;
    if (this.score >= this.nextExtraLife) {
      this.nextExtraLife += EXTRA_LIFE_EVERY;
      this.lives += 1;
    }
  }

  private burst(x: number, y: number, count: number, color: string, speed: number): void {
    for (let i = 0; i < count; i++) {
      const particle = this.particles.spawn();
      if (!particle) {
        return;
      }
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random() * 0.7);
      const life = 0.25 + Math.random() * 0.45;
      Object.assign(particle, {
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        color,
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
  }

  private emitHud(): void {
    const boss = this.enemies.items.find((e) => e.active && e.kind === "warden");
    const hud: Hud = {
      score: this.score,
      lives: this.lives,
      heat: Math.round(this.heat),
      overheated: this.overheated,
      pulses: this.pulses,
      sector: SECTORS[this.sectorIndex]!.name,
      loop: this.loop + 1,
      bossHealth: boss ? Math.max(0, boss.hp / boss.maxHp) : null,
      twin: this.twinFor > 0,
    };
    const key = `${hud.score}|${hud.lives}|${hud.heat}|${hud.overheated}|${hud.pulses}|${hud.sector}|${hud.loop}|${hud.bossHealth?.toFixed(2)}|${hud.twin}`;
    if (key !== this.lastHud) {
      this.lastHud = key;
      this.events.hud(hud);
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const shakeX = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    const shakeY = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    ctx.setTransform(1, 0, 0, 1, shakeX, shakeY);

    if (this.backdrop) {
      ctx.drawImage(this.backdrop, 0, 0);
    }
    if (this.skyline) {
      const span = this.skyline.width;
      const offset = Math.floor((this.scroll * 0.25) % span);
      ctx.drawImage(this.skyline, -offset, HORIZON - SKYLINE_HEIGHT);
      ctx.drawImage(this.skyline, span - offset, HORIZON - SKYLINE_HEIGHT);
    }
    this.renderGround(ctx);

    for (const pickup of this.pickups.items) {
      if (pickup.active) {
        const art = pickup.kind === "coolant" ? this.art.coolant : this.art.twin;
        ctx.drawImage(Math.floor(pickup.age * 6) % 2 ? art.flash : art.image, Math.round(pickup.x), Math.round(pickup.y));
      }
    }
    for (const e of this.enemies.items) {
      if (e.active) {
        const sprite = this.spriteFor(e.kind);
        ctx.drawImage(e.flash > 0 ? sprite.flash : sprite.image, Math.round(e.x), Math.round(e.y));
      }
    }
    for (const s of this.hostile.items) {
      if (s.active) {
        ctx.drawImage(this.art.enemyShot.image, Math.round(s.x), Math.round(s.y));
      }
    }
    for (const s of this.shots.items) {
      if (s.active) {
        ctx.drawImage(this.art.playerShot.image, Math.round(s.x), Math.round(s.y));
      }
    }

    const p = this.player;
    const visible = this.running ? p.invulnerable <= 0 || Math.floor(p.invulnerable * 10) % 2 === 0 : this.lives > 0;
    if (visible) {
      const sprite = Math.floor(p.thrust * 14) % 2 ? this.art.shipThrust : this.art.ship;
      ctx.drawImage(sprite.image, Math.round(p.x), Math.round(p.y));
    }

    for (const particle of this.particles.items) {
      if (particle.active) {
        ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        ctx.fillStyle = particle.color;
        ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
      }
    }
    ctx.globalAlpha = 1;

    if (this.pulse.active) {
      const progress = this.pulse.age / PULSE_DURATION;
      ctx.strokeStyle = `rgba(255, 209, 102, ${1 - progress})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.pulse.x, this.pulse.y, progress * PULSE_RADIUS, progress * PULSE_RADIUS * 0.35, -0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private renderGround(ctx: CanvasRenderingContext2D): void {
    const sector = SECTORS[this.sectorIndex]!;
    ctx.fillStyle = sector.streak;
    for (const streak of this.streaks) {
      const depth = (streak.y - HORIZON) / (HEIGHT - HORIZON);
      const speed = 0.4 + depth * 2.2;
      const span = WIDTH + streak.w;
      const x = Math.floor(span - ((this.scroll * speed + streak.x) % span)) - streak.w;
      const width = sector.water ? streak.w + Math.round(Math.sin(this.clock * 3 + streak.x) * 2) : streak.w;
      ctx.fillRect(x, streak.y, Math.max(1, width), 1);
    }
  }
}
