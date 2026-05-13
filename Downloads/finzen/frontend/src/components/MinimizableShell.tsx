import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import {
  Home, CreditCard, ClipboardList, ArrowLeftRight, BarChart3,
  Repeat, Target, Zap, Users, Handshake, Banknote,
  TrendingUp, Lightbulb, type LucideIcon,
} from "lucide-react";

const SECTION_IDS: { id: string; key: string; Icon: LucideIcon; beta?: boolean }[] = [
  { id: "dashboard",      key: "nav.dashboard",      Icon: Home },
  { id: "cuentas",        key: "nav.cuentas",        Icon: CreditCard },
  { id: "movimientos",    key: "nav.movimientos",    Icon: ClipboardList },
  { id: "transferencias", key: "nav.transferencias", Icon: ArrowLeftRight },
  { id: "presupuestos",   key: "nav.presupuestos",   Icon: BarChart3 },
  { id: "recurrentes",    key: "nav.recurrentes",    Icon: Repeat },
  { id: "objetivos",      key: "nav.objetivos",      Icon: Target },
  { id: "reglas",         key: "nav.reglas",         Icon: Zap },
  { id: "amigos",         key: "nav.amigos",         Icon: Users,       beta: true },
  { id: "grupos",         key: "nav.grupos",         Icon: Handshake,   beta: true },
  { id: "deudas",         key: "nav.deudas",         Icon: Banknote },
  { id: "inversiones",    key: "nav.inversiones",    Icon: TrendingUp },
  { id: "insights",       key: "nav.insights",       Icon: Lightbulb },
];

// ── Physics constants ────────────────────────────────────────────────────────
const ITEM_W        = 68;   // px per carousel slot
const MARGIN        = 16;   // px from screen edge when open
const DRAG_MULT     = 2.8;  // strip moves faster than finger (reach ends easily)
const FRICTION      = 0.91; // velocity multiplier per ~16ms frame
const MIN_VEL       = 0.14; // px/ms — threshold to enter snap phase
const SNAP_EASE     = 0.27; // lerp factor for snap animation
const BOUNCE_RETURN = 0.16; // velocity fraction returned on edge bounce
const RUBBER_FACTOR = 0.20; // resistance at edges during drag
const LONG_PRESS_MS = 320;
const INACTIVITY_MS = 3500;

// Active green from --color-accent-positive
const GREEN_ACTIVE = "#C7FF6B";
const GREEN_MID    = "#7DB83A";
const GREEN_DIM    = "rgba(255,255,255,0.20)";

interface Props {
  children: React.ReactNode;
  currentSection: string;
  onSectionChange: (id: string) => void;
}

