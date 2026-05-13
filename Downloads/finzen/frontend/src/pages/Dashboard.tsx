import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings, User, ClipboardList, X, Mail, ChevronRight, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useUsuarioStore } from "@/stores/usuario";
import { useWorkspaceStore } from "@/stores/workspace";
import { useResumenDashboard } from "@/hooks/useMovimientos";
import { usePresupuestos } from "@/hooks/usePresupuestos";
import { useCuentas } from "@/hooks/useCuentas";
import { api } from "@/lib/api";
import { EditarNombreSheet, EditarFotoSheet, EditarEmailSheet } from "@/components/PerfilSheets";
import { BalanceCard } from "@/components/BalanceCard";
import { MovimientoItem } from "@/components/MovimientoItem";
import { PresupuestoBar } from "@/components/PresupuestoBar";
import { NuevoMovimientoSheet } from "@/components/NuevoMovimientoSheet";
import { NuevaTransferenciaSheet } from "@/components/NuevaTransferenciaSheet";
import { EditarMovimientoSheet } from "@/components/EditarMovimientoSheet";
import { useArchivarMovimiento } from "@/hooks/useMovimientos";
import Decimal from "decimal.js";
import type { Movimiento } from "@/types/api";
import { showFlash } from "@/stores/flash";
import { useNavigationStore } from "@/stores/navigation";

