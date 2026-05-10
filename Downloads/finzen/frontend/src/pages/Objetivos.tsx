import { useState } from "react";
import { Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";
import { useObjetivos, useCrearObjetivo, useArchivarObjetivo, useAportar } from "@/hooks/useObjetivos";
import { useWorkspaceStore } from "@/stores/workspace";
import type { ObjetivoOut } from "@/types/api";
import { formatCurrency } from "@/lib/format";

// ── AportarSheet ──────────────────────────────────────────────────────────────

function AportarSheet({ objetivo, onClose }: { objetivo: ObjetivoOut; onClose: () => void }) {
  const aportar = useAportar(objetivo.id);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const moneda = workspace?.moneda_base ?? "EUR";
  const [importe, setImporte] = useState("");
  const [concepto, setConcepto] = useState("");

  async function handleAportar() {
    const imp = parseFloat(importe);
    if (!imp || imp <= 0) { toast.error("Introduce un importe válido"); return; }
    try {
      await aportar.mutateAsync({
        importe: imp.toFixed(2),
        moneda,
        fecha: new Date().toISOString().split("T")[0],
        concepto: concepto.trim() || undefined,
      });
      toast.success("Aportación registrada");
      onClose();
    } catch {
      toast.error("Error al registrar la aportación");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-bold text-ink mb-1">Aportar a {objetivo.emoji} {objetivo.nombre}</h2>
        <p className="text-xs text-ink/40 mb-5">Falta {formatCurrency(objetivo.falta, objetivo.moneda)}</p>
        <div className="space-y-3">
          <input
            type="number" inputMode="decimal" placeholder="0.00"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-2xl font-bold text-ink text-center focus:outline-none focus:ring-2 focus:ring-accent"
            value={importe} onChange={(e) => setImporte(e.target.value)}
          />
          <input
            placeholder="Concepto (opcional)"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-ink focus:outline-none"
            value={concepto} onChange={(e) => setConcepto(e.target.value)}
          />
        </div>
        <div className="flex gap-3 mt-5">
          <button className="flex-1 py-3 rounded-2xl bg-gray-100 text-ink font-semibold" onClick={onClose}>Cancelar</button>
          <button
            className="flex-1 py-3 rounded-2xl bg-ink text-white font-semibold disabled:opacity-50"
            onClick={handleAportar} disabled={aportar.isPending}
          >{aportar.isPending ? "Guardando..." : "Aportar"}</button>
        </div>
      </div>
    </div>
  );
}

// ── NuevoObjetivoSheet ────────────────────────────────────────────────────────

function NuevoObjetivoSheet({ onClose }: { onClose: () => void }) {
  const crear = useCrearObjetivo();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const moneda = workspace?.moneda_base ?? "EUR";
  const [nombre, setNombre] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [importe, setImporte] = useState("");
  const [fecha, setFecha] = useState("");

  async function handleCrear() {
    if (!nombre.trim() || !importe) { toast.error("Nombre e importe obligatorios"); return; }
    try {
      await crear.mutateAsync({
        nombre: nombre.trim(), emoji,
        importe_objetivo: parseFloat(importe).toFixed(2),
        moneda,
        fecha_objetivo: fecha || null,
      });
      toast.success("Objetivo creado");
      onClose();
    } catch { toast.error("Error al crear el objetivo"); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-bold text-ink mb-4">Nuevo objetivo</h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              className="w-14 text-2xl text-center border border-gray-200 rounded-xl focus:outline-none"
              value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2}
            />
            <input
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-ink focus:outline-none"
              placeholder="Nombre del objetivo" value={nombre} onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <input
            type="number" inputMode="decimal" placeholder="Importe objetivo"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-ink focus:outline-none"
            value={importe} onChange={(e) => setImporte(e.target.value)}
          />
          <div>
            <label className="text-xs text-ink/40 uppercase tracking-wide">Fecha límite (opcional)</label>
            <input type="date"
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-ink focus:outline-none"
              value={fecha} onChange={(e) => setFecha(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="flex-1 py-3 rounded-2xl bg-gray-100 text-ink font-semibold" onClick={onClose}>Cancelar</button>
          <button
            className="flex-1 py-3 rounded-2xl bg-ink text-white font-semibold disabled:opacity-50"
            onClick={handleCrear} disabled={crear.isPending}
          >{crear.isPending ? "Creando..." : "Crear"}</button>
        </div>
      </div>
    </div>
  );
}

// ── ObjetivoCard ──────────────────────────────────────────────────────────────

function ObjetivoCard({
  objetivo, onAportar,
}: { objetivo: ObjetivoOut; onAportar: (o: ObjetivoOut) => void }) {
  const archivar = useArchivarObjetivo();
  const pct = objetivo.porcentaje;
  const color = pct >= 100 ? "bg-green-400" : pct >= 60 ? "bg-accent-positive" : "bg-accent-info";

  async function handleArchivar() {
    try { await archivar.mutateAsync(objetivo.id); toast.success("Objetivo eliminado"); }
    catch { toast.error("Error al eliminar"); }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{objetivo.emoji}</span>
          <div>
            <p className="font-semibold text-ink text-sm">{objetivo.nombre}</p>
            {objetivo.fecha_objetivo && (
              <p className="text-xs text-ink/40">
                Fecha límite: {new Date(objetivo.fecha_objetivo).toLocaleDateString("es-ES")}
              </p>
            )}
          </div>
        </div>
        <button onClick={handleArchivar} className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100">
          <Trash2 size={12} className="text-red-400" />
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={clsx("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-ink/50">
            {formatCurrency(objetivo.importe_aportado, objetivo.moneda)} de {formatCurrency(objetivo.importe_objetivo, objetivo.moneda)}
          </span>
          <span className="text-xs font-bold text-ink ml-2">{pct.toFixed(0)}%</span>
        </div>
        {pct < 100 && (
          <button
            onClick={() => onAportar(objetivo)}
            className="text-xs font-semibold text-accent-info bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-xl transition-colors"
          >
            + Aportar
          </button>
        )}
        {pct >= 100 && (
          <span className="text-xs font-bold text-green-600">✓ Completado</span>
        )}
      </div>
    </div>
  );
}

// ── Objetivos ─────────────────────────────────────────────────────────────────

export function Objetivos() {
  const { data: objetivos = [], isLoading } = useObjetivos();
  const [showNuevo, setShowNuevo] = useState(false);
  const [aportando, setAportando] = useState<ObjetivoOut | null>(null);

  const activos = objetivos.filter((o) => o.activo && o.porcentaje < 100);
  const completados = objetivos.filter((o) => o.porcentaje >= 100);

  return (
    <div className="min-h-full bg-app pb-24">
      <div className="bg-ink px-4 pt-10 pb-5 rounded-b-3xl mb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-white text-xl font-bold">Objetivos</h1>
            <p className="text-white/50 text-xs mt-0.5">Ahorra con propósito</p>
          </div>
          <button
            onClick={() => setShowNuevo(true)}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl px-4 py-2 text-sm font-semibold"
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto space-y-5">
        {isLoading ? (
          <div className="text-center py-10 text-ink/40 text-sm">Cargando...</div>
        ) : objetivos.length === 0 ? (
          <div className="text-center py-12">
            <Target size={40} className="mx-auto text-ink/20 mb-3" />
            <p className="text-ink/50 text-sm">Sin objetivos todavía</p>
            <p className="text-ink/30 text-xs mt-1">Crea tu primer objetivo de ahorro</p>
          </div>
        ) : (
          <>
            {activos.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-ink/40 uppercase tracking-wide mb-2">En progreso</h2>
                <div className="space-y-3">
                  {activos.map((o) => (
                    <ObjetivoCard key={o.id} objetivo={o} onAportar={setAportando} />
                  ))}
                </div>
              </section>
            )}
            {completados.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-ink/40 uppercase tracking-wide mb-2">Completados</h2>
                <div className="space-y-3">
                  {completados.map((o) => (
                    <ObjetivoCard key={o.id} objetivo={o} onAportar={setAportando} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {showNuevo && <NuevoObjetivoSheet onClose={() => setShowNuevo(false)} />}
      {aportando && <AportarSheet objetivo={aportando} onClose={() => setAportando(null)} />}
    </div>
  );
}
