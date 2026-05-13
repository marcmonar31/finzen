import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Workspace } from "@/types/api";
import {
  User, Lock, Bell, Database, Scale, LifeBuoy, Info,
  ChevronRight, LogOut, Trash2, Shield, Eye, EyeOff,
  Download, Upload, ChevronLeft, ChevronRight as ChevRight,
  Palette, Globe, Calendar, DollarSign, Plus, Delete,
} from "lucide-react";
import { showFlash } from "@/stores/flash";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { useUsuarioStore } from "@/stores/usuario";
import { useActualizarUsuario } from "@/hooks/useUsuario";
import { usePinStore, hashPin } from "@/stores/pin";
import { IS_SUPABASE_ENABLED, supabase } from "@/lib/supabase";
import {
  EditarNombreSheet,
  EditarFotoSheet,
  EditarEmailSheet,
  CambiarContrasenaSheet,
} from "@/components/PerfilSheets";

// ── Primitivos UI ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider px-1 mb-1.5">
      {children}
    </p>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      {children}
    </div>
  );
}

function Row({
  icon, label, value, chevron = true, destructive = false, onClick, rightEl,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  chevron?: boolean;
  destructive?: boolean;
  onClick?: () => void;
  rightEl?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3.5 active:bg-surface-2 transition-colors text-left",
        !onClick && !rightEl && "pointer-events-none"
      )}
    >
      {icon && (
        <span className={clsx("flex-shrink-0", destructive ? "text-[#FF5C5C]" : "text-fg-muted")}>
          {icon}
        </span>
      )}
      <span className={clsx("flex-1 text-sm font-medium", destructive ? "text-[#FF5C5C]" : "text-fg")}>
        {label}
      </span>
      {rightEl ?? (
        <span className="flex items-center gap-1.5 flex-shrink-0">
          {value && <span className="text-xs text-fg-subtle">{value}</span>}
          {chevron && onClick && <ChevronRight className="w-4 h-4 text-[#C0C0C4]" />}
        </span>
      )}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-surface-2 ml-4" />;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={clsx(
        "relative w-11 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none",
        on ? "bg-ink" : "bg-[#D0D0D4] dark:bg-surface-3"
      )}
    >
      <span className={clsx(
        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
        on ? "translate-x-5" : "translate-x-0"
      )} />
    </button>
  );
}

// ── Cierre Mensual Sheet ──────────────────────────────────────────────────────

function CierreSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes,  setMes]  = useState(hoy.getMonth() + 1);

  const { data, isLoading } = useQuery({
    queryKey: ["cierre", anio, mes],
    queryFn: () => api.get<{
      ingresos: string; gastos: string; balance: string; tasa_ahorro: string;
      num_movimientos: number;
      top_categorias: { nombre: string; total: string; pct: string }[];
      vs_mes_anterior: { variacion_gastos_pct: string | null };
    }>(`/cierre/${anio}/${mes}`),
  });

  function prevMes() { if (mes === 1) { setAnio(a => a - 1); setMes(12); } else setMes(m => m - 1); }
  function nextMes() { if (mes === 12) { setAnio(a => a + 1); setMes(1); } else setMes(m => m + 1); }
  const isCurrentMonth = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1;
  const balance = data ? parseFloat(data.balance) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <div className="pt-10 px-4 pb-4 flex items-center gap-3">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface shadow-[var(--shadow-card)] flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-fg" />
        </button>
        <h1 className="font-bold text-xl text-fg">{t("ajustes.cierre_mensual")}</h1>
      </div>

      <div className="px-4 space-y-4 overflow-y-auto pb-24">
        {/* Selector mes */}
        <Card>
          <div className="flex items-center justify-between px-4 py-3.5">
            <button onClick={prevMes} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
              <ChevronLeft className="w-4 h-4 text-fg" />
            </button>
            <p className="font-semibold text-fg">{t(`meses.${mes}`)} {anio}</p>
            <button onClick={nextMes} disabled={isCurrentMonth}
              className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center disabled:opacity-30">
              <ChevRight className="w-4 h-4 text-fg" />
            </button>
          </div>
        </Card>

        {isLoading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-surface rounded-2xl h-16 animate-pulse shadow-[var(--shadow-card)]" />)}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "ingresos", label: t("ajustes.ingresos"), val: data.ingresos, color: "text-[#5BAA1F]", bg: "bg-[#F0FAE8]" },
                { key: "gastos",   label: t("ajustes.gastos"),   val: data.gastos,   color: "text-[#FF5C5C]", bg: "bg-[#FFF0F0]" },
                { key: "balance",  label: t("ajustes.balance"),  val: data.balance,  color: balance >= 0 ? "text-fg" : "text-[#FF5C5C]", bg: "bg-surface" },
              ].map(({ key, label, val, color, bg }) => (
                <div key={key} className={clsx("rounded-2xl p-3 shadow-[var(--shadow-card)] text-center", bg)}>
                  <p className="text-[10px] text-fg-muted mb-1">{label}</p>
                  <p className={clsx("font-bold text-sm tabular-nums", color)}>
                    {balance >= 0 && key === "balance" ? "+" : ""}{parseFloat(val).toFixed(0)}€
                  </p>
                </div>
              ))}
            </div>

            <Card>
              <div className="px-4 py-3.5 flex justify-between items-center">
                <span className="text-sm text-fg-muted">{t("ajustes.tasa_ahorro")}</span>
                <span className={clsx("font-bold text-sm", parseFloat(data.tasa_ahorro) >= 20 ? "text-[#5BAA1F]" : "text-fg")}>
                  {data.tasa_ahorro}%
                </span>
              </div>
              <Divider />
              <div className="px-4 py-3.5 flex justify-between items-center">
                <span className="text-sm text-fg-muted">{t("movimientos.titulo")}</span>
                <span className="font-bold text-sm text-fg">{data.num_movimientos}</span>
              </div>
              {data.vs_mes_anterior.variacion_gastos_pct && (
                <>
                  <Divider />
                  <div className="px-4 py-3.5 flex justify-between items-center">
                    <span className="text-sm text-fg-muted">{t("ajustes.gastos_vs_anterior")}</span>
                    <span className={clsx("font-bold text-sm", parseFloat(data.vs_mes_anterior.variacion_gastos_pct) <= 0 ? "text-[#5BAA1F]" : "text-[#FF5C5C]")}>
                      {parseFloat(data.vs_mes_anterior.variacion_gastos_pct) > 0 ? "+" : ""}{data.vs_mes_anterior.variacion_gastos_pct}%
                    </span>
                  </div>
                </>
              )}
            </Card>

            {data.top_categorias.length > 0 && (
              <Card>
                <div className="px-4 pt-3.5 pb-1">
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">{t("ajustes.top_categorias")}</p>
                  <div className="space-y-3 pb-3">
                    {data.top_categorias.map((c) => (
                      <div key={c.nombre}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-fg">{c.nombre}</span>
                          <span className="font-medium text-fg tabular-nums">{parseFloat(c.total).toFixed(0)}€</span>
                        </div>
                        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full bg-ink rounded-full" style={{ width: `${Math.min(parseFloat(c.pct), 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Modo Emergencia toggle ────────────────────────────────────────────────────

function ModoEmergenciaRow() {
  const { t } = useTranslation();
  const qc        = useQueryClient();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { data }  = useQuery<{ activo: boolean }>({
    queryKey:           ["modo-emergencia"],
    queryFn:            () => api.get("/modos/emergencia"),
    enabled:            !!workspace,
    staleTime:          0,          // siempre refetch al montar
    refetchOnWindowFocus: true,     // refetch al volver al tab
    refetchInterval:    30_000,     // polling cada 30s para sync entre dispositivos
  });
  const toggle = useMutation({
    mutationFn: (activo: boolean) => api.patch("/modos/emergencia", { activo }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["modo-emergencia"] }),
    onError:    () => showFlash(t("common.error"), "error" as Parameters<typeof showFlash>[1]),
  });
  const activo = data?.activo ?? false;

  return (
    <Row
      icon={<Shield className="w-4 h-4" />}
      label={t("ajustes.modo_emergencia")}
      value={activo ? t("common.activo") : t("common.desactivado")}
      chevron={false}
      rightEl={
        <Toggle
          on={activo}
          onToggle={() => toggle.mutate(!activo)}
        />
      }
    />
  );
}

// ── PIN setup sheet ───────────────────────────────────────────────────────────

const NUMPAD_ROWS = [["1","2","3"],["4","5","6"],["7","8","9"],["del","0","ok"]] as const;

function PinNumpad({ digits, onDigit }: { digits: string[]; onDigit: (k: string) => void }) {
  return (
    <div className="space-y-2 w-full max-w-xs mx-auto mt-4">
      {NUMPAD_ROWS.map((row, ri) => (
        <div key={ri} className="flex justify-between">
          {row.map((key) => {
            if (key === "del") return (
              <button key="del" onClick={() => onDigit("del")} disabled={digits.length === 0}
                className="w-[30%] h-14 rounded-2xl bg-surface-2 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30">
                <Delete className="w-5 h-5 text-fg" />
              </button>
            );
            if (key === "ok") return <div key="ok" className="w-[30%] h-14" />;
            return (
              <button key={key} onClick={() => onDigit(key)} disabled={digits.length >= 4}
                className="w-[30%] h-14 rounded-2xl bg-surface-2 text-xl font-semibold text-fg active:scale-95 transition-transform disabled:opacity-30">
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PinDots({ n }: { n: number }) {
  return (
    <div className="flex gap-4 justify-center my-6">
      {[0,1,2,3].map(i => (
        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
          i < n ? "bg-ink border-ink scale-110" : "border-[#C0C0C4]"
        }`} />
      ))}
    </div>
  );
}

function PinSetupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { pinHash, setPinHash, removePin } = usePinStore();
  // step: "menu" | "create" | "confirm" | "remove"
  const [step,    setStep]    = useState<"menu" | "create" | "confirm" | "remove">("menu");
  const [digits,  setDigits]  = useState<string[]>([]);
  const [first,   setFirst]   = useState("");
  const [shake,   setShake]   = useState(false);

  function reset() { setDigits([]); setFirst(""); setStep(pinHash ? "menu" : "create"); }

  useEffect(() => { if (open) reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDigit(key: string) {
    if (key === "del") { setDigits(d => d.slice(0, -1)); return; }
    const next = [...digits, key];
    setDigits(next);
    if (next.length < 4) return;

    if (step === "create") {
      setFirst(next.join(""));
      setDigits([]);
      setStep("confirm");
      return;
    }
    if (step === "confirm") {
      if (next.join("") === first) {
        const h = await hashPin(next.join(""));
        setPinHash(h);
        showFlash(t("ajustes.pin_configurado"));
        onClose();
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setDigits([]); }, 500);
      }
      return;
    }
    if (step === "remove") {
      const h = await hashPin(next.join(""));
      if (h === pinHash) {
        removePin();
        showFlash(t("ajustes.pin_eliminado"));
        onClose();
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setDigits([]); }, 500);
      }
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[800] bg-black/40 flex flex-col" onClick={onClose}>
          <div className="flex-1" />
          <div
            className="bg-surface rounded-t-3xl px-5 pt-5 pb-10 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-border-ui rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-fg">
                {step === "confirm" ? t("ajustes.confirma_pin") : step === "remove" ? t("ajustes.eliminar_pin") : t("ajustes.bloqueo_pin")}
              </h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-fg" />
              </button>
            </div>

            {step === "menu" && (
              <div className="space-y-2">
                <button onClick={() => { setDigits([]); setStep("create"); }}
                  className="w-full flex items-center gap-3 bg-surface-2 rounded-2xl px-4 py-3.5 text-sm font-medium text-fg active:bg-surface-3">
                  <Lock className="w-4 h-4" />
                  {t("ajustes.cambiar_pin")}
                </button>
                <button onClick={() => { setDigits([]); setStep("remove"); }}
                  className="w-full flex items-center gap-3 bg-[#FFF0F0] rounded-2xl px-4 py-3.5 text-sm font-medium text-[#FF5C5C] active:bg-[#FFE0E0]">
                  <Trash2 className="w-4 h-4" />
                  {t("ajustes.eliminar_pin")}
                </button>
              </div>
            )}

            {(step === "create" || step === "confirm" || step === "remove") && (
              <>
                <p className="text-center text-fg-muted text-sm mt-1">
                  {step === "create"  && t("ajustes.pin_intro")}
                  {step === "confirm" && t("ajustes.pin_repite")}
                  {step === "remove"  && t("ajustes.pin_actual")}
                </p>
                <div className={shake ? "animate-[shake_0.5s_ease-in-out]" : ""}>
                  <PinDots n={digits.length} />
                </div>
                <PinNumpad digits={digits} onDigit={handleDigit} />
              </>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }`}</style>
    </>
  );
}

// ── Picker genérico ───────────────────────────────────────────────────────────

function PickerSheet({ open, onClose, titulo, opciones, valor, onSelect }: {
  open: boolean; onClose: () => void; titulo: string;
  opciones: { value: string; label: string; desc?: string }[];
  valor: string; onSelect: (v: string) => void;
}) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[820] bg-black/40 flex flex-col" onClick={onClose}>
          <div className="flex-1" />
          <div className="bg-surface rounded-t-3xl px-5 pt-3 pb-10 max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border-ui rounded-full mx-auto mb-4 flex-shrink-0" />
            <h3 className="font-bold text-base text-fg mb-3 flex-shrink-0">{titulo}</h3>
            <div className="space-y-1 overflow-y-auto">
              {opciones.map(op => (
                <button key={op.value} onClick={() => { onSelect(op.value); onClose(); }}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl active:bg-surface-2 transition-colors">
                  <div className="text-left">
                    <p className={`text-sm font-medium ${valor === op.value ? "text-[#5BAA1F]" : "text-fg"}`}>{op.label}</p>
                    {op.desc && <p className="text-xs text-fg-muted">{op.desc}</p>}
                  </div>
                  {valor === op.value && <span className="text-[#5BAA1F] text-lg">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Cerrar sesión ─────────────────────────────────────────────────────────────

function useCerrarSesion() {
  const setUsuario   = useUsuarioStore((s) => s.setUsuario);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  return async function cerrarSesion() {
    if (IS_SUPABASE_ENABLED && supabase) {
      await supabase.auth.signOut();
    }
    setUsuario(null);
    setWorkspace(null);
  };
}

// ── Ajustes ───────────────────────────────────────────────────────────────────

// ── Opciones de preferencias ──────────────────────────────────────────────────


const IDIOMAS = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "uk", label: "Українська" },
];


const FORMATOS_FECHA = [
  { value: "DD/MM/YYYY", label: "DD/MM/AAAA", desc: "31/12/2024" },
  { value: "MM/DD/YYYY", label: "MM/DD/AAAA", desc: "12/31/2024" },
  { value: "YYYY-MM-DD", label: "AAAA-MM-DD", desc: "2024-12-31" },
  { value: "D MMM YYYY", label: "D MMM AAAA", desc: "31 dic 2024" },
];


export default function Ajustes() {
  const { t } = useTranslation();

  const MONEDAS = [
    { value: "EUR", label: t("monedas.EUR"), desc: "€" },
    { value: "USD", label: t("monedas.USD"), desc: "$" },
    { value: "GBP", label: t("monedas.GBP"), desc: "£" },
    { value: "CHF", label: t("monedas.CHF"), desc: "Fr" },
    { value: "JPY", label: t("monedas.JPY"), desc: "¥" },
    { value: "CAD", label: t("monedas.CAD"), desc: "CA$" },
    { value: "MXN", label: t("monedas.MXN"), desc: "MX$" },
  ];
  const DIAS_MES = Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: `${t("common.dia")} ${i + 1}`,
  }));
  const DIAS_SEMANA = [
    { value: "lunes",   label: t("ajustes.lunes") },
    { value: "domingo", label: t("ajustes.domingo") },
    { value: "sabado",  label: t("ajustes.sabado") },
  ];

  const qc          = useQueryClient();
  const workspace   = useWorkspaceStore((s) => s.workspace);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const usuario     = useUsuarioStore((s) => s.usuario);
  const discreto    = usuario?.ocultar_importes ?? false;
  const actualizarUsuario = useActualizarUsuario();
  const { pinHash } = usePinStore();
  const cerrarSesion = useCerrarSesion();

  const actualizarWorkspace = useMutation({
    mutationFn: (body: { moneda_base: string }) =>
      api.patch<Workspace>(`/workspaces/${workspace?.id}`, body),
    onSuccess: (updated) => {
      setWorkspace(updated);
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: () => showFlash(t("common.error"), "error" as Parameters<typeof showFlash>[1]),
  });

  const [showCierre,     setShowCierre]     = useState(false);
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [showNombre,     setShowNombre]     = useState(false);
  const [showFoto,       setShowFoto]       = useState(false);
  const [showEmail,      setShowEmail]      = useState(false);
  const [showPassword,   setShowPassword]   = useState(false);
  const [showPin,        setShowPin]        = useState(false);
  const [showIdioma,     setShowIdioma]     = useState(false);
  const [showMoneda,     setShowMoneda]     = useState(false);
  const [showFormato,    setShowFormato]    = useState(false);
  const [showDiaMes,     setShowDiaMes]     = useState(false);
  const [showDiaSemana,  setShowDiaSemana]  = useState(false);

  const isDark = usuario?.tema === "oscuro";
  const idiomaLabel   = IDIOMAS.find(i => i.value === (usuario?.idioma ?? "es"))?.label ?? "Español";
  const formatoLabel  = FORMATOS_FECHA.find(f => f.value === (usuario?.formato_fecha ?? "DD/MM/YYYY"))?.label ?? "DD/MM/AAAA";
  const diaMesLabel   = `${t("common.dia")} ${usuario?.primer_dia_mes ?? 1}`;
  const diaSemLabel   = DIAS_SEMANA.find(d => d.value === (usuario?.primer_dia_semana ?? "lunes"))?.label ?? t("ajustes.lunes");

  const prox = () => showFlash(t("common.proximamente"), "info" as Parameters<typeof showFlash>[1]);

  if (showCierre) return <CierreSheet onClose={() => setShowCierre(false)} />;

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header */}
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 shadow-[var(--shadow-floating)]">
          <h1 className="text-white font-bold text-2xl">{t("ajustes.titulo")}</h1>
        </div>
      </div>

      <div className="px-4 space-y-6">

        {/* ── Cuenta y perfil ── */}
        <div>
          <SectionLabel>{t("ajustes.cuenta_perfil")}</SectionLabel>
          <Card>
            {/* Avatar + info */}
            <button
              onClick={() => setShowFoto(true)}
              className="w-full flex items-center gap-3 px-4 py-4 active:bg-surface-2 transition-colors"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: usuario?.foto_data ? undefined : (usuario?.avatar_color ?? "#1A1A2E") }}
              >
                {usuario?.foto_data
                  ? <img src={usuario.foto_data} alt="avatar" className="w-full h-full object-cover" />
                  : <span>{usuario?.avatar_emoji ?? "👤"}</span>
                }
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-fg text-base truncate">{usuario?.nombre ?? "Usuario"}</p>
                {usuario?.email && (
                  <p className="text-xs text-fg-muted truncate">{usuario.email}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-[#C0C0C4] flex-shrink-0" />
            </button>
            <Divider />
            <Row icon={<User className="w-4 h-4" />}     label={t("ajustes.editar_nombre")}      onClick={() => setShowNombre(true)} />
            <Divider />
            <Row icon={<Globe className="w-4 h-4" />}    label={t("ajustes.editar_email")}       onClick={() => setShowEmail(true)} />
            <Divider />
            <Row icon={<Lock className="w-4 h-4" />}     label={t("ajustes.cambiar_contrasena")} onClick={() => setShowPassword(true)} />
            <Divider />
            <Row icon={<Download className="w-4 h-4" />} label={t("ajustes.exportar_datos")}     onClick={prox} />
          </Card>
        </div>

        {/* ── Seguridad y privacidad ── */}
        <div>
          <SectionLabel>{t("ajustes.seguridad")}</SectionLabel>
          <Card>
            <Row
              icon={<Lock className="w-4 h-4" />}
              label={t("ajustes.bloqueo_pin")}
              value={pinHash ? t("common.activado") : t("common.desactivado")}
              onClick={() => setShowPin(true)}
            />
            <Divider />
            <Row
              icon={discreto ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              label={t("ajustes.ocultar_importes")}
              value={discreto ? t("common.activado") : t("common.desactivado")}
              chevron={false}
              rightEl={
                <Toggle
                  on={discreto}
                  onToggle={() => actualizarUsuario.mutate({ ocultar_importes: !discreto })}
                />
              }
            />
            <Divider />
            <ModoEmergenciaRow />
          </Card>
        </div>

        {/* ── Preferencias ── */}
        <div>
          <SectionLabel>{t("ajustes.preferencias")}</SectionLabel>
          <Card>
            <Row
              icon={<Palette className="w-4 h-4" />}
              label={t("ajustes.tema_oscuro")}
              value={isDark ? t("common.activado") : t("common.desactivado")}
              chevron={false}
              rightEl={
                <Toggle
                  on={isDark}
                  onToggle={() => actualizarUsuario.mutate({ tema: isDark ? "claro" : "oscuro" })}
                />
              }
            />
            <Divider />
            <Row icon={<Globe className="w-4 h-4" />}      label={t("ajustes.idioma")}                value={idiomaLabel}                     onClick={() => setShowIdioma(true)} />
            <Divider />
            <Row icon={<DollarSign className="w-4 h-4" />} label={t("ajustes.moneda_principal")}      value={workspace?.moneda_base ?? "EUR"} onClick={() => setShowMoneda(true)} />
            <Divider />
            <Row icon={<Calendar className="w-4 h-4" />}   label={t("ajustes.formato_fecha")}         value={formatoLabel}                    onClick={() => setShowFormato(true)} />
            <Divider />
            <Row icon={<Calendar className="w-4 h-4" />}   label={t("ajustes.primer_dia_mes")}        value={diaMesLabel}                     onClick={() => setShowDiaMes(true)} />
            <Divider />
            <Row icon={<Calendar className="w-4 h-4" />}   label={t("ajustes.primer_dia_semana")}     value={diaSemLabel}                     onClick={() => setShowDiaSemana(true)} />
          </Card>
        </div>

        {/* ── Notificaciones ── */}
        <div>
          <SectionLabel>{t("ajustes.notificaciones")}</SectionLabel>
          <Card>
            <Row icon={<Bell className="w-4 h-4" />} label={t("ajustes.recordatorio_diario")} onClick={prox} />
            <Divider />
            <Row icon={<Bell className="w-4 h-4" />} label={t("ajustes.pagos_recurrentes")}   onClick={prox} />
            <Divider />
            <Row icon={<Bell className="w-4 h-4" />} label={t("ajustes.resumen_semanal")}     onClick={prox} />
            <Divider />
            <Row icon={<Bell className="w-4 h-4" />} label={t("ajustes.resumen_mensual")}     onClick={prox} />
            <Divider />
            <Row icon={<Bell className="w-4 h-4" />} label={t("ajustes.novedades_app")}       onClick={prox} />
          </Card>
        </div>

        {/* ── Datos ── */}
        <div>
          <SectionLabel>{t("ajustes.datos")}</SectionLabel>
          <Card>
            <Row icon={<Database className="w-4 h-4" />} label={t("ajustes.cierre_mensual")}   onClick={() => setShowCierre(true)} />
            <Divider />
            <Row icon={<Download className="w-4 h-4" />} label={t("ajustes.exportar")}         onClick={prox} />
            <Divider />
            <Row icon={<Upload className="w-4 h-4" />}   label={t("ajustes.importar_csv")}     onClick={prox} />
            <Divider />
            <Row icon={<Database className="w-4 h-4" />} label={t("ajustes.copia_seguridad")}  onClick={prox} />
            <Divider />
            <Row icon={<Trash2 className="w-4 h-4" />}   label={t("ajustes.borrar_datos")} destructive onClick={prox} />
          </Card>
        </div>

        {/* ── Legal ── */}
        <div>
          <SectionLabel>{t("ajustes.legal")}</SectionLabel>
          <Card>
            <Row icon={<Scale className="w-4 h-4" />} label={t("ajustes.terminos")}                onClick={prox} />
            <Divider />
            <Row icon={<Scale className="w-4 h-4" />} label={t("ajustes.politica_privacidad")}     onClick={prox} />
            <Divider />
            <Row icon={<Scale className="w-4 h-4" />} label={t("ajustes.gestionar_consentimientos")} onClick={prox} />
            <Divider />
            <Row icon={<Info className="w-4 h-4" />}  label={t("ajustes.licencias")}               onClick={prox} />
          </Card>
        </div>

        {/* ── Soporte ── */}
        <div>
          <SectionLabel>{t("ajustes.soporte")}</SectionLabel>
          <Card>
            <Row icon={<LifeBuoy className="w-4 h-4" />} label={t("ajustes.centro_ayuda")} onClick={prox} />
            <Divider />
            <Row icon={<LifeBuoy className="w-4 h-4" />} label={t("ajustes.contactar")}    onClick={prox} />
            <Divider />
            <Row icon={<LifeBuoy className="w-4 h-4" />} label={t("ajustes.reportar_bug")} onClick={prox} />
            <Divider />
            <Row icon={<Plus className="w-4 h-4 rotate-45" />} label={t("ajustes.valorar_app")} onClick={prox} />
          </Card>
        </div>

        {/* ── Sobre ── */}
        <div>
          <SectionLabel>{t("ajustes.sobre_app")}</SectionLabel>
          <Card>
            <Row label={t("ajustes.version")} value="1.0.0 (build 1)" chevron={false} />
            <Divider />
            <Row label={t("ajustes.novedades")} onClick={prox} />
          </Card>
        </div>

        {/* ── Cerrar sesión ── */}
        <Card>
          <Row
            icon={<LogOut className="w-4 h-4" />}
            label={t("ajustes.cerrar_sesion")}
            destructive
            onClick={() => setShowConfirm(true)}
          />
        </Card>

        {/* ── Eliminar cuenta ── */}
        <Card>
          <Row
            icon={<Trash2 className="w-4 h-4" />}
            label={t("ajustes.eliminar_cuenta")}
            destructive
            onClick={prox}
          />
        </Card>

      </div>

      {/* Perfil sheets */}
      {usuario && (
        <>
          <EditarNombreSheet   open={showNombre}   onClose={() => setShowNombre(false)}   usuario={usuario} />
          <EditarFotoSheet     open={showFoto}     onClose={() => setShowFoto(false)}     usuario={usuario} />
          <EditarEmailSheet    open={showEmail}    onClose={() => setShowEmail(false)}    usuario={usuario} />
          <CambiarContrasenaSheet open={showPassword} onClose={() => setShowPassword(false)} />
        </>
      )}

      <PinSetupSheet open={showPin} onClose={() => setShowPin(false)} />

      <PickerSheet
        open={showIdioma} onClose={() => setShowIdioma(false)}
        titulo={t("ajustes.idioma")} opciones={IDIOMAS} valor={usuario?.idioma ?? "es"}
        onSelect={(v) => actualizarUsuario.mutate({ idioma: v as "es" | "en" | "uk" })}
      />
      <PickerSheet
        open={showMoneda} onClose={() => setShowMoneda(false)}
        titulo={t("ajustes.moneda_principal")} opciones={MONEDAS} valor={workspace?.moneda_base ?? "EUR"}
        onSelect={(v) => actualizarWorkspace.mutate({ moneda_base: v })}
      />
      <PickerSheet
        open={showFormato} onClose={() => setShowFormato(false)}
        titulo={t("ajustes.formato_fecha")} opciones={FORMATOS_FECHA} valor={usuario?.formato_fecha ?? "DD/MM/YYYY"}
        onSelect={(v) => actualizarUsuario.mutate({ formato_fecha: v })}
      />
      <PickerSheet
        open={showDiaMes} onClose={() => setShowDiaMes(false)}
        titulo={t("ajustes.primer_dia_mes")} opciones={DIAS_MES} valor={String(usuario?.primer_dia_mes ?? 1)}
        onSelect={(v) => actualizarUsuario.mutate({ primer_dia_mes: Number(v) })}
      />
      <PickerSheet
        open={showDiaSemana} onClose={() => setShowDiaSemana(false)}
        titulo={t("ajustes.primer_dia_semana")} opciones={DIAS_SEMANA} valor={usuario?.primer_dia_semana ?? "lunes"}
        onSelect={(v) => actualizarUsuario.mutate({ primer_dia_semana: v })}
      />

      {/* Confirm logout sheet */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setShowConfirm(false)}>
          <div className="w-full bg-surface rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border-ui rounded-full mx-auto mb-5" />
            <p className="font-bold text-fg text-base text-center mb-1">{t("ajustes.cerrar_sesion_confirmar")}</p>
            <p className="text-fg-muted text-sm text-center mb-6">{t("ajustes.cerrar_sesion_desc")}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm active:scale-95 transition-transform">
                {t("common.cancelar")}
              </button>
              <button onClick={cerrarSesion} className="flex-1 py-3.5 rounded-2xl bg-[#FF5C5C] text-white font-semibold text-sm active:scale-95 transition-transform">
                {t("ajustes.cerrar_sesion")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
