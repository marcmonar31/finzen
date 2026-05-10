import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCategorias } from "@/hooks/useCategorias";
import { useCrearPresupuesto } from "@/hooks/usePresupuestos";
import { useWorkspaceStore } from "@/stores/workspace";
import { clsx } from "clsx";
import { toast } from "sonner";

const schema = z.object({
  nombre: z.string().min(1, "Añade un nombre"),
  importe: z.string().min(1).refine((v) => parseFloat(v) > 0, "Debe ser mayor que 0"),
  periodo: z.enum(["mensual", "semanal", "trimestral", "anual"]),
  modo: z.enum(["estricto", "flexible"]),
});

type FormValues = z.infer<typeof schema>;

const PERIODOS = [
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual", label: "Anual" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NuevoPresupuestoSheet({ open, onClose }: Props) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { data: categorias = [] } = useCategorias("gasto");
  const crear = useCrearPresupuesto();

  const [catIds, setCatIds] = useState<string[]>([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: "", importe: "", periodo: "mensual", modo: "estricto" },
  });

  const periodo = watch("periodo");
  const modo = watch("modo");

  function toggleCat(id: string) {
    setCatIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function onSubmit(data: FormValues) {
    try {
      await crear.mutateAsync({
        nombre: data.nombre,
        importe: parseFloat(data.importe).toFixed(4),
        moneda: workspace?.moneda_base ?? "EUR",
        periodo: data.periodo,
        modo: data.modo,
        categoria_ids: catIds,
        cuenta_ids: [],
      });
      toast.success("Presupuesto creado");
      reset();
      setCatIds([]);
      onClose();
    } catch {
      toast.error("Error al guardar");
    }
  }

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-ink">Nuevo presupuesto</h2>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#F2F2F4] flex items-center justify-center">
                  <X className="w-4 h-4 text-ink" />
                </button>
              </div>

              {/* Nombre */}
              <div>
                <input
                  {...register("nombre")}
                  placeholder="Nombre (ej. Comida)"
                  className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-[#A0A0A4] focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
              </div>

              {/* Importe */}
              <div>
                <input
                  {...register("importe")}
                  type="number" step="0.01" placeholder="0,00" inputMode="decimal"
                  className="w-full text-center text-4xl font-bold text-ink bg-transparent border-b-2 border-[#E8E8EA] pb-2 focus:outline-none focus:border-ink placeholder:text-[#D0D0D4]"
                />
                {errors.importe && <p className="text-xs text-red-500 text-center mt-1">{errors.importe.message}</p>}
              </div>

              {/* Periodo */}
              <div>
                <p className="text-xs text-[#6B6B6F] mb-2 font-medium">Periodo</p>
                <div className="flex gap-2">
                  {PERIODOS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setValue("periodo", p.value)}
                      className={clsx(
                        "flex-1 py-2 rounded-xl text-xs font-semibold transition-all",
                        periodo === p.value ? "bg-ink text-white" : "bg-[#F2F2F4] text-[#6B6B6F]"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modo */}
              <div>
                <p className="text-xs text-[#6B6B6F] mb-2 font-medium">Modo</p>
                <div className="flex bg-[#F2F2F4] rounded-2xl p-1 gap-1">
                  {(["estricto", "flexible"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setValue("modo", m)}
                      className={clsx(
                        "flex-1 py-2 rounded-xl text-xs font-semibold transition-all",
                        modo === m ? "bg-ink text-white shadow" : "text-[#6B6B6F]"
                      )}
                    >
                      {m === "estricto" ? "📅 Estricto" : "🔄 Flexible"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#6B6B6F] mt-1">
                  {modo === "estricto"
                    ? "Se resetea al inicio del periodo (ej. 1 de cada mes)"
                    : "Ventana deslizante de los últimos N días"}
                </p>
              </div>

              {/* Categorías (filtro opcional) */}
              {categorias.length > 0 && (
                <div>
                  <p className="text-xs text-[#6B6B6F] mb-2 font-medium">
                    Categorías {catIds.length > 0 ? `(${catIds.length} seleccionadas)` : "(todas)"}
                  </p>
                  <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                    {categorias.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCat(cat.id)}
                        className={clsx(
                          "flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-all",
                          catIds.includes(cat.id) ? "bg-ink text-white" : "bg-[#F2F2F4] text-ink"
                        )}
                      >
                        <span className="text-base">{cat.emoji ?? "📦"}</span>
                        <span className="line-clamp-1 text-center">{cat.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={crear.isPending}
                className="w-full bg-ink text-white rounded-2xl py-4 font-semibold text-base active:scale-95 transition-transform disabled:opacity-60"
              >
                {crear.isPending ? "Guardando…" : "Crear presupuesto"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
