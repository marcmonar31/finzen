import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCuentas } from "@/hooks/useCuentas";
import { useCategorias } from "@/hooks/useCategorias";
import { useActualizarMovimiento } from "@/hooks/useMovimientos";
import { SelectorMoneda } from "@/components/SelectorMoneda";
import { clsx } from "clsx";
import { showFlash } from "@/stores/flash";
import { CurrencyInput } from "@/components/CurrencyInput";
import type { Movimiento } from "@/types/api";

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
  movimiento: Movimiento | null;
  onClose: () => void;
}

export function EditarMovimientoSheet({ movimiento, onClose }: Props) {
  const open = !!movimiento;
  const esTransferencia = movimiento
    ? movimiento.tipo === "transferencia_origen" || movimiento.tipo === "transferencia_destino"
    : false;

  const { data: cuentas = [] } = useCuentas();
  const [tipo, setTipo] = useState<"ingreso" | "gasto">("gasto");
  const [moneda, setMoneda] = useState("EUR");
  const { data: categorias = [] } = useCategorias(tipo);
  const actualizar = useActualizarMovimiento();

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: "gasto", importe: "", concepto: "", cuenta_id: "", fecha: "" },
  });

  const catId    = watch("categoria_id");
  const cuentaId = watch("cuenta_id");
  const cuentaSeleccionada = cuentas.find((c) => c.id === cuentaId);

  // Pre-fill form when movement changes
  useEffect(() => {
    if (!movimiento || esTransferencia) return;
    const t = movimiento.tipo === "ingreso" ? "ingreso" : "gasto";
    setTipo(t);
    setMoneda(movimiento.moneda);
    reset({
      tipo: t,
      importe: parseFloat(movimiento.importe).toString(),
      concepto: movimiento.concepto,
      cuenta_id: movimiento.cuenta_id,
      categoria_id: movimiento.categoria_id ?? "",
      fecha: movimiento.fecha,
      notas: movimiento.notas ?? "",
    });
  }, [movimiento?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!movimiento) return;
    try {
      await actualizar.mutateAsync({
        id: movimiento.id,
        body: {
          ...data,
          importe: parseFloat(data.importe).toFixed(4),
          moneda,
          categoria_id: data.categoria_id || null,
        },
      });
      showFlash("Movimiento actualizado");
      onClose();
    } catch (err: unknown) {
      showFlash(err instanceof Error ? err.message : "Error al actualizar", "error");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 z-50 bg-surface rounded-3xl max-h-[85vh] overflow-y-auto shadow-[var(--shadow-floating)]"
          >
            {esTransferencia ? (
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-10 h-1 bg-border-ui rounded-full mx-auto mb-6" />
                <p className="font-bold text-fg text-base mb-2">No editable</p>
                <p className="text-fg-muted text-sm">
                  Las transferencias no se pueden editar directamente. Elimínala y créala de nuevo.
                </p>
                <button onClick={onClose} className="mt-6 w-full bg-ink text-white rounded-2xl py-3.5 font-semibold text-sm">
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-fg">Editar movimiento</h2>
                  <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                    <X className="w-4 h-4 text-fg" />
                  </button>
                </div>

                {/* Toggle ingreso/gasto */}
                <div className="flex bg-surface-2 rounded-2xl p-1 gap-1">
                  {(["gasto", "ingreso"] as const).map((t) => (
                    <button
                      key={t} type="button" onClick={() => handleTipo(t)}
                      className={clsx(
                        "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                        tipo === t ? "bg-ink text-white shadow" : "text-fg-muted"
                      )}
                    >
                      {t === "gasto" ? "💸 Gasto" : "💰 Ingreso"}
                    </button>
                  ))}
                </div>

                {/* Importe */}
                <div>
                  <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-4 py-3">
                    <Controller
                      name="importe"
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="0,00"
                          className="flex-1 min-w-0 text-2xl font-bold text-fg bg-transparent focus:outline-none placeholder:text-[#D0D0D4]"
                        />
                      )}
                    />
                    <div className="flex-shrink-0"><SelectorMoneda value={moneda} onChange={setMoneda} /></div>
                  </div>
                  {errors.importe && <p className="text-xs text-red-500 mt-1">{errors.importe.message}</p>}
                  {cuentaSeleccionada && cuentaSeleccionada.moneda !== moneda && (
                    <p className="text-xs text-fg-muted mt-1">
                      Se convertirá a {cuentaSeleccionada.moneda} con la tasa del día
                    </p>
                  )}
                </div>

                {/* Concepto */}
                <div>
                  <input
                    {...register("concepto")} placeholder="Concepto"
                    className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ink/20"
                  />
                  {errors.concepto && <p className="text-xs text-red-500 mt-1">{errors.concepto.message}</p>}
                </div>

                {/* Cuenta */}
                <div className="relative">
                  <select
                    {...register("cuenta_id")} onChange={handleCuenta}
                    className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg appearance-none focus:outline-none focus:ring-2 focus:ring-ink/20"
                  >
                    <option value="">Elige una cuenta</option>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>{c.emoji ?? "🏦"} {c.nombre} ({c.moneda})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle pointer-events-none" />
                </div>

                {/* Categorías */}
                {categorias.length > 0 && (
                  <div className="relative">
                    <select
                      value={catId ?? ""}
                      onChange={(e) => setValue("categoria_id", e.target.value)}
                      className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg appearance-none focus:outline-none focus:ring-2 focus:ring-ink/20"
                    >
                      <option value="">Sin categoría</option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji ?? "📦"} {cat.nombre}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle pointer-events-none" />
                  </div>
                )}

                {/* Fecha */}
                <div className="relative overflow-hidden">
                  <input
                    {...register("fecha")} type="date"
                    className="w-full max-w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-ink/20"
                  />
                </div>

                <button
                  type="submit" disabled={actualizar.isPending}
                  className="w-full bg-ink text-white rounded-2xl py-4 font-semibold text-base active:scale-95 transition-transform disabled:opacity-60"
                >
                  {actualizar.isPending ? "Guardando…" : "Guardar cambios"}
                </button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
