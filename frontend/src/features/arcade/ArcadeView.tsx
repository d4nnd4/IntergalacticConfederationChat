import { useCallback, useEffect, useRef, useState } from "react";
import { storage } from "../../lib/storage";
import { ChromeButton } from "../../ui/ChromeButton";
import { Monolith } from "../../ui/Monolith";
import { RingBand } from "../../ui/RingBand";
import { Saucer } from "../../ui/Saucer";
import styles from "./ArcadeView.module.css";
import { HEIGHT, RingfallEngine, WIDTH, type Hud } from "./game/engine";

const BEST_KEY = "ic.ringfall.best";

type Phase = "title" | "playing" | "paused" | "over";

interface HudElements {
  score: HTMLSpanElement | null;
  lives: HTMLSpanElement | null;
  heat: HTMLSpanElement | null;
  heatMeter: HTMLDivElement | null;
  pulses: HTMLSpanElement | null;
  sector: HTMLSpanElement | null;
  boss: HTMLDivElement | null;
  bossFill: HTMLSpanElement | null;
}

const pad = (value: number) => value.toString().padStart(6, "0");

export default function ArcadeView() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<RingfallEngine | null>(null);
  const best = useRef(Number(storage.get(BEST_KEY)) || 0);
  const hud = useRef<HudElements>({
    score: null,
    lives: null,
    heat: null,
    heatMeter: null,
    pulses: null,
    sector: null,
    boss: null,
    bossFill: null,
  });
  const [phase, setPhase] = useState<Phase>("title");
  const [banner, setBanner] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState(0);

  const applyHud = useCallback((state: Hud) => {
    const el = hud.current;
    if (el.score) el.score.textContent = pad(state.score);
    if (el.lives) el.lives.textContent = "▲".repeat(Math.max(0, Math.min(state.lives, 8)));
    if (el.heat) el.heat.style.transform = `scaleX(${state.heat / 100})`;
    if (el.heatMeter) {
      el.heatMeter.dataset.overheated = String(state.overheated);
      el.heatMeter.dataset.twin = String(state.twin);
    }
    if (el.pulses) el.pulses.textContent = "◉".repeat(state.pulses) || "—";
    if (el.sector) el.sector.textContent = state.loop > 1 ? `${state.sector} · L${state.loop}` : state.sector;
    if (el.boss) el.boss.hidden = state.bossHealth === null;
    if (el.bossFill && state.bossHealth !== null) el.bossFill.style.transform = `scaleX(${state.bossHealth})`;
  }, []);

  useEffect(() => {
    const surface = canvas.current;
    if (!surface) {
      return;
    }
    const instance = new RingfallEngine(surface, {
      hud: applyHud,
      banner: setBanner,
      paused: (paused) => setPhase(paused ? "paused" : "playing"),
      over: (score) => {
        if (score > best.current) {
          best.current = score;
          storage.set(BEST_KEY, String(score));
        }
        if (hud.current.boss) {
          hud.current.boss.hidden = true;
        }
        setLastScore(score);
        setPhase("over");
      },
    });
    engine.current = instance;
    const onVisibility = () => {
      if (document.hidden) {
        instance.setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      instance.destroy();
      engine.current = null;
    };
  }, [applyHud]);

  useEffect(() => {
    const container = stage.current;
    const surface = canvas.current;
    if (!container || !surface) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }
      const fit = Math.min(entry.contentRect.width / WIDTH, entry.contentRect.height / HEIGHT);
      const scale = fit >= 1 ? Math.floor(fit) : fit;
      surface.style.width = `${Math.floor(WIDTH * scale)}px`;
      surface.style.height = `${Math.floor(HEIGHT * scale)}px`;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== "paused") {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "KeyP" || event.code === "Escape") {
        event.preventDefault();
        engine.current?.setPaused(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const launch = () => {
    setPhase("playing");
    engine.current?.start();
    canvas.current?.focus();
  };

  return (
    <div className={styles.layout}>
      <Monolith className={styles.cabinet} label="Ringfall arcade">
        <div className={styles.hud}>
          <span className={styles.hudItem}>
            <span className={styles.hudLabel}>Score</span>
            <span className={styles.score} ref={(el) => void (hud.current.score = el)}>
              000000
            </span>
          </span>
          <span className={styles.hudItem}>
            <span className={styles.hudLabel}>Hulls</span>
            <span className={styles.lives} ref={(el) => void (hud.current.lives = el)}>
              ▲▲▲
            </span>
          </span>
          <div className={styles.heat} ref={(el) => void (hud.current.heatMeter = el)}>
            <span className={styles.hudLabel}>Heat</span>
            <span className={styles.heatTrack}>
              <span className={styles.heatFill} ref={(el) => void (hud.current.heat = el)} />
            </span>
          </div>
          <span className={styles.hudItem}>
            <span className={styles.hudLabel}>Pulses</span>
            <span className={styles.pulses} ref={(el) => void (hud.current.pulses = el)}>
              ◉◉
            </span>
          </span>
          <span className={styles.hudItem}>
            <span className={styles.hudLabel}>Sector</span>
            <span className={styles.sector} ref={(el) => void (hud.current.sector = el)}>
              Violet Shore
            </span>
          </span>
        </div>

        <div className={styles.stage} ref={stage}>
          <canvas
            ref={canvas}
            className={`${styles.canvas} pixelated`}
            tabIndex={0}
            aria-label="Ringfall play field"
          />
          <div className={styles.boss} hidden ref={(el) => void (hud.current.boss = el)}>
            <span className={styles.bossName}>The Ring Warden</span>
            <span className={styles.bossTrack}>
              <span className={styles.bossFill} ref={(el) => void (hud.current.bossFill = el)} />
            </span>
          </div>
          {banner && phase === "playing" && <div className={styles.banner}>{banner}</div>}

          {phase !== "playing" && (
            <div className={styles.overlay}>
              {phase === "title" && (
                <>
                  <span className={styles.kicker}>An original arcade patrol · No. 3 in the series</span>
                  <h1 className={styles.title}>Ringfall</h1>
                  <RingBand className={styles.titleRings} />
                  <p className={styles.pitch}>
                    Hold the line from Violet Shore to the Dry Ring. Keep your guns cool, save your ring pulses for the
                    Warden.
                  </p>
                  <ChromeButton tone="ember" onClick={launch}>
                    Launch
                  </ChromeButton>
                  <span className={styles.best}>Best {pad(best.current)}</span>
                </>
              )}
              {phase === "paused" && (
                <>
                  <h1 className={styles.title}>Paused</h1>
                  <ChromeButton tone="ember" onClick={() => engine.current?.setPaused(false)}>
                    Resume
                  </ChromeButton>
                </>
              )}
              {phase === "over" && (
                <>
                  <Saucer size={72} beam dome="violet" />
                  <h1 className={styles.title}>Patrol lost</h1>
                  <p className={styles.result}>
                    Score {pad(lastScore)} · Best {pad(best.current)}
                  </p>
                  <ChromeButton tone="ember" onClick={launch}>
                    Fly again
                  </ChromeButton>
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <dl className={styles.controls}>
            <div>
              <dt>Arrows / WASD</dt>
              <dd>Fly</dd>
            </div>
            <div>
              <dt>Space / J</dt>
              <dd>Fire</dd>
            </div>
            <div>
              <dt>X / K</dt>
              <dd>Ring pulse</dd>
            </div>
            <div>
              <dt>P / Esc</dt>
              <dd>Pause</dd>
            </div>
            <div>
              <dt>Touch</dt>
              <dd>Drag to fly and fire</dd>
            </div>
          </dl>
          <ChromeButton
            className={styles.touchPulse}
            disabled={phase !== "playing"}
            onClick={() => engine.current?.input.queuePulse()}
          >
            Ring pulse
          </ChromeButton>
        </div>
      </Monolith>
    </div>
  );
}