export function Dashboard() {
  const { t } = useTranslation();
  const usuario  = useUsuarioStore((s) => s.usuario);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const navigate = useNavigationStore((s) => s.navigate);
  const { data: resumen, isLoading } = useResumenDashboard();
  const { data: presupuestos = [] }  = usePresupuestos();
  const { data: cuentas = [] }       = useCuentas();

  const [showNuevo,       setShowNuevo]       = useState(false);
  const [showTransfer,    setShowTransfer]    = useState(false);
  const [defaultTipo,     setDefaultTipo]     = useState<"ingreso" | "gasto" | undefined>();
  const [showCuentas,     setShowCuentas]     = useState(false);
  const [editando,        setEditando]        = useState<Movimiento | null>(null);
  const [showNombre,      setShowNombre]      = useState(false);
  const [showFoto,        setShowFoto]        = useState(false);
  const [showEmail,       setShowEmail]       = useState(false);

  const hoy = new Date();
  const { data: resumenMes } = useQuery<{ ingresos: string; gastos: string }>({
    queryKey: ["cierre", hoy.getFullYear(), hoy.getMonth() + 1],
    queryFn: () => api.get(`/cierre/${hoy.getFullYear()}/${hoy.getMonth() + 1}`),
    enabled: !!workspace,
  });
  const archivar = useArchivarMovimiento();

  const top3Presupuestos = [...presupuestos]
    .sort((a, b) => b.estado.porcentaje - a.estado.porcentaje)
    .slice(0, 3);

  const saludo = (() => {
    const h = new Date().getHours();
    if (h < 12) return t("dashboard.buenos_dias");
    if (h < 19) return t("dashboard.buenas_tardes");
    return t("dashboard.buenas_noches");
  })();

  const saldoStr    = resumen?.saldo_total ?? "0";
  const saldoDecimal = new Decimal(saldoStr);
  const moneda      = workspace?.moneda_base ?? "EUR";
  const [enteroRaw, decimales] = saldoDecimal.abs().toFixed(2).split(".");
  const entero  = enteroRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimal = decimales;

  function abrirNuevo(tipo?: "ingreso" | "gasto") {
    setDefaultTipo(tipo);
    setShowNuevo(true);
  }

  function abrirTransferir() {
    if (cuentas.length < 2) {
      // No hay suficientes cuentas — abrir nuevo movimiento en su lugar
      abrirNuevo();
      return;
    }
    setShowTransfer(true);
  }

  return (
    <div className="min-h-full bg-app">
      {/* Header — texto sobre el fondo gris de la app, sin tarjeta ni fondo propio */}
      <div className="px-4 pt-10 pb-5 flex items-center justify-between">
        <div>
          <p className="text-fg-subtle text-xs font-medium">{saludo}</p>
          <p className="text-fg font-bold text-xl leading-tight">
            {usuario?.nombre?.split(" ")[0] ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCuentas(true)}
            className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 transition-transform"
          >
            <User className="w-4 h-4 text-fg" />
          </button>
          <button
            onClick={() => navigate("ajustes")}
            className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 transition-transform"
          >
            <Settings className="w-4 h-4 text-fg" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="space-y-5 pb-24">
        {/* Tarjeta de saldo — negra, con márgenes laterales, sobre el fondo gris */}
        {isLoading ? (
          <div className="mx-4 bg-ink rounded-3xl p-6 h-52 animate-pulse" />
        ) : (
          <div className="mx-4">
            <BalanceCard
              saldo={`${entero ?? "0"},${decimal ?? "00"}`}
              moneda={moneda}
              onIngresar={() => abrirNuevo("ingreso")}
              onGastar={()   => abrirNuevo("gasto")}
              onTransferir={abrirTransferir}
            />
          </div>
        )}

        {/* Resumen del mes */}
        {resumenMes && (
          <div className="px-4">
            <div className="flex gap-3">
              <div className="flex-1 bg-surface rounded-2xl px-4 py-3 shadow-[var(--shadow-card)] flex items-center gap-2.5">
                <ArrowDownLeft className="w-4 h-4 text-[#5BAA1F] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-fg-muted leading-none mb-0.5">{t("dashboard.ingresos_mes")}</p>
                  <p className="text-sm font-bold text-[#5BAA1F] tabular-nums truncate">+{parseFloat(resumenMes.ingresos).toFixed(0)} {moneda}</p>
                </div>
              </div>
              <div className="flex-1 bg-surface rounded-2xl px-4 py-3 shadow-[var(--shadow-card)] flex items-center gap-2.5">
                <ArrowUpRight className="w-4 h-4 text-[#FF5C5C] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-fg-muted leading-none mb-0.5">{t("dashboard.gastos_mes")}</p>
                  <p className="text-sm font-bold text-[#FF5C5C] tabular-nums truncate">-{parseFloat(resumenMes.gastos).toFixed(0)} {moneda}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Últimos movimientos */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-fg text-base">{t("dashboard.ultimos_movimientos")}</h2>
            <button onClick={() => navigate("movimientos")} className="text-xs text-fg-muted font-medium active:opacity-60 transition-opacity">
              {t("dashboard.ver_todos")} →
            </button>
          </div>

          {isLoading ? (
            <div className="bg-surface rounded-2xl p-4 space-y-3 shadow-[var(--shadow-card)]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                  <div className="w-16 h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : resumen?.ultimos_movimientos.length === 0 ? (
            <div className="bg-surface rounded-2xl p-6 flex flex-col items-center text-center shadow-[var(--shadow-card)]">
              <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-3">
                  <ClipboardList className="w-6 h-6 text-fg-muted" />
                </div>
              <p className="font-semibold text-fg text-sm mb-1">{t("dashboard.sin_movimientos_aun")}</p>
              <p className="text-fg-muted text-xs">{t("dashboard.usa_botones")}</p>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-border-ui shadow-[var(--shadow-card)]">
              {resumen?.ultimos_movimientos.map((m) => (
                <MovimientoItem
                  key={m.id}
                  movimiento={m}
                  onEdit={(mov) => setEditando(mov)}
                  onDelete={(mov) => { archivar.mutate(mov.id); showFlash("Movimiento eliminado", "delete"); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Presupuestos */}
        {top3Presupuestos.length > 0 && (
          <div className="px-4">
            <h2 className="font-bold text-fg text-base mb-3">{t("dashboard.presupuestos")}</h2>
            <div className="space-y-3">
              {top3Presupuestos.map((p) => (
                <PresupuestoBar key={p.id} presupuesto={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sheet: perfil */}
      <AnimatePresence>
        {showCuentas && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowCuentas(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
              className="w-full max-w-md bg-surface rounded-3xl shadow-[var(--shadow-floating)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-lg text-fg">{t("dashboard.mi_perfil")}</h2>
                  <button onClick={() => setShowCuentas(false)} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                    <X className="w-4 h-4 text-fg" />
                  </button>
                </div>

                {/* Avatar + info */}
                <button
                  onClick={() => setShowFoto(true)}
                  className="w-full flex items-center gap-3 mb-5 active:opacity-70 transition-opacity"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: usuario?.foto_data ? undefined : (usuario?.avatar_color ?? "#1A1A2E") }}
                  >
                    {usuario?.foto_data
                      ? <img src={usuario.foto_data} alt="avatar" className="w-full h-full object-cover" />
                      : <span>{usuario?.avatar_emoji ?? "👤"}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-bold text-fg text-base truncate">{usuario?.nombre ?? "Usuario"}</p>
                    {usuario?.email && <p className="text-xs text-fg-muted truncate">{usuario.email}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-fg-muted flex-shrink-0" />
                </button>

                {/* Acciones */}
                <div className="space-y-2">
                  <button
                    onClick={() => setShowNombre(true)}
                    className="w-full flex items-center gap-3 bg-surface-2 rounded-xl px-4 py-3 text-sm font-medium text-fg active:bg-surface-3 transition-colors"
                  >
                    <User className="w-4 h-4 text-fg-muted" />
                    {t("ajustes.editar_nombre")}
                  </button>
                  <button
                    onClick={() => setShowEmail(true)}
                    className="w-full flex items-center gap-3 bg-surface-2 rounded-xl px-4 py-3 text-sm font-medium text-fg active:bg-surface-3 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-fg-muted" />
                    {t("ajustes.editar_email")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheets de acción */}
      <NuevoMovimientoSheet
        open={showNuevo}
        onClose={() => setShowNuevo(false)}
        defaultTipo={defaultTipo}
      />
      <NuevaTransferenciaSheet
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
      />
      <EditarMovimientoSheet
        movimiento={editando}
        onClose={() => setEditando(null)}
      />
      {usuario && (
        <>
          <EditarNombreSheet open={showNombre} onClose={() => setShowNombre(false)} usuario={usuario} />
          <EditarFotoSheet   open={showFoto}   onClose={() => setShowFoto(false)}   usuario={usuario} />
          <EditarEmailSheet  open={showEmail}  onClose={() => setShowEmail(false)}  usuario={usuario} />
        </>
      )}
    </div>
  );
}
