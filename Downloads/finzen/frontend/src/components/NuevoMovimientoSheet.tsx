import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCuentas } from "@/hooks/useCuentas";
import { useCategorias } from "@/hooks/useCategorias";
import { useCrearMovimiento } from "@/hooks/useMovimientos";
import { isoToday } from "@/lib/format";
import { SelectorMoneda } from "@/components/SelectorMoneda";
import { clsx } from "clsx";
import { toast } from "sonner";

const schema = z.object({
  tipo: z.enum(["ingreso", "gasto"]),
  importe: z.string().min(1).refine((v) => parseFloat(v) > 0, "Debe ser mayor que 0"),
  concepto: z.string().min(1, "Añade un concepto"),
  cuenta_id: z.string().min(1, "Elige una cuenta"),
  categoria_id: z.string().optional(),
  fecha: z.string(),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NuevoMovimientoSheet({ open, onClose }: Props) {
  const { data: cuentas = [] } = useCuentas();
  const [tipo, setTipo] = useState<"ingreso" | "gasto">("gasto");
  const [moneda, setMoneda] = useState("EUR");
  const { data: categorias = [] } = useCategorias(tipo);
  const crear = useCrearMovimiento();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: "gasto", importe: "", concepto: "", cuenta_id: "", fecha: isoToday() },
  });

  const catId = watch("categoria_id");
  const cuentaId = watch("cuenta_id");

  const cuentaSeleccionada = cuentas.find((c) => c.id === cuentaId);

  function handleTipo(t: "ingreso" | "gasto") {
    setTipo(t);
    setValue("tipo", t);
    setValue("categoria_id", "");
  }

  function handleCuenta(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setValue("cuenta_id", id);
    const cuenta = cuentas.find((c) => c.id === id);
    if (cuenta) setMoneda(cuenta.moneda);
  }

  async function onSubmit(data: FormValues) {
    try {
      await crear.mutateAsync({
        ...data,
        importe: parseFloat(data.importe).toFixed(4),
        moneda,
        categoria_id: data.categoria_id || null,
      });
      toast.success("Movimiento añadido");
      reset();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      toast.error(msg);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-ink">Nuevo movimiento</h2>
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

              {/* Importe + moneda */}
              <div>
                <div className="flex items-end gap-3">
                  <input
                    {...register("importe")}
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="flex-1 text-center text-4xl font-bold text-ink bg-transparent border-b-2 border-[#E8E8EA] pb-2 focus:outline-none focus:border-ink placeholder:text-[#D0D0D4]"
                    inputMode="decimal"
                  />
                  <div className="pb-2">
                    <SelectorMoneda value={moneda} onChange={setMoneda} />
                  </div>
                </div>
                {errors.importe && <p className="text-xs text-red-500 text-center mt-1">{errors.importe.message}</p>}
                {cuentaSeleccionada && cuentaSeleccionada.moneda !== moneda && (
                  <p className="text-xs text-[#6B6B6F] text-center mt-1">
                    Se convertirá a {cuentaSeleccionada.moneda} con la tasa del día
                  </p>
                )}
              </div>

              {/* Concepto */}
              <div>
                <input
                  {...register("concepto")}
                  placeholder="Concepto (ej. Mercadona)"
                  className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-[#A0A0A4] focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
                {errors.concepto && <p className="text-xs text-red-500 mt-1">{errors.concepto.message}</p>}
              </div>

              {/* Cuenta */}
              <div className="relative">
                <select
                  {...register("cuenta_id")}
                  onChange={handleCuenta}
                  className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-ink/20"
                >
                  <option value="">Elige una cuenta</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji ?? "🏦"} {c.nombre} ({c.moneda})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A4] pointer-events-none" />
                {errors.cuenta_id && <p className="text-xs text-red-500 mt-1">{errors.cuenta_id.message}</p>}
              </div>

              {/* Categorías */}
              {categorias.length > 0 && (
                <div>
                  <p className="text-xs text-[#6B6B6F] mb-2 font-medium">Categoría</p>
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto">
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
                        <span className="text-lg">{cat.emoji ?? "📦"}</span>
                        <span className="leading-tight text-center line-clamp-1">{cat.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fecha */}
              <div>
                <input
                  {...register("fecha")}
                  type="date"
                  className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>

              <button
                type="submit"
                disabled={crear.isPending}
                className="w-full bg-ink text-white rounded-2xl py-4 font-semibold text-base active:scale-95 transition-transform disabled:opacity-60"
              >
                {crear.isPending ? "Guardando…" : "Guardar movimiento"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
