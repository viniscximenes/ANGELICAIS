"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import styles from "./hold-button.module.css";

const LINEAR = (t: number) => t;
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

type Phase = "idle" | "holding" | "done";
type InputKind = "pointer" | "key" | null;

interface HoldButtonProps {
  children: ReactNode;
  doneLabel?: ReactNode;
  icon?: ReactNode;
  doneIcon?: ReactNode;
  backgroundColor?: string;
  fillColor?: string;
  textColor?: string;
  fillTextColor?: string;
  holdTime?: number;
  releaseTime?: number;
  pressScale?: number;
  waveAmplitude?: number;
  resetAfter?: number;
  expandedWidth?: number;
  disabled?: boolean;
  onHold?: () => void;
  className?: string;
  ariaLabel?: string;
}

type HoldButtonStyle = CSSProperties & Record<`--hb-${string}`, string | number>;

/**
 * Adaptação TypeScript do Hold Button do React Bits.
 * Fonte: https://reactbits.dev/micro/hold-button
 *
 * Mantém o gesto por pointer/teclado, o preenchimento progressivo e o
 * cancelamento ao sair da área. A única adaptação visual é a largura:
 * começa como botão de ícone e expande enquanto o usuário segura.
 */
export const HoldButton = forwardRef<HTMLButtonElement, HoldButtonProps>(function HoldButton(
  {
    children,
    doneLabel = "Concluído",
    icon,
    doneIcon,
    backgroundColor = "transparent",
    fillColor = "var(--foreground)",
    textColor = "var(--muted-foreground)",
    fillTextColor = "var(--background)",
    holdTime = 1600,
    releaseTime = 200,
    pressScale = 0.98,
    waveAmplitude = 4,
    resetAfter = 1200,
    expandedWidth = 116,
    disabled = false,
    onHold,
    className,
    ariaLabel = "Segure para confirmar",
  },
  forwardedRef,
) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [input, setInput] = useState<InputKind>(null);
  const phaseRef = useRef<Phase>("idle");
  const inputRef = useRef<InputKind>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef({ pointerId: null as number | null, start: 0 });
  const timers = useRef({ complete: 0, reset: 0 });
  const hintId = useId();

  useImperativeHandle(forwardedRef, () => buttonRef.current as HTMLButtonElement, []);

  const go = (next: Phase, kind: InputKind = null) => {
    phaseRef.current = next;
    inputRef.current = kind;
    setPhase(next);
    setInput(kind);
  };

  const clearTimers = () => {
    window.clearTimeout(timers.current.complete);
    window.clearTimeout(timers.current.reset);
  };

  const motion = useRef({ raf: 0, p: 0, from: 0, to: 0, start: 0 });

  const completeRef = useRef<() => void>(() => undefined);

  const drive = (to: number, duration: number, ease: (t: number) => number) => {
    const currentMotion = motion.current;
    cancelAnimationFrame(currentMotion.raf);
    currentMotion.from = currentMotion.p;
    currentMotion.to = to;
    currentMotion.start = performance.now();

    const step = (now: number) => {
      const t = duration > 0 ? Math.min(1, (now - currentMotion.start) / duration) : 1;
      currentMotion.p = currentMotion.from + (currentMotion.to - currentMotion.from) * ease(t);
      buttonRef.current?.style.setProperty("--hb-p", currentMotion.p.toFixed(4));
      if (t < 1) {
        currentMotion.raf = requestAnimationFrame(step);
        return;
      }
      currentMotion.raf = 0;
      if (currentMotion.to === 1) completeRef.current();
    };

    currentMotion.raf = requestAnimationFrame(step);
  };

  const complete = () => {
    if (phaseRef.current !== "holding") return;
    if (performance.now() - gesture.current.start < holdTime - 50) return;
    clearTimers();
    go("done", inputRef.current);
    onHold?.();
    if (resetAfter > 0) {
      timers.current.reset = window.setTimeout(() => {
        go("idle");
        drive(0, releaseTime, EASE_OUT);
      }, resetAfter);
    }
  };
  completeRef.current = complete;

  const begin = (kind: Exclude<InputKind, null>) => {
    if (disabled || phaseRef.current !== "idle") return false;
    const button = buttonRef.current;
    if (!button) return false;
    gesture.current.start = performance.now();
    go("holding", kind);
    drive(1, holdTime, LINEAR);
    timers.current.complete = window.setTimeout(() => completeRef.current(), holdTime + 100);
    return true;
  };

  const release = () => {
    if (phaseRef.current !== "holding") return;
    clearTimers();
    go("idle");
    drive(0, releaseTime, EASE_OUT);
  };
  const releaseRef = useRef(release);
  releaseRef.current = release;

  const endPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerId !== gesture.current.pointerId) return;
    gesture.current.pointerId = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {}
    release();
  };

  const labels = (
    <>
      <span className={styles.idle} aria-hidden={phase === "done"}>
        {icon ? <span className={styles.icon}>{icon}</span> : null}
        <span className={styles.text}>{children}</span>
      </span>
      <span className={styles.done} aria-hidden={phase !== "done"}>
        {doneIcon ? <span className={styles.icon}>{doneIcon}</span> : null}
        <span className={styles.text}>{doneLabel}</span>
      </span>
    </>
  );

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const measure = () => {
      button.style.setProperty("--hb-w", `${button.offsetWidth}px`);
      button.style.setProperty("--hb-h", `${button.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== "holding") return;
    const cancel = () => releaseRef.current();
    const handleVisibility = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [phase]);

  useEffect(() => {
    const currentTimers = timers.current;
    const currentMotion = motion.current;
    return () => {
      window.clearTimeout(currentTimers.complete);
      window.clearTimeout(currentTimers.reset);
      cancelAnimationFrame(currentMotion.raf);
    };
  }, []);

  const buttonStyle: HoldButtonStyle = {
    "--hb-bg": backgroundColor,
    "--hb-fill": fillColor,
    "--hb-text": textColor,
    "--hb-fill-text": fillTextColor,
    "--hb-hold": `${holdTime}ms`,
    "--hb-release": `${releaseTime}ms`,
    "--hb-press": pressScale,
    "--hb-wave": `${waveAmplitude}px`,
    "--hb-cycles": holdTime / 1100,
    "--hb-expanded-width": `${expandedWidth}px`,
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      className={cn(styles.button, className)}
      data-phase={phase}
      data-input={input ?? undefined}
      aria-label={ariaLabel}
      aria-describedby={hintId}
      style={buttonStyle}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary || gesture.current.pointerId !== null) return;
        if (!begin("pointer")) return;
        gesture.current.pointerId = event.pointerId;
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {}
      }}
      onPointerUp={(event) => endPointer(event)}
      onPointerCancel={(event) => endPointer(event)}
      onLostPointerCapture={(event) => endPointer(event)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (inputRef.current === "key") release();
          return;
        }
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          if (!event.repeat) begin("key");
        }
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          if (inputRef.current === "key") release();
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className={styles.pulse} aria-hidden="true" />
      <span className={styles.label}>{labels}</span>
      <span className={styles.clip} aria-hidden="true">
        <span className={styles.fill}>
          <span className={cn(styles.label, styles.fillLabel)}>{labels}</span>
        </span>
        <span className={styles.crest} aria-hidden="true">
          <span className={cn(styles.label, styles.fillLabel)}>{labels}</span>
        </span>
      </span>
      <span id={hintId} className={styles.srOnly}>
        Segure por {Math.round(holdTime / 100) / 10} segundos para confirmar.
      </span>
    </button>
  );
});