export function MinimizableShell({ children, currentSection, onSectionChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const SECTIONS = SECTION_IDS.map(s => ({ ...s, label: t(s.key) }));

  const pillRef   = useRef<HTMLDivElement>(null);
  const stripRef  = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef    = useRef<number>(0);
  const longFired = useRef(false);
  const startX    = useRef(0);
  const startY    = useRef(0);
  const lastX     = useRef(0);
  const lastT     = useRef(0);
  const velRef    = useRef(0);
  const offsetRef = useRef(0);
  const selIdxRef = useRef(0);

  const currentIdx = Math.max(0, SECTIONS.findIndex(s => s.id === currentSection));
  const current    = SECTIONS[currentIdx];

  // ── Geometry ───────────────────────────────────────────────────────────────

  function pillW() { return (typeof window !== "undefined" ? window.innerWidth : 390) - 2 * MARGIN; }

  function centerOffset(idx: number) { return pillW() / 2 - idx * ITEM_W - ITEM_W / 2; }

  function getBounds() {
    const pw = pillW();
    return { min: pw / 2 - (SECTIONS.length - 1) * ITEM_W - ITEM_W / 2, max: pw / 2 - ITEM_W / 2 };
  }

  function idxFromOffset(off: number) {
    const raw = (pillW() / 2 - ITEM_W / 2 - off) / ITEM_W;
    return Math.max(0, Math.min(SECTIONS.length - 1, Math.round(raw)));
  }

  // ── DOM-direct rendering — 60fps, zero React re-renders during gesture ─────

  function applyOffset(off: number) {
    if (!stripRef.current) return;
    stripRef.current.style.transform = `translateX(${off}px)`;

    const center = pillW() / 2;
    stripRef.current.querySelectorAll<HTMLDivElement>("[data-item]").forEach((el, i) => {
      const dist = Math.abs(off + i * ITEM_W + ITEM_W / 2 - center) / ITEM_W;

      el.style.transform = `scale(${Math.max(0.55, 1.18 - dist * 0.26).toFixed(3)})`;
      el.style.opacity   = Math.max(0.10, 1 - dist * 0.46).toFixed(2);

      const iconWrap = el.querySelector<HTMLElement>("[data-icon]");
      if (iconWrap) {
        iconWrap.style.color = dist < 0.32 ? GREEN_ACTIVE : dist < 1.15 ? GREEN_MID : GREEN_DIM;
      }
    });

    selIdxRef.current = idxFromOffset(off);
  }

  function clampBounce(raw: number) {
    const { min, max } = getBounds();
    if (raw < min) return min + (raw - min) * RUBBER_FACTOR;
    if (raw > max) return max + (raw - max) * RUBBER_FACTOR;
    return raw;
  }

  // ── rAF / timers ───────────────────────────────────────────────────────────

  function cancelRaf() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
  }
  function clearInact() {
    if (inactRef.current) { clearTimeout(inactRef.current); inactRef.current = null; }
  }
  function resetInact() {
    clearInact();
    inactRef.current = setTimeout(() => snapAndClose(selIdxRef.current), INACTIVITY_MS);
  }

  function snapAndClose(idx: number) {
    clearInact(); cancelRaf();
    const target = centerOffset(idx);
    function step() {
      if (!stripRef.current) return;
      const diff = target - offsetRef.current;
      if (Math.abs(diff) < 0.3) {
        offsetRef.current = target;
        applyOffset(target);
        onSectionChange(SECTIONS[idx].id);
        setIsOpen(false);
        longFired.current = false;
        return;
      }
      offsetRef.current += diff * SNAP_EASE;
      applyOffset(offsetRef.current);
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function startMomentumThenClose() {
    cancelRaf(); clearInact();
    let vel = velRef.current; // px/ms (already multiplied by DRAG_MULT)

    function tick() {
      vel *= FRICTION;
      const raw = offsetRef.current + vel * 16;
      const { min, max } = getBounds();

      if (raw <= min) { offsetRef.current = min; vel =  Math.abs(vel) * BOUNCE_RETURN; }
      else if (raw >= max) { offsetRef.current = max; vel = -Math.abs(vel) * BOUNCE_RETURN; }
      else { offsetRef.current = raw; }

      applyOffset(offsetRef.current);

      if (Math.abs(vel) < MIN_VEL) snapAndClose(selIdxRef.current);
      else rafRef.current = requestAnimationFrame(tick);
    }

    if (Math.abs(vel) < MIN_VEL) snapAndClose(selIdxRef.current);
    else rafRef.current = requestAnimationFrame(tick);
  }

  // ── Gesture handlers ───────────────────────────────────────────────────────

  function openCarousel(clientX: number, pointerId: number) {
    const initOff = centerOffset(currentIdx);
    offsetRef.current = initOff;
    selIdxRef.current = currentIdx;
    velRef.current    = 0;
    lastX.current     = clientX;
    lastT.current     = performance.now();

    setIsOpen(true);
    navigator.vibrate?.(10);
    pillRef.current?.setPointerCapture(pointerId);
    resetInact();
    requestAnimationFrame(() => applyOffset(initOff));
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    startX.current = e.clientX;
    startY.current = e.clientY;
    lastX.current  = e.clientX;
    lastT.current  = performance.now();
    velRef.current = 0;
    longFired.current = false;
    cancelRaf();

    const pid = e.pointerId;
    timerRef.current = setTimeout(() => {
      longFired.current = true;
      openCarousel(e.clientX, pid);
    }, LONG_PRESS_MS);
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!longFired.current) {
      const d = Math.hypot(e.clientX - startX.current, e.clientY - startY.current);
      if (d > 8 && timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }

    const now = performance.now();
    const dt  = now - lastT.current;
    const dx  = e.clientX - lastX.current;

    // Multiply both offset delta and velocity by DRAG_MULT for faster traversal
    if (dt > 0) velRef.current = (dx * DRAG_MULT) / dt;
    lastX.current = e.clientX;
    lastT.current = now;

    offsetRef.current = clampBounce(offsetRef.current + dx * DRAG_MULT);
    applyOffset(offsetRef.current);
    resetInact();
  }

  function onUp(_e: React.PointerEvent<HTMLDivElement>) {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!longFired.current) return;
    startMomentumThenClose();
  }

  function onCancel() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    clearInact(); cancelRaf();
    setIsOpen(false);
    longFired.current = false;
  }

  const openWidth = typeof window !== "undefined" ? window.innerWidth - 2 * MARGIN : 358;

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <div className="hidden lg:flex h-screen overflow-hidden bg-app">
        <nav className="w-52 flex-shrink-0 bg-surface border-r border-[var(--color-border-ui)] flex flex-col py-5 overflow-y-auto">
          <div className="px-4 mb-5">
            <p className="text-fg font-bold text-xl">Finzen</p>
          </div>
          <div className="flex-1 px-2 space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => onSectionChange(s.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  currentSection === s.id ? "bg-ink text-white" : "text-fg hover:bg-surface-2"
                )}
              >
                <s.Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                <span>{s.label}</span>
                {s.beta && (
                  <span className="ml-auto text-[9px] font-bold tracking-wide bg-[#C7FF6B]/20 text-[#5BAA1F] rounded px-1.5 py-0.5">BETA</span>
                )}
              </button>
            ))}
          </div>
        </nav>
        <main className="flex-1 overflow-y-auto bg-app">
          <div className="max-w-2xl mx-auto min-h-full">{children}</div>
        </main>
      </div>

      {/* ── Mobile ──────────────────────────────────────────────────── */}
      <div className="lg:hidden relative overflow-hidden bg-app" style={{ height: "100svh" }}>
        <div className="h-full overflow-y-auto pb-16">{children}</div>

        {/* Dynamic Island pill */}
        <div
          ref={pillRef}
          className="absolute left-1/2 -translate-x-1/2 z-[35] touch-none select-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
        >
          <motion.div
            className="relative overflow-hidden"
            style={{ background: "#000" }}
            animate={{ width: isOpen ? openWidth : 140, height: isOpen ? 60 : 46, borderRadius: 99 }}
            transition={{ type: "spring", damping: 26, stiffness: 360, mass: 0.8 }}
          >
            {/* Closed — section name in green */}
            <AnimatePresence>
              {!isOpen && (
                <motion.div
                  key="closed"
                  className="absolute inset-0 flex items-center justify-center px-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <span style={{ color: GREEN_ACTIVE, fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
                    {current.label}
                    {current.beta && (
                      <span style={{ fontSize: 8, fontWeight: 700, background: "rgba(199,255,107,0.18)", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.06em" }}>
                        BETA
                      </span>
                    )}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Open — icon carousel */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  key="open"
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.08 }}
                >
                  {/* Edge fades */}
                  <div className="absolute left-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
                    style={{ background: "linear-gradient(to right, #000 30%, transparent)" }} />
                  <div className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
                    style={{ background: "linear-gradient(to left, #000 30%, transparent)" }} />

                  {/* Center indicator line */}
                  <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-px z-10 pointer-events-none"
                    style={{ background: "rgba(199,255,107,0.3)" }} />

                  {/* Strip — translated via DOM for 60fps */}
                  <div
                    ref={stripRef}
                    className="absolute top-0 left-0 flex items-center h-full will-change-transform"
                    style={{ width: SECTIONS.length * ITEM_W }}
                  >
                    {SECTIONS.map((s, i) => {
                      const dist      = Math.abs(i - currentIdx);
                      const initScale = Math.max(0.55, 1.18 - dist * 0.26);
                      const initOpac  = Math.max(0.10, 1    - dist * 0.46);
                      const initColor = dist < 0.5 ? GREEN_ACTIVE : dist < 1.5 ? GREEN_MID : GREEN_DIM;
                      return (
                        <div
                          key={s.id}
                          data-item
                          className="flex items-center justify-center flex-shrink-0"
                          style={{ width: ITEM_W, transform: `scale(${initScale})`, opacity: initOpac }}
                        >
                          <span
                            data-icon
                            style={{ color: initColor, display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <s.Icon size={20} strokeWidth={dist < 0.5 ? 2.5 : 2} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </>
  );
}
