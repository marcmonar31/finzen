import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";
import { useDeudas, useCrearDeuda, useArchivarDeuda, useCuotas } from "@/hooks/useDeudas";
import { useWorkspaceStore } from "@/stores/workspace";
import type { DeudaOut } from "@/types/api";
import { formatCurrency } from "@/lib/format";

const TIPO_EMOJI: Record<string, string> = {
  prestamo: "🏦", hipoteca: "🏠", tarjeta: "💳", personal: "🤝",
};

const TIPO_LABEL: Record<string, string> = {
  prestamo: "Préstamo", hipoteca: "Hipoteca", tarjeta: "Tarjeta", personal: "Personal",
};

// ── TablaAmortizacion ─────────────────────────────────────────────────────────

function TablaAmortizacion({ deudaId }: { deudaId: string }) {
  const { data: cuotas = [], isLoading } = useCuotas(deudaId);
  const [mostrar, setMostrar] = useState(6);

  if (isLoading) return <div className="text-xs text-ink/40 py-2 text-center">Cargando cuotas...</div>;
  if (!cuotas.length) return null;

  const hoy = new Date().toISOString().split("T")[0];
  const cuotasVista = cuotas.slice(0, mostrar);

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-ink/40 uppercase tracking-wide mb-2">
        Cuadro de amortización ({cuotas.length} cuotas)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-ink/40">
              <th className="text-left py-1">Nº</th>
              <th className="text-left py-1">Fecha</th>
              <th className="text-right py-1">Capital</th>
              <th className="text-right py-1">Intereses</th>
              <th className="text-right py-1">Cuota</th>
              <th className="text-right py-1">Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {cuotasVista.map((c) => (
              <tr
                key={c.numero}
                className={clsx(
                  "border-t border-gray-50",
                  c.fecha < hoy ? "text-ink/30" : "text-ink"
                )}
              >
                <td className="py-1">{c.numero}</td>
                <td className="py-1">{new Date(c.fecha + "T00:00:00").toLocaleDateString("es-ES", { month: "short", year: "2-digit", day: "numeric" })}</td>
                <td className="text-right py-1">{parseFloat(c.capital).toFixed(0)}€</td>
                <td className="text-right py-1 text-orange-400">{parseFloat(c.intereses).toFixed(0)}€</td>
                <td className="text-right py-1 font-semibold">{parseFloat(c.importe).toFixed(0)}€</td>
                <td className="text-right py-1 text-ink/50">{parseFloat(c.saldo_pendiente).toFixed(0)}€</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mostrar < cuotas.length && (
        <button
          onClick={() => setMostrar(cuotas.length)}
          className="text-xs text-accent-info mt-2 w-full text-center"
        >Ver todas las {cuotas.length} cuotas</button>
      )}
    </div>
  );
}

// ── DeudaCard ─────────────────────────────────────────────────────────────────

function DeudaCard({ deuda }: { deuda: DeudaOut }) {
  const archivar = useArchivarDeuda();
  const [expandida, setExpandida] = useState(false);
  const tasa = parseFloat(deuda.tasa_interes_anual);

  async function handleArchivar() {
    try { await archivar.mutateAsync(deuda.id); toast.success("Deuda eliminada"); }
    catch { toast.error("Error al eliminar"); }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{TIPO_EMOJI[deuda.tipo] ?? "💰"}</span>
          <div>
            <p className="font-semibold text-ink text-sm">{deuda.nombre}</p>
            <p className="text-xs text-ink/40">{TIPO_LABEL[deuda.tipo] ?? deuda.tipo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleArchivar} className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100">
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-ink">
            {formatCurrency(deuda.importe_total, deuda.moneda)}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {deuda.num_cuotas && (
              <span className="text-xs text-ink/50">{deuda.num_cuotas} cuotas</span>
            )}
            {tasa > 0 && (
              <span className="text-xs text-orange-500">{tasa.toFixed(2)}% TAE</span>
            )}
            <span className="text-xs text-ink/40">Día {deuda.dia_cuota} de cada mes</span>
          </div>
        </div>
        {deuda.num_cuotas && (
          <button
            onClick={() => setExpandida((v) => !v)}
            className="flex items-center gap-1 text-xs text-accent-info font-semibold"
          >
            Cuotas {expandida ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {expandida && <TablaAmortizacion deudaId={deuda.id} />}
    </div>
  );
}

// ── NuevaDeudaSheet ───────────────────────────────────────────────────────────

function NuevaDeudaSheet({ onClose }: { onClose: () => void }) {
  const crear = useCrearDeuda();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const moneda = workspace?.moneda_base ?? "EUR";
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("prestamo");
  const [importe, setImporte] = useState("");
  const [tasa, setTasa] = useState("0");
  const [numCuotas, setNumCuotas] = useState("");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split("T")[0]);
  const [diaCuota, setDiaCuota] = useState("1");

  async function handleCrear() {
    if (!nombre.trim() || !importe) { toast.error("Nombre e importe obligatorios"); return; }
    try {
      await crear.mutateAsync({
        nombre: nombre.trim(), tipo,
        importe_total: parseFloat(importe).toFixed(2),
        moneda,
        tasa_interes_anual: tasa || "0",
        num_cuotas: numCuotas ? parseInt(numCuotas) : null,
        fecha_inicio: fechaInicio,
        dia_cuota: parseInt(diaCuota) || 1,
      });
      toast.success("Deuda registrada");
      onClose();
    } catch { toast.error("Error al crear la deuda"); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-bold text-ink mb-4">Registrar deuda</h2>
        <div className="space-y-3">
          <input
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-ink focus:outline-none"
            placeholder="Nombre (ej. Hipoteca banco)" value={nombre} onChange={(e) => setNombre(e.target.value)}
          />
          <select
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-ink bg-white focus:outline-none"
            value={tipo} onChange={(e) => setTipo(e.target.value)}
          >
            <option value="prestamo">🏦 Préstamo</option>
            <option value="hipoteca">🏠 Hipoteca</option>
            <option value="tarjeta">💳 Tarjeta</option>
            <option value="personal">🤝 Personal</option>
          </select>
          <input
            type="number" inputMode="decimal" placeholder="Importe total"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-ink focus:outline-none"
            value={importe} onChange={(e) => setImporte(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink/40">Tipo interés anual (%)</label>
              <input
                type="number" inputMode="decimal" placeholder="0"
                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-ink focus:outline-none"
                value={tasa} onChange={(e) => setTasa(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-ink/40">Número de cuotas</label>
              <input
                type="number" inputMode="numeric" placeholder="Sin límite"
                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-ink focus:outline-none"
                value={numCuotas} onChange={(e) => setNumCuotas(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-ink/40">Fecha inicio</label>
              <input type="date"
                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-ink focus:outline-none"
                value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-ink/40">Día de cuota (mes)</label>
              <input
                type="number" inputMode="numeric" min="1" max="28" placeholder="1"
                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-ink focus:outline-none"
                value={diaCuota} onChange={(e) => setDiaCuota(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="flex-1 py-3 rounded-2xl bg-gray-100 text-ink font-semibold" onClick={onClose}>Cancelar</button>
          <button
            className="flex-1 py-3 rounded-2xl bg-ink text-white font-semibold disabled:opacity-50"
            onClick={handleCrear} disabled={crear.isPending}
          >{crear.isPending ? "Guardando..." : "Registrar"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Deudas ────────────────────────────────────────────────────────────────────

export function Deudas() {
  const { data: deudas = [], isLoading } = useDeudas();
  const [showNueva, setShowNueva] = useState(false);

  const activas = deudas.filter((d) => d.activa);
  const totalDeuda = activas.reduce((acc, d) => acc + parseFloat(d.importe_total), 0);

  return (
    <div className="min-h-full bg-app pb-24">
      <div className="bg-ink px-4 pt-10 pb-5 rounded-b-3xl mb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-white text-xl font-bold">Deudas</h1>
            {activas.length > 0 && (
              <p className="text-white/50 text-xs mt-0.5">
                Total: {totalDeuda.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowNueva(true)}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl px-4 py-2 text-sm font-semibold"
          >
            <Plus size={16} /> Nueva
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="text-center py-10 text-ink/40 text-sm">Cargando...</div>
        ) : activas.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">🎉</span>
            <p className="text-ink/50 text-sm mt-3">Sin deudas registradas</p>
            <p className="text-ink/30 text-xs mt-1">Si tienes préstamos o hipotecas, añádelos para ver el cuadro de amortización</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activas.map((d) => <DeudaCard key={d.id} deuda={d} />)}
          </div>
        )}
      </div>

      {showNueva && <NuevaDeudaSheet onClose={() => setShowNueva(false)} />}
    </div>
  );
}
