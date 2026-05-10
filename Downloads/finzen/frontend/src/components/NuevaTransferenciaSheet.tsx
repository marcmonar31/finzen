import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCuentas } from "@/hooks/useCuentas";
import { useCrearTransferencia } from "@/hooks/useTransferencias";
import { isoToday } from "@/lib/format";
import { toast } from "sonner";

const schema = z.object({
  cuenta_origen_id: z.string().min(1, "Elige cuenta origen"),
  cuenta_destino_id: z.string().min(1, "Elige cuenta destino"),
  importe_origen: z.string().min(1).refine((v) => parseFloat(v) > 0, "Debe ser mayor que 0"),
  importe_destino: z.string().optional(),
  fecha: z.string(),
  concepto: z.string().min(1, "Añade un concepto"),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NuevaTransferenciaSheet({ open, onClose }: Props) {
  const { data: cuentas = [] } = useCuentas();
  const crear = useCrearTransferencia();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cuenta_origen_id: "",
      cuenta_destino_id: "",
      importe_origen: "",
      importe_destino: "",
      fecha: isoToday(),
      concepto: "Transferencia",
    },
  });

  const cuentaOrigenId = watch("cuenta_origen_id");
  const cuentaDestinoId = watch("cuenta_destino_id");

  const cuentaOrigen = cuentas.find((c) => c.id === cuentaOrigenId);
  const cuentaDestino = cuentas.find((c) => c.id === cuentaDestinoId);
  const distintaMoneda = cuentaOrigen && cuentaDestino && cuentaOrigen.moneda !== cuentaDestino.moneda;

  async function onSubmit(data: FormValues) {
    if (data.cuenta_origen_id === data.cuenta_destino_id) {
      toast.error("Las cuentas deben ser distintas");
      return;
    }
    try {
      const body: Record<string, unknown> = {
        cuenta_origen_id: data.cuenta_origen_id,
        cuenta_destino_id: data.cuenta_destino_id,
        importe_origen: parseFloat(data.importe_origen).toFixed(4),
        fecha: data.fecha,
        concepto: data.concepto,
        notas: data.notas || null,
      };
      if (distintaMoneda && data.importe_destino && parseFloat(data.importe_destino) > 0) {
        body.importe_destino = parseFloat(data.importe_destino).toFixed(4);
      }
      await crear.mutateAsync(body);
      toast.success("Transferencia creada");
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
                <h2 className="font-bold text-lg text-ink">Nueva transferencia</h2>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#F2F2F4] flex items-center justify-center">
                  <X className="w-4 h-4 text-ink" />
                </button>
              </div>

              {/* Cuentas */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-xs text-[#6B6B6F] mb-1 font-medium">Origen</p>
                  <select
                    {...register("cuenta_origen_id")}
                    className="w-full bg-[#F2F2F4] rounded-xl px-3 py-2.5 text-sm text-ink appearance-none focus:outline-none"
                  >
                    <option value="">Cuenta origen</option>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji ?? "🏦"} {c.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.cuenta_origen_id && <p className="text-xs text-red-500 mt-0.5">{errors.cuenta_origen_id.message}</p>}
                </div>

                <ArrowRight className="w-4 h-4 text-[#6B6B6F] flex-shrink-0 mt-4" />

                <div className="flex-1">
                  <p className="text-xs text-[#6B6B6F] mb-1 font-medium">Destino</p>
                  <select
                    {...register("cuenta_destino_id")}
                    className="w-full bg-[#F2F2F4] rounded-xl px-3 py-2.5 text-sm text-ink appearance-none focus:outline-none"
                  >
                    <option value="">Cuenta destino</option>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji ?? "🏦"} {c.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.cuenta_destino_id && <p className="text-xs text-red-500 mt-0.5">{errors.cuenta_destino_id.message}</p>}
                </div>
              </div>

              {/* Importe origen */}
              <div>
                <p className="text-xs text-[#6B6B6F] mb-1 font-medium">
                  Importe {cuentaOrigen ? `(${cuentaOrigen.moneda})` : ""}
                </p>
                <input
                  {...register("importe_origen")}
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  className="w-full text-center text-3xl font-bold text-ink bg-transparent border-b-2 border-[#E8E8EA] pb-2 focus:outline-none focus:border-ink placeholder:text-[#D0D0D4]"
                  inputMode="decimal"
                />
                {errors.importe_origen && <p className="text-xs text-red-500 text-center mt-1">{errors.importe_origen.message}</p>}
              </div>

              {/* Importe destino (solo si distinta moneda) */}
              {distintaMoneda && (
                <div>
                  <p className="text-xs text-[#6B6B6F] mb-1 font-medium">
                    Importe recibido ({cuentaDestino?.moneda}) — opcional, si lo conoces
                  </p>
                  <input
                    {...register("importe_destino")}
                    type="number"
                    step="0.01"
                    placeholder="Se calculará automáticamente"
                    className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
                    inputMode="decimal"
                  />
                  <p className="text-xs text-[#6B6B6F] mt-1">
                    Si lo dejas vacío, se convertirá con la tasa del día ({cuentaOrigen?.moneda} → {cuentaDestino?.moneda})
                  </p>
                </div>
              )}

              {/* Concepto */}
              <div>
                <input
                  {...register("concepto")}
                  placeholder="Concepto"
                  className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-[#A0A0A4] focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>

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
                {crear.isPending ? "Guardando…" : "Guardar transferencia"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
