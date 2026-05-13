import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCategorias } from "@/hooks/useCategorias";
import { useCrearPresupuesto, useActualizarPresupuesto } from "@/hooks/usePresupuestos";
import { useWorkspaceStore } from "@/stores/workspace";
import { clsx } from "clsx";
import { showFlash } from "@/stores/flash";
import type { Presupuesto } from "@/types/api";

const schema = z.object({
  nombre:      z.string().min(1, "Añade un nombre"),
  importe:     z.string().min(1).refine((v) => parseFloat(v) > 0, "Debe ser mayor que 0"),
  periodo:     z.enum(["mensual", "semanal", "trimestral", "anual"]),
  modo:        z.enum(["estricto", "flexible"]),
  categoria_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const PERIODOS = [
  { value: "semanal",    label: "Semanal" },
  { value: "mensual",    label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual",      label: "Anual" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  presupuesto?: Presupuesto | null;
}

export function NuevoPresupuestoSheet({ open, onClose, presupuesto }: Props) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { data: categorias = [] } = useCategorias("gasto");
  const crear     = useCrearPresupuesto();
  const actualizar = useActualizarPresupuesto();

  const editando = !!presupuesto;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: "", importe: "", periodo: "mensual", modo: "estricto", categoria_id: "" },
  });

  const periodo    = watch("periodo");
  const modo       = watch("modo");
  const categoriaId = watch("categoria_id");

  // Pre-fill when editing
  useEffect(() => {
    if (open && presupuesto) {
      reset({
        nombre:       presupuesto.nombre,
        importe:      String(parseFloat(presupuesto.importe)),
        periodo:      presupuesto.periodo as FormValues["periodo"],
        modo:         presupuesto.modo    as FormValues["modo"],
        categoria_id: presupuesto.categoria_ids?.[0] ?? "",
      });
    } else if (open && !presupuesto) {
      reset({ nombre: "", importe: "", periodo: "mensual", modo: "estricto", categoria_id: "" });
    }
  }, [open, presupuesto, reset]);

  async function onSubmit(data: FormValues) {
    const catIds = data.categoria_id ? [data.categoria_id] : [];
    try {
      if (editando && presupuesto) {
        await actualizar.mutateAsync({
          id:            presupuesto.id,
          nombre:        data.nombre,
          importe:       parseFloat(data.importe).toFixed(4),
          periodo:       data.periodo,
          modo:          data.modo,
          categoria_ids: catIds,
        });
        showFlash("Presupuesto actualizado");
      } else {
        await crear.mutateAsync({
          nombre:        data.nombre,
          importe:       parseFloat(data.importe).toFixed(4),
          moneda:        workspace?.moneda_base ?? "EUR",
          periodo:       data.periodo,
          modo:          data.modo,
          categoria_ids: catIds,
          cuenta_ids:    [],
        });
        showFlash("Presupuesto creado");
      }
      onClose();
    } catch {
      showFlash("Error al guardar", "error");
    }
  }

  const isPending = crear.isPending || actualizar.isPending;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40" onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl max-h-[90vh] overflow-y-auto"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-fg">
                  {editando ? "Editar presupuesto" : "Nuevo presupuesto"}
                </h2>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>

              {/* Nombre */}
              <div>
                <input
                  {...register("nombre")}
                  placeholder="Nombre (ej. Comida)"
                  className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
              </div>

              {/* Importe */}
              <div>
                <input
                  {...register("importe")}
                  type="number" step="0.01" placeholder="0,00" inputMode="decimal"
                  className="w-full text-center text-4xl font-bold text-fg bg-transparent border-b-2 border-[#E8E8EA] pb-2 focus:outline-none focus:border-ink placeholder:text-[#D0D0D4]"
                />
                {errors.importe && <p className="text-xs text-red-500 text-center mt-1">{errors.importe.message}</p>}
              </div>

              {/* Periodo */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-medium">Periodo</p>
                <div className="flex gap-2">
                  {PERIODOS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setValue("periodo", p.value)}
                      className={clsx(
                        "flex-1 py-2 rounded-xl text-xs font-semibold transition-all",
                        periodo === p.value ? "bg-ink text-white" : "bg-surface-2 text-fg-muted"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modo */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-medium">Modo</p>
                <div className="flex bg-surface-2 rounded-2xl p-1 gap-1">
                  {(["estricto", "flexible"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setValue("modo", m)}
                      className={clsx(
                        "flex-1 py-2 rounded-xl text-xs font-semibold transition-all",
                        modo === m ? "bg-ink text-white shadow" : "text-fg-muted"
                      )}
                    >
                      {m === "estricto" ? "📅 Estricto" : "🔄 Flexible"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-fg-muted mt-1">
                  {modo === "estricto"
                    ? "Se resetea al inicio del periodo (ej. 1 de cada mes)"
                    : "Ventana deslizante de los últimos N días"}
                </p>
              </div>

              {/* Categoría */}
              {categorias.length > 0 && (
                <div>
                  <p className="text-xs text-fg-muted mb-2 font-medium">Categoría</p>
                  <div className="relative">
                    <select
                      {...register("categoria_id")}
                      className="w-full appearance-none bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none pr-9"
                    >
                      <option value="">Todas las categorías</option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji ?? "📦"} {cat.nombre}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted pointer-events-none" />
                  </div>
                  {categoriaId && (
                    <button
                      type="button"
                      onClick={() => setValue("categoria_id", "")}
                      className="mt-1.5 text-xs text-fg-muted underline"
                    >
                      Quitar categoría
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-ink text-white rounded-2xl py-4 font-semibold text-base active:scale-95 transition-transform disabled:opacity-60"
              >
                {isPending ? "Guardando…" : editando ? "Guardar cambios" : "Crear presupuesto"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
