import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCuentas } from "@/hooks/useCuentas";
import { useCategorias } from "@/hooks/useCategorias";
import { useCrearRecurrente } from "@/hooks/useRecurrentes";
import { isoToday } from "@/lib/format";
import { clsx } from "clsx";
import { toast } from "sonner";

const schema = z.object({
  tipo: z.enum(["ingreso", "gasto"]),
  nombre: z.string().min(1, "Añade un concepto"),
  importe: z.string().min(1).refine((v) => parseFloat(v) > 0, "Debe ser mayor que 0"),
  cuenta_id: z.string().min(1, "Elige una cuenta"),
  categoria_id: z.string().optional(),
  frecuencia: z.enum(["diario", "semanal", "mensual", "anual"]),
  dia_mes: z.number().min(1).max(28).optional(),
  fecha_inicio: z.string(),
});

type FormValues = z.infer<typeof schema>;

const FRECUENCIAS = [
  { value: "diario", label: "Cada día", icon: "📅" },
  { value: "semanal", label: "Cada semana", icon: "📆" },
  { value: "mensual", label: "Cada mes", icon: "🗓️" },
  { value: "anual", label: "Cada año", icon: "📋" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NuevoRecurrenteSheet({ open, onClose }: Props) {
  const [tipo, setTipo] = useState<"ingreso" | "gasto">("gasto");
  const { data: cuentas = [] } = useCuentas();
  const { data: categorias = [] } = useCategorias(tipo);
  const crear = useCrearRecurrente();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: "gasto",
      nombre: "",
      importe: "",
      cuenta_id: "",
      frecuencia: "mensual",
      fecha_inicio: isoToday(),
    },
  });

  const frecuencia = watch("frecuencia");
  const catId = watch("categoria_id");
  const cuentaId = watch("cuenta_id");
  const cuentaSeleccionada = cuentas.find((c) => c.id === cuentaId);

  function handleTipo(t: "ingreso" | "gasto") {
    setTipo(t);
    setValue("tipo", t);
    setValue("categoria_id", "");
  }

  async function onSubmit(data: FormValues) {
    try {
      const body: Record<string, unknown> = {
        nombre: data.nombre,
        tipo: data.tipo,
        importe: parseFloat(data.importe).toFixed(4),
        moneda: cuentaSeleccionada?.moneda ?? "EUR",
        cuenta_id: data.cuenta_id,
        categoria_id: data.categoria_id || null,
        frecuencia: data.frecuencia,
        fecha_inicio: data.fecha_inicio,
      };
      if (data.frecuencia === "mensual" && data.dia_mes) {
        body.dia_mes = data.dia_mes;
      }
      await crear.mutateAsync(body);
      toast.success("Recurrente creado");
      reset();
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
                <h2 className="font-bold text-lg text-ink">Nuevo recurrente</h2>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#F2F2F4] flex items-center justify-center">
                  <X className="w-4 h-4 text-ink" />
                </button>
              </div>

              {/* Toggle ingreso/gasto */}
              <div className="flex bg-[#F2F2F4] rounded-2xl p-1 gap-1">
                {(["gasto", "ingreso"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTipo(t)}
                    className={clsx(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      tipo === t ? "bg-ink text-white shadow" : "text-[#6B6B6F]"
                    )}
                  >
                    {t === "gasto" ? "💸 Gasto" : "💰 Ingreso"}
                  </button>
                ))}
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

              {/* Nombre/concepto */}
              <div>
                <input
                  {...register("nombre")}
                  placeholder="Concepto (ej. Alquiler, Netflix)"
                  className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-[#A0A0A4] focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
              </div>

              {/* Cuenta */}
              <div className="relative">
                <select
                  {...register("cuenta_id")}
                  className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink appearance-none focus:outline-none"
                >
                  <option value="">Elige una cuenta</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji ?? "🏦"} {c.nombre} ({c.moneda})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A4] pointer-events-none" />
                {errors.cuenta_id && <p className="text-xs text-red-500 mt-1">{errors.cuenta_id.message}</p>}
              </div>

              {/* Categorías */}
              {categorias.length > 0 && (
                <div>
                  <p className="text-xs text-[#6B6B6F] mb-2 font-medium">Categoría</p>
                  <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                    {categorias.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setValue("categoria_id", catId === cat.id ? "" : cat.id)}
                        className={clsx(
                          "flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-all",
                          catId === cat.id ? "bg-ink text-white" : "bg-[#F2F2F4] text-ink"
                        )}
                      >
                        <span className="text-base">{cat.emoji ?? "📦"}</span>
                        <span className="line-clamp-1 text-center">{cat.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Frecuencia */}
              <div>
                <p className="text-xs text-[#6B6B6F] mb-2 font-medium">Frecuencia</p>
                <div className="grid grid-cols-2 gap-2">
                  {FRECUENCIAS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setValue("frecuencia", f.value)}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                        frecuencia === f.value ? "bg-ink text-white" : "bg-[#F2F2F4] text-ink"
                      )}
                    >
                      <span>{f.icon}</span>
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Día del mes (solo mensual) */}
              {frecuencia === "mensual" && (
                <div>
                  <p className="text-xs text-[#6B6B6F] mb-1 font-medium">Día del mes (1-28)</p>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    placeholder="Ej. 1 (por defecto el mismo día que la fecha inicio)"
                    className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink focus:outline-none"
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setValue("dia_mes", isNaN(v) ? undefined : v);
                    }}
                  />
                </div>
              )}

              {/* Fecha inicio */}
              <div>
                <p className="text-xs text-[#6B6B6F] mb-1 font-medium">Primera ejecución</p>
                <input
                  {...register("fecha_inicio")}
                  type="date"
                  className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={crear.isPending}
                className="w-full bg-ink text-white rounded-2xl py-4 font-semibold text-base active:scale-95 transition-transform disabled:opacity-60"
              >
                {crear.isPending ? "Guardando…" : "Crear recurrente"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
