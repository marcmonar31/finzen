import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { X, Building2, PiggyBank, Banknote, CreditCard, TrendingUp, Package } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCrearCuenta } from "@/hooks/useCuentas";
import { showFlash } from "@/stores/flash";
import { clsx } from "clsx";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useWorkspaceStore } from "@/stores/workspace";
import { ICON_LIST, ICON_MAP } from "@/components/AppIcon";

const TIPOS_IDS = [
  { id: "corriente",       Icon: Building2  },
  { id: "ahorro",          Icon: PiggyBank  },
  { id: "efectivo",        Icon: Banknote   },
  { id: "tarjeta_credito", Icon: CreditCard },
  { id: "inversion",       Icon: TrendingUp },
  { id: "otro",            Icon: Package    },
];

const MONEDAS = ["EUR", "USD", "GBP", "CHF", "JPY", "MXN", "BRL", "ARS"];

const schema = z.object({
  nombre:        z.string().min(1),
  tipo:          z.string().min(1),
  moneda:        z.string().length(3),
  saldo_inicial: z.string().refine((v) => !isNaN(parseFloat(v))),
  icono:         z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NuevaCuentaSheet({ open, onClose }: Props) {
  const { t } = useTranslation();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const TIPOS = TIPOS_IDS.map((tp) => ({ ...tp, label: t(`cuenta_tipos.${tp.id}`) }));
  const crear = useCrearCuenta();
  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: "corriente", moneda: "EUR", saldo_inicial: "0", icono: "building2" },
  });

  useEffect(() => {
    if (open) setValue("moneda", workspace?.moneda_base ?? "EUR");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const tipoSeleccionado = watch("tipo");
  const iconoSeleccionado = watch("icono");

  async function onSubmit(data: FormValues) {
    try {
      await crear.mutateAsync({
        nombre:        data.nombre,
        tipo:          data.tipo,
        moneda:        data.moneda,
        saldo_inicial: parseFloat(data.saldo_inicial).toFixed(4),
        emoji:         data.icono,
      });
      showFlash(t("cuentas.creada"));
      reset();
      onClose();
    } catch (err: unknown) {
      showFlash(err instanceof Error ? err.message : t("common.error"), "error");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                <h2 className="font-bold text-lg text-fg">{t("cuentas.nueva_cuenta")}</h2>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Icon picker */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-medium">{t("common.icono")}</p>
                <div className="flex gap-2 flex-wrap">
                  {ICON_LIST.map((name) => {
                    const Icon = ICON_MAP[name];
                    return (
                      <button key={name} type="button" onClick={() => setValue("icono", name)}
                        className={clsx("w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          iconoSeleccionado === name ? "bg-ink text-white" : "bg-surface-2 text-fg-muted")}>
                        <Icon size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nombre */}
              <input
                {...register("nombre")}
                placeholder={t("cuentas.nombre_placeholder")}
                className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
              />
              {errors.nombre && <p className="text-xs text-red-500">{t("cuentas.nombre_req")}</p>}

              {/* Tipo */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-medium">{t("common.tipo")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map((tp) => (
                    <button key={tp.id} type="button" onClick={() => setValue("tipo", tp.id)}
                      className={clsx("flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-all",
                        tipoSeleccionado === tp.id ? "bg-ink text-white" : "bg-surface-2 text-fg")}>
                      <tp.Icon size={18} />
                      <span>{tp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Moneda */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-medium">{t("common.moneda")}</p>
                <div className="flex gap-2 flex-wrap">
                  {MONEDAS.map((m) => (
                    <button key={m} type="button" onClick={() => setValue("moneda", m)}
                      className={clsx("px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                        watch("moneda") === m ? "bg-ink text-white" : "bg-surface-2 text-fg")}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saldo inicial */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-medium">{t("cuentas.saldo_inicial")}</p>
                <Controller
                  name="saldo_inicial"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="0,00"
                      className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                    />
                  )}
                />
                {errors.saldo_inicial && <p className="text-xs text-red-500 mt-1">{t("cuentas.saldo_invalido")}</p>}
              </div>

              <button
                type="submit" disabled={crear.isPending}
                className="w-full bg-ink text-white rounded-2xl py-4 font-semibold active:scale-95 transition-transform disabled:opacity-60"
              >
                {crear.isPending ? t("common.creando") : t("cuentas.crear_cuenta")}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
