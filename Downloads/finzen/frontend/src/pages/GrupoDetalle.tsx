import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useGrupo, useGastosGrupo, useBalanceGrupo, useCrearGasto, useRegistrarLiquidacion, useConfirmarLiquidacion, useLiquidacionesGrupo } from "@/hooks/useGrupos";
import { useUsuarioStore } from "@/stores/usuario";
import { formatCurrency, formatDate } from "@/lib/format";
import { clsx } from "clsx";
import { showFlash } from "@/stores/flash";
import Decimal from "decimal.js";

interface Props {
  grupoId: string;
  onBack: () => void;
}

export function GrupoDetalle({ grupoId, onBack }: Props) {
  const { data: grupo } = useGrupo(grupoId);
  const { data: gastos = [] } = useGastosGrupo(grupoId);
  const { data: balanceData } = useBalanceGrupo(grupoId);
  const { data: liquidaciones = [] } = useLiquidacionesGrupo(grupoId);
  const usuario = useUsuarioStore((s) => s.usuario);
  const crearGasto = useCrearGasto();
  const registrarLiq = useRegistrarLiquidacion();
  const confirmarLiq = useConfirmarLiquidacion();

  const [showNuevoGasto, setShowNuevoGasto] = useState(false);
  const [showSaldar, setShowSaldar] = useState(false);

  // Form gasto
  const [concepto, setConcepto] = useState("");
  const [importe, setImporte] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [pagadorId, setPagadorId] = useState("");

  if (!grupo) return <div className="p-4 text-center text-fg-muted">Cargando…</div>;

  const miActivoId = grupo.miembros.find((m) => m.usuario_id === usuario?.id)?.id;
  const moneda = grupo.moneda_principal;

  // Mi balance
  const miBalance = miActivoId && balanceData?.balance
    ? new Decimal(balanceData.balance[miActivoId] ?? "0")
    : new Decimal("0");

  const miembroNombre = (mid: string) =>
    grupo.miembros.find((m) => m.id === mid)?.nombre_display ?? "?";

  async function handleCrearGasto() {
    if (!concepto || !importe || !pagadorId || !grupo) return;
    const todosIds = grupo.miembros.filter((m) => m.activo).map((m) => m.id);
    try {
      await crearGasto.mutateAsync({
        grupo_id: grupoId,
        concepto,
        importe,
        moneda,
        fecha,
        pagador_id: pagadorId,
        modo_reparto: "igualitario",
        miembro_ids: todosIds,
      });
      showFlash("Gasto añadido");
      setConcepto("");
      setImporte("");
      setPagadorId("");
      setShowNuevoGasto(false);
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : "Error", "error");
    }
  }

  async function handleConfirmarLiq(liq_id: string) {
    try {
      await confirmarLiq.mutateAsync({ grupo_id: grupoId, liq_id });
      showFlash("Liquidación confirmada");
    } catch { showFlash("Error", "error"); }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      <div className="bg-ink px-4 pt-10 pb-6 rounded-b-3xl">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Grupos</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{grupo.emoji}</span>
          <div>
            <h1 className="text-white font-bold text-xl">{grupo.nombre}</h1>
            <p className="text-white/60 text-xs">
              {grupo.miembros.filter((m) => m.activo).length} miembros · {grupo.es_cuenta_real ? "Cuenta real" : "Solo gastos"}
            </p>
          </div>
        </div>

        {/* Mi balance */}
        <div className="mt-4 bg-white/10 rounded-2xl px-4 py-3">
          <p className="text-white/60 text-xs mb-1">Tu balance</p>
          <p className={clsx(
            "text-2xl font-bold",
            miBalance.gt(0) ? "text-[#5BAA1F]" : miBalance.lt(0) ? "text-red-400" : "text-white"
          )}>
            {miBalance.gte(0) ? "+" : ""}{formatCurrency(miBalance.abs().toFixed(4), moneda)}
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowNuevoGasto(true)}
            className="flex-1 bg-ink text-white rounded-2xl py-3 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Añadir gasto
          </button>
          <button
            onClick={() => setShowSaldar(true)}
            className="flex-1 bg-surface text-fg rounded-2xl py-3 font-semibold text-sm shadow-[var(--shadow-card)]"
          >
            Saldar deudas
          </button>
        </div>

        {/* Miembros */}
        <div>
          <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Miembros</p>
          <div className="bg-surface rounded-2xl divide-y divide-border-ui shadow-[var(--shadow-card)]">
            {grupo.miembros.filter((m) => m.activo).map((m) => {
              const bal = balanceData?.balance ? new Decimal(balanceData.balance[m.id] ?? "0") : new Decimal("0");
              return (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <p className="font-semibold text-fg text-sm">{m.nombre_display}</p>
                  <p className={clsx(
                    "text-sm font-bold tabular-nums",
                    bal.gt(0) ? "text-[#5BAA1F]" : bal.lt(0) ? "text-red-500" : "text-fg-muted"
                  )}>
                    {bal.gte(0) ? "+" : ""}{formatCurrency(bal.abs().toFixed(4), moneda)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historial de gastos */}
        {gastos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Historial</p>
            <div className="bg-surface rounded-2xl divide-y divide-border-ui shadow-[var(--shadow-card)]">
              {gastos.map((g) => (
                <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-xl flex-shrink-0">🧾</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg text-sm truncate">{g.concepto}</p>
                    <p className="text-xs text-fg-muted">
                      Pagó {miembroNombre(g.pagador_id)} · {formatDate(g.fecha)}
                    </p>
                  </div>
                  <p className="font-bold text-sm tabular-nums text-fg">
                    {formatCurrency(g.importe, g.moneda)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liquidaciones pendientes */}
        {liquidaciones.filter((l) => l.estado === "pendiente").length > 0 && (
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Liquidaciones pendientes</p>
            <div className="bg-surface rounded-2xl divide-y divide-border-ui shadow-[var(--shadow-card)]">
              {liquidaciones.filter((l) => l.estado === "pendiente").map((l) => (
                <div key={l.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-fg">
                      {miembroNombre(l.de_miembro_id)} → {miembroNombre(l.a_miembro_id)}
                    </p>
                    <p className="text-xs text-fg-muted">{formatCurrency(l.importe, l.moneda)}</p>
                  </div>
                  {l.a_miembro_id === miActivoId && (
                    <button
                      onClick={() => handleConfirmarLiq(l.id)}
                      className="bg-ink text-white text-xs px-3 py-1.5 rounded-full font-semibold"
                    >
                      Confirmar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sheet nuevo gasto */}
      {showNuevoGasto && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNuevoGasto(false)} />
          <div className="relative bg-surface rounded-t-3xl p-5 space-y-4">
            <h2 className="font-bold text-lg text-fg">Nuevo gasto</h2>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Concepto"
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
            />
            <input
              type="number"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              className="w-full text-center text-3xl font-bold text-fg bg-transparent border-b-2 border-[#E8E8EA] pb-2 focus:outline-none"
            />
            <div>
              <p className="text-xs text-fg-muted mb-2 font-medium">¿Quién pagó?</p>
              <div className="space-y-1">
                {grupo.miembros.filter((m) => m.activo).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPagadorId(m.id)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                      pagadorId === m.id ? "bg-ink text-white" : "bg-surface-2 text-fg"
                    )}
                  >
                    <span className="font-semibold text-sm">{m.nombre_display}</span>
                  </button>
                ))}
              </div>
            </div>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
            />
            <button
              onClick={handleCrearGasto}
              disabled={!concepto || !importe || !pagadorId || crearGasto.isPending}
              className="w-full bg-ink text-white rounded-2xl py-4 font-semibold disabled:opacity-60"
            >
              {crearGasto.isPending ? "Añadiendo…" : "Añadir gasto"}
            </button>
          </div>
        </div>
      )}

      {/* Sheet saldar deudas */}
      {showSaldar && balanceData && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSaldar(false)} />
          <div className="relative bg-surface rounded-t-3xl p-5 space-y-4">
            <h2 className="font-bold text-lg text-fg">Saldar deudas</h2>
            <p className="text-sm text-fg-muted">Para que todos queden a 0:</p>
            {balanceData.transferencias_optimas.length === 0 ? (
              <p className="text-center text-[#5BAA1F] font-semibold py-4">¡Todos a cero! Sin deudas.</p>
            ) : (
              <div className="space-y-3">
                {balanceData.transferencias_optimas.map((t, i) => (
                  <div key={i} className="bg-surface-2 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-fg">
                      {miembroNombre(t.de)} → {miembroNombre(t.a)}
                    </p>
                    <p className="font-bold text-fg tabular-nums">
                      {formatCurrency(new Decimal(t.importe.toString()).toFixed(4), moneda)}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-fg-muted text-center">
                  Cuando se realice la transferencia real, usa "Registrar liquidación" para actualizar el balance.
                </p>
                <button
                  onClick={async () => {
                    const primera = balanceData.transferencias_optimas[0];
                    try {
                      await registrarLiq.mutateAsync({
                        grupo_id: grupoId,
                        de_miembro_id: primera.de as string,
                        a_miembro_id: primera.a as string,
                        importe: primera.importe.toString(),
                        moneda,
                      });
                      showFlash("Liquidación registrada (pendiente de confirmar)");
                      setShowSaldar(false);
                    } catch { showFlash("Error", "error"); }
                  }}
                  className="w-full bg-ink text-white rounded-2xl py-3 font-semibold text-sm"
                >
                  Registrar primera liquidación
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
