import { useState } from "react";
import { Plus, Play, Pause, Trash2, Zap, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";
import { useReglas, useActualizarRegla, useArchivarRegla, useCrearRegla } from "@/hooks/useReglas";
import type { ReglaOut } from "@/types/api";

// ── Plantillas predefinidas ────────────────────────────────────────────────────

interface Plantilla {
  emoji: string;
  nombre: string;
  descripcion: string;
  trigger_tipo: string;
  trigger_config: Record<string, unknown>;
  condiciones: Array<Record<string, unknown>>;
  acciones: Array<Record<string, unknown>>;
}

const PLANTILLAS: Plantilla[] = [
  {
    emoji: "💰",
    nombre: "Redondeo al ahorro",
    descripcion: "Transfiere los céntimos de cada gasto a una cuenta de ahorro.",
    trigger_tipo: "movimiento_creado",
    trigger_config: {},
    condiciones: [{ campo: "tipo", operador: "eq", valor: "gasto" }],
    acciones: [{ tipo: "transferir_redondeo", cuenta_destino_id: "" }],
  },
  {
    emoji: "🏪",
    nombre: "Categorizar Mercadona",
    descripcion: "Asigna categoría Supermercado a movimientos con 'mercadona' en el concepto.",
    trigger_tipo: "movimiento_creado",
    trigger_config: {},
    condiciones: [{ campo: "concepto", operador: "contiene", valor: "mercadona" }],
    acciones: [{ tipo: "asignar_categoria", categoria_id: "" }],
  },
  {
    emoji: "📊",
    nombre: "Distribución de nómina",
    descripcion: "Al ingresar la nómina, reparte el 20% a ahorro y el 10% a inversión.",
    trigger_tipo: "movimiento_creado",
    trigger_config: {},
    condiciones: [
      { campo: "tipo", operador: "eq", valor: "ingreso" },
      { campo: "importe", operador: "gte", valor: 1000 },
    ],
    acciones: [
      { tipo: "transferir_porcentaje", porcentaje: "20", cuenta_destino_id: "" },
      { tipo: "transferir_porcentaje", porcentaje: "10", cuenta_destino_id: "" },
    ],
  },
];

const TRIGGER_LABEL: Record<string, string> = {
  movimiento_creado: "Al crear movimiento",
  fecha_calendario: "Fecha calendario",
  umbral_saldo: "Umbral saldo",
  umbral_presupuesto: "Umbral presupuesto",
};

const ACCION_LABEL: Record<string, string> = {
  asignar_categoria: "Asignar categoría",
  anadir_etiqueta: "Añadir etiqueta",
  transferir_porcentaje: "Transferir %",
  transferir_fijo: "Transferir importe fijo",
  transferir_redondeo: "Redondeo al ahorro",
  crear_movimiento_previsto: "Crear previsto",
  notificar: "Notificar",
  pausar_regla: "Pausar regla",
};

// ── NuevaReglaSheet ────────────────────────────────────────────────────────────

interface NuevaReglaSheetProps {
  open: boolean;
  onClose: () => void;
  plantilla?: Plantilla | null;
}

function NuevaReglaSheet({ open, onClose, plantilla }: NuevaReglaSheetProps) {
  const crearRegla = useCrearRegla();

  const [nombre, setNombre] = useState(plantilla?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion ?? "");
  const [triggerTipo, setTriggerTipo] = useState(plantilla?.trigger_tipo ?? "movimiento_creado");
  const [modoCondiciones, setModoCondiciones] = useState<"AND" | "OR">("AND");
  const [maxEjecMes, setMaxEjecMes] = useState("");

  if (!open) return null;

  async function handleGuardar() {
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      await crearRegla.mutateAsync({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        trigger_tipo: triggerTipo,
        trigger_config: plantilla?.trigger_config ?? {},
        condiciones: plantilla?.condiciones ?? [],
        modo_condiciones: modoCondiciones,
        acciones: plantilla?.acciones ?? [],
        max_ejecuciones_mes: maxEjecMes ? parseInt(maxEjecMes, 10) : undefined,
      });
      toast.success("Regla creada");
      onClose();
    } catch {
      toast.error("Error al crear la regla");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-bold text-ink mb-4">
          {plantilla ? `Plantilla: ${plantilla.emoji} ${plantilla.nombre}` : "Nueva regla"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Nombre</label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Redondeo al ahorro"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Descripción (opcional)</label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Qué hace esta regla..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Trigger</label>
            <select
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-ink bg-white focus:outline-none"
              value={triggerTipo}
              onChange={(e) => setTriggerTipo(e.target.value)}
            >
              <option value="movimiento_creado">Al crear movimiento</option>
              <option value="fecha_calendario">Fecha calendario</option>
              <option value="umbral_saldo">Umbral saldo</option>
              <option value="umbral_presupuesto">Umbral presupuesto</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Modo condiciones</label>
            <div className="flex gap-2 mt-1">
              {(["AND", "OR"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModoCondiciones(m)}
                  className={clsx(
                    "flex-1 py-2 rounded-xl text-sm font-semibold transition-colors",
                    modoCondiciones === m
                      ? "bg-ink text-white"
                      : "bg-gray-100 text-ink/60"
                  )}
                >
                  {m} — {m === "AND" ? "todas" : "alguna"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Límite ejecuciones/mes</label>
            <input
              type="number"
              min="1"
              className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              value={maxEjecMes}
              onChange={(e) => setMaxEjecMes(e.target.value)}
              placeholder="Sin límite"
            />
          </div>

          {plantilla && plantilla.condiciones.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Condiciones (de la plantilla)</label>
              <div className="mt-1 space-y-1">
                {plantilla.condiciones.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-sm text-ink/70">
                    <span className="font-mono">{String(c.campo)}</span>
                    <span className="text-ink/40">{String(c.operador)}</span>
                    <span className="font-medium">{String(c.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plantilla && plantilla.acciones.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Acciones (de la plantilla)</label>
              <div className="mt-1 space-y-1">
                {plantilla.acciones.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-sm text-ink/70">
                    <Zap size={12} className="text-accent" />
                    <span>{ACCION_LABEL[String(a.tipo)] ?? String(a.tipo)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink/40 mt-1">Configura los IDs de cuenta/categoría desde el backend o en la próxima versión del builder.</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-ink font-semibold"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 py-3 rounded-2xl bg-ink text-white font-semibold disabled:opacity-50"
            onClick={handleGuardar}
            disabled={crearRegla.isPending}
          >
            {crearRegla.isPending ? "Guardando..." : "Crear regla"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ReglaCard ──────────────────────────────────────────────────────────────────

function ReglaCard({ regla }: { regla: ReglaOut }) {
  const actualizar = useActualizarRegla();
  const archivar = useArchivarRegla();

  async function handleToggle() {
    try {
      await actualizar.mutateAsync({ id: regla.id, activa: !regla.activa });
    } catch {
      toast.error("Error al actualizar");
    }
  }

  async function handleArchivar() {
    try {
      await archivar.mutateAsync(regla.id);
      toast.success("Regla eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  }

  const acciones: Array<Record<string, unknown>> = regla.acciones ?? [];
  const condiciones: Array<Record<string, unknown>> = regla.condiciones ?? [];

  return (
    <div
      className={clsx(
        "bg-white rounded-2xl p-4 shadow-sm border transition-opacity",
        regla.activa ? "border-transparent opacity-100" : "border-gray-100 opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Zap size={14} className={clsx(regla.activa ? "text-accent" : "text-ink/30")} />
            <span className="font-semibold text-ink text-sm truncate">{regla.nombre}</span>
          </div>
          {regla.descripcion && (
            <p className="text-xs text-ink/50 mt-0.5 line-clamp-1">{regla.descripcion}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-ink/5 text-ink/60">
              {TRIGGER_LABEL[regla.trigger_tipo] ?? regla.trigger_tipo}
            </span>
            {condiciones.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                {condiciones.length} condición{condiciones.length !== 1 ? "es" : ""}
              </span>
            )}
            {acciones.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                {acciones.length} acción{acciones.length !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          {regla.ultima_ejecucion && (
            <p className="text-xs text-ink/30 mt-1">
              Última ejecución: {new Date(regla.ultima_ejecucion).toLocaleDateString("es-ES")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleToggle}
            className={clsx(
              "p-2 rounded-xl transition-colors",
              regla.activa ? "bg-ink/5 hover:bg-ink/10" : "bg-green-50 hover:bg-green-100"
            )}
            title={regla.activa ? "Pausar" : "Activar"}
          >
            {regla.activa ? <Pause size={14} className="text-ink/60" /> : <Play size={14} className="text-green-600" />}
          </button>
          <button
            onClick={handleArchivar}
            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PlantillaCard ──────────────────────────────────────────────────────────────

function PlantillaCard({
  plantilla,
  onUsar,
}: {
  plantilla: Plantilla;
  onUsar: (p: Plantilla) => void;
}) {
  return (
    <button
      onClick={() => onUsar(plantilla)}
      className="bg-white rounded-2xl p-4 shadow-sm border border-transparent hover:border-accent/30 text-left w-full transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{plantilla.emoji}</span>
          <div>
            <p className="font-semibold text-ink text-sm">{plantilla.nombre}</p>
            <p className="text-xs text-ink/50 line-clamp-1">{plantilla.descripcion}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-ink/20 group-hover:text-accent transition-colors" />
      </div>
    </button>
  );
}

// ── Reglas (main) ──────────────────────────────────────────────────────────────

export function Reglas() {
  const { data: reglas = [], isLoading } = useReglas();
  const [showSheet, setShowSheet] = useState(false);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<Plantilla | null>(null);

  const activas = reglas.filter((r) => r.activa);
  const pausadas = reglas.filter((r) => !r.activa);

  function handleUsarPlantilla(p: Plantilla) {
    setPlantillaSeleccionada(p);
    setShowSheet(true);
  }

  function handleNuevaVacia() {
    setPlantillaSeleccionada(null);
    setShowSheet(true);
  }

  function handleCloseSheet() {
    setShowSheet(false);
    setPlantillaSeleccionada(null);
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header */}
      <div className="bg-ink px-4 pt-10 pb-5 rounded-b-3xl mb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-white text-xl font-bold">Reglas</h1>
            <p className="text-white/50 text-xs mt-0.5">Automatiza tus finanzas</p>
          </div>
          <button
            onClick={handleNuevaVacia}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            Nueva
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto space-y-6">
        {/* Reglas activas */}
        {isLoading ? (
          <div className="text-center py-10 text-ink/40 text-sm">Cargando...</div>
        ) : reglas.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl">⚡</span>
            <p className="text-ink/50 text-sm mt-2">No hay reglas todavía</p>
            <p className="text-ink/30 text-xs mt-1">Usa una plantilla o crea la tuya</p>
          </div>
        ) : (
          <>
            {activas.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-ink/40 uppercase tracking-wide mb-2">Activas</h2>
                <div className="space-y-2">
                  {activas.map((r) => <ReglaCard key={r.id} regla={r} />)}
                </div>
              </section>
            )}
            {pausadas.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-ink/40 uppercase tracking-wide mb-2">Pausadas</h2>
                <div className="space-y-2">
                  {pausadas.map((r) => <ReglaCard key={r.id} regla={r} />)}
                </div>
              </section>
            )}
          </>
        )}

        {/* Plantillas */}
        <section>
          <h2 className="text-xs font-semibold text-ink/40 uppercase tracking-wide mb-2">Plantillas</h2>
          <div className="space-y-2">
            {PLANTILLAS.map((p) => (
              <PlantillaCard key={p.nombre} plantilla={p} onUsar={handleUsarPlantilla} />
            ))}
          </div>
        </section>
      </div>

      <NuevaReglaSheet
        open={showSheet}
        onClose={handleCloseSheet}
        plantilla={plantillaSeleccionada}
      />
    </div>
  );
}
