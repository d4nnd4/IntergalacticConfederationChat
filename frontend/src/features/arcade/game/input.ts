const GAME_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "KeyJ",
  "KeyX",
  "KeyK",
  "KeyP",
  "Escape",
]);

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export class Input {
  readonly pointer = { active: false, x: 0, y: 0 };
  private readonly keys = new Set<string>();
  private pulseQueued = false;
  private pauseQueued = false;

  attach(surface: HTMLCanvasElement, width: number, height: number): () => void {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!GAME_KEYS.has(event.code) || isTyping(event.target)) {
        return;
      }
      event.preventDefault();
      if (!event.repeat) {
        if (event.code === "KeyX" || event.code === "KeyK") {
          this.pulseQueued = true;
        }
        if (event.code === "KeyP" || event.code === "Escape") {
          this.pauseQueued = true;
        }
      }
      this.keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => this.keys.delete(event.code);
    const onBlur = () => this.keys.clear();
    const toLogical = (event: PointerEvent) => {
      const rect = surface.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * width;
      this.pointer.y = ((event.clientY - rect.top) / rect.height) * height;
    };
    const onPointerDown = (event: PointerEvent) => {
      surface.setPointerCapture(event.pointerId);
      this.pointer.active = true;
      toLogical(event);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (this.pointer.active) {
        toLogical(event);
      }
    };
    const onPointerUp = () => {
      this.pointer.active = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    surface.addEventListener("pointerdown", onPointerDown);
    surface.addEventListener("pointermove", onPointerMove);
    surface.addEventListener("pointerup", onPointerUp);
    surface.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", onPointerUp);
      surface.removeEventListener("pointercancel", onPointerUp);
    };
  }

  get axisX(): number {
    return (this.held("ArrowRight", "KeyD") ? 1 : 0) - (this.held("ArrowLeft", "KeyA") ? 1 : 0);
  }

  get axisY(): number {
    return (this.held("ArrowDown", "KeyS") ? 1 : 0) - (this.held("ArrowUp", "KeyW") ? 1 : 0);
  }

  get firing(): boolean {
    return this.pointer.active || this.held("Space", "KeyJ");
  }

  queuePulse(): void {
    this.pulseQueued = true;
  }

  consumePulse(): boolean {
    const queued = this.pulseQueued;
    this.pulseQueued = false;
    return queued;
  }

  consumePause(): boolean {
    const queued = this.pauseQueued;
    this.pauseQueued = false;
    return queued;
  }

  reset(): void {
    this.keys.clear();
    this.pulseQueued = false;
    this.pauseQueued = false;
    this.pointer.active = false;
  }

  private held(...codes: string[]): boolean {
    return codes.some((code) => this.keys.has(code));
  }
}
