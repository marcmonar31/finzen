export function LandscapeBlocker() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex-col items-center justify-center bg-ink text-white"
      style={{ display: "none" }}
      id="landscape-blocker"
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-5 opacity-60"
        style={{ transform: "rotate(90deg)" }}
      >
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
      <p className="font-bold text-lg mb-1">Gira el dispositivo</p>
      <p className="text-white/50 text-sm">Finzen solo funciona en vertical</p>
    </div>
  );
}
