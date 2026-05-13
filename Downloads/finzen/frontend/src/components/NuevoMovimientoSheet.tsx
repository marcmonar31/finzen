import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCuentas } from "@/hooks/useCuentas";
import { useCategorias } from "@/hooks/useCategorias";
import { useCrearMovimiento } from "@/hooks/useMovimientos";
import { isoToday } from "@/lib/format";
import { SelectorMoneda } from "@/components/SelectorMoneda";
import { clsx } from "clsx";
import { showFlash } from "@/stores/flash";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useWorkspaceStore } from "@/stores/workspace";

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
  defaultTipo?: "ingreso" | "gasto";
}

export function NuevoMovimientoSheet({ open, onClose, defaultTipo }: Props) {
  const { t } = useTranslation();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { data: cuentas = [] } = useCuentas();
  const [tipo, setTipo] = useState<"ingreso" | "gasto">(defaultTipo ?? "gasto");
  const [moneda, setMoneda] = useState(workspace?.moneda_base ?? "EUR");

  // Sync tipo and moneda when sheet opens
  useEffect(() => {
    if (open) {
      const t = defaultTipo ?? "gasto";
      setTipo(t);
      setValue("tipo", t);
      setValue("categoria_id", "");
      setMoneda(workspace?.moneda_base ?? "EUR");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTipo]);
  const { data: categorias = [] } = useCategorias(tipo);
  const crear = useCrearMovimiento();

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
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
      showFlash(t("movimientos.movimiento_anadido"));
      reset();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("common.error");
      showFlash(msg, "error");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="w-full max-w-md bg-surface rounded-3xl max-h-[90vh] overflow-y-auto shadow-[var(--shadow-floating)]"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-fg">{t("movimientos.nuevo")}</h2>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>

              {/* Toggle ingreso/gasto */}
              <div className="flex bg-surface-2 rounded-2xl p-1 gap-1">
                {(["gasto", "ingreso"] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => handleTipo(tp)}
                    className={clsx(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      tipo === tp ? "bg-ink text-white shadow" : "text-fg-muted"
                    )}
                  >
                    {tp === "gasto" ? t("movimientos.gasto") : t("movimientos.ingreso")}
                  </button>
                ))}
              </div>

              {/* Importe + moneda */}
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
                  <div className="flex-shrink-0">
                    <SelectorMoneda value={moneda} onChange={setMoneda} />
                  </div>
                </div>
                {errors.importe && <p className="text-xs text-red-500 mt-1">{errors.importe.message}</p>}
                {cuentaSeleccionada && cuentaSeleccionada.moneda !== moneda && (
                  <p className="text-xs text-fg-muted mt-1">
                    {t("movimientos.convertir_tasa", { moneda: cuentaSeleccionada.moneda })}
                  </p>
                )}
              </div>

              {/* Concepto */}
              <div>
                <input
                  {...register("concepto")}
                  placeholder={t("movimientos.concepto_placeholder")}
                  className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
                {errors.concepto && <p className="text-xs text-red-500 mt-1">{errors.concepto.message}</p>}
              </div>

              {/* Cuenta */}
              <div className="relative">
                <select
                  {...register("cuenta_id")}
                  onChange={handleCuenta}
                  className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg appearance-none focus:outline-none focus:ring-2 focus:ring-ink/20"
                >
                  <option value="">{t("movimientos.elige_cuenta")}</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.moneda})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle pointer-events-none" />
                {errors.cuenta_id && <p className="text-xs text-red-500 mt-1">{errors.cuenta_id.message}</p>}
              </div>

              {/* Categorías */}
              {categorias.length > 0 && (
                <div className="relative">
                  <select
                    value={catId ?? ""}
                    onChange={(e) => setValue("categoria_id", e.target.value)}
                    className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg appearance-none focus:outline-none focus:ring-2 focus:ring-ink/20"
                  >
                    <option value="">{t("common.sin_categoria")}</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle pointer-events-none" />
                </div>
              )}

              {/* Fecha */}
              <div className="relative overflow-hidden">
                <input
                  {...register("fecha")}
                  type="date"
                  className="w-full max-w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>

              {/* Notas */}
              <textarea
                {...register("notas")}
                placeholder={t("common.notas_placeholder")}
                rows={2}
                className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ink/20 resize-none"
              />

              <button
                type="submit"
                disabled={crear.isPending}
                className="w-full bg-ink text-white rounded-2xl py-4 font-semibold text-base active:scale-95 transition-transform disabled:opacity-60"
              >
                {crear.isPending ? t("common.guardando") : t("movimientos.guardar")}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
