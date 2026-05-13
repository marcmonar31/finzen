import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Decimal from "decimal.js";
import { useCuentas } from "@/hooks/useCuentas";
import { useCrearTransferencia } from "@/hooks/useTransferencias";
import { isoToday, formatCurrency } from "@/lib/format";
import { showFlash } from "@/stores/flash";
import { CurrencyInput } from "@/components/CurrencyInput";

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

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
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

  const cuentaOrigenId  = watch("cuenta_origen_id");
  const cuentaDestinoId = watch("cuenta_destino_id");
  const importeOrigenRaw = watch("importe_origen");

  const cuentaOrigen  = cuentas.find((c) => c.id === cuentaOrigenId);
  const cuentaDestino = cuentas.find((c) => c.id === cuentaDestinoId);
  const distintaMoneda = cuentaOrigen && cuentaDestino && cuentaOrigen.moneda !== cuentaDestino.moneda;

  const saldoOrigen   = cuentaOrigen?.saldo ? new Decimal(cuentaOrigen.saldo) : null;
  const importeOrigen = importeOrigenRaw && parseFloat(importeOrigenRaw) > 0
    ? new Decimal(importeOrigenRaw)
    : null;
  const saldoInsuficiente = saldoOrigen !== null && importeOrigen !== null
    && importeOrigen.greaterThan(saldoOrigen);

  // Each select only shows accounts that are NOT the other selection
  const opcionesOrigen  = cuentas.filter((c) => c.id !== cuentaDestinoId);
  const opcionesDestino = cuentas.filter((c) => c.id !== cuentaOrigenId);

  async function onSubmit(data: FormValues) {
    if (saldoInsuficiente) {
      showFlash("Saldo insuficiente en la cuenta origen", "error");
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
      showFlash("Transferencia creada");
      reset();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      showFlash(msg, "error");
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
            className="fixed bottom-4 left-4 right-4 z-50 bg-surface rounded-3xl max-h-[85vh] overflow-y-auto shadow-[var(--shadow-floating)]"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-fg">Nueva transferencia</h2>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>

              {/* Cuentas */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-xs text-fg-muted mb-1 font-medium">Origen</p>
                  <select
                    {...register("cuenta_origen_id")}
                    className="w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-fg appearance-none focus:outline-none"
                  >
                    <option value="">Cuenta origen</option>
                    {opcionesOrigen.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji ?? "🏦"} {c.nombre}
                      </option>
                    ))}
                  </select>
                  {saldoOrigen !== null && (
                    <p className={`text-xs mt-0.5 ${saldoInsuficiente ? "text-[#FF5C5C] font-semibold" : "text-fg-muted"}`}>
                      Disponible: {formatCurrency(saldoOrigen.abs().toString(), cuentaOrigen!.moneda)}
                    </p>
                  )}
                  {errors.cuenta_origen_id && <p className="text-xs text-red-500 mt-0.5">{errors.cuenta_origen_id.message}</p>}
                </div>

                <ArrowRight className="w-4 h-4 text-fg-muted flex-shrink-0 mt-4" />

                <div className="flex-1">
                  <p className="text-xs text-fg-muted mb-1 font-medium">Destino</p>
                  <select
                    {...register("cuenta_destino_id")}
                    className="w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-fg appearance-none focus:outline-none"
                  >
                    <option value="">Cuenta destino</option>
                    {opcionesDestino.map((c) => (
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
                <p className="text-xs text-fg-muted mb-1 font-medium">
                  Importe {cuentaOrigen ? `(${cuentaOrigen.moneda})` : ""}
                </p>
                <Controller
                  name="importe_origen"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="0,00"
                      className="w-full text-center text-3xl font-bold text-fg bg-transparent border-b-2 border-[#E8E8EA] pb-2 focus:outline-none focus:border-ink placeholder:text-[#D0D0D4]"
                    />
                  )}
                />
                {errors.importe_origen && <p className="text-xs text-red-500 text-center mt-1">{errors.importe_origen.message}</p>}
              </div>

              {/* Importe destino (solo si distinta moneda) */}
              {distintaMoneda && (
                <div>
                  <p className="text-xs text-fg-muted mb-1 font-medium">
                    Importe recibido ({cuentaDestino?.moneda}) — opcional, si lo conoces
                  </p>
                  <Controller
                    name="importe_destino"
                    control={control}
                    render={({ field }) => (
                      <CurrencyInput
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Se calculará automáticamente"
                        className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-ink/20"
                      />
                    )}
                  />
                  <p className="text-xs text-fg-muted mt-1">
                    Si lo dejas vacío, se convertirá con la tasa del día ({cuentaOrigen?.moneda} → {cuentaDestino?.moneda})
                  </p>
                </div>
              )}

              {/* Concepto */}
              <div>
                <input
                  {...register("concepto")}
                  placeholder="Concepto"
                  className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>

              {/* Fecha */}
              <div>
                <input
                  {...register("fecha")}
                  type="date"
                  className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>

              <button
                type="submit"
                disabled={crear.isPending || saldoInsuficiente}
                className={`w-full rounded-2xl py-4 font-semibold text-base active:scale-95 transition-transform disabled:opacity-60 ${
                  saldoInsuficiente ? "bg-[#FF5C5C] text-white" : "bg-ink text-white"
                }`}
              >
                {crear.isPending
                  ? "Guardando…"
                  : saldoInsuficiente
                  ? "Saldo insuficiente"
                  : "Guardar transferencia"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
