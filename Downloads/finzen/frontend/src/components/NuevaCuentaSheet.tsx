import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCrearCuenta } from "@/hooks/useCuentas";
import { toast } from "sonner";
import { clsx } from "clsx";

const TIPOS = [
  { id: "corriente", label: "Corriente", emoji: "🏦" },
  { id: "ahorro", label: "Ahorro", emoji: "🏆" },
  { id: "efectivo", label: "Efectivo", emoji: "💵" },
  { id: "tarjeta_credito", label: "Tarjeta crédito", emoji: "💳" },
  { id: "inversion", label: "Inversión", emoji: "📈" },
  { id: "otro", label: "Otro", emoji: "📦" },
];

const MONEDAS = ["EUR", "USD", "GBP", "CHF", "JPY", "MXN", "BRL", "ARS"];

const schema = z.object({
  nombre: z.string().min(1, "Pon un nombre"),
  tipo: z.string().min(1),
  moneda: z.string().length(3),
  saldo_inicial: z.string().refine((v) => !isNaN(parseFloat(v)), "Número inválido"),
  emoji: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMOJIS = ["🏦", "💵", "💳", "🏆", "🐷", "🪙", "💰", "🏠", "🚗", "✈️", "🎯", "📊"];

export function NuevaCuentaSheet({ open, onClose }: Props) {
  const crear = useCrearCuenta();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: "corriente", moneda: "EUR", saldo_inicial: "0", emoji: "🏦" },
  });

  const tipoSeleccionado = watch("tipo");
  const emojiSeleccionado = watch("emoji");

  async function onSubmit(data: FormValues) {
    try {
      await crear.mutateAsync({
        ...data,
        saldo_inicial: parseFloat(data.saldo_inicial).toFixed(4),
      });
      toast.success("Cuenta creada");
      reset();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al crear la cuenta");
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
                <h2 className="font-bold text-lg text-ink">Nueva cuenta</h2>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#F2F2F4] flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Emoji picker */}
              <div>
                <p className="text-xs text-[#6B6B6F] mb-2 font-medium">Icono</p>
                <div className="flex gap-2 flex-wrap">
                  {EMOJIS.map((e) => (
                    <button key={e} type="button" onClick={() => setValue("emoji", e)}
                      className={clsx("w-10 h-10 rounded-xl text-xl transition-all", emojiSeleccionado === e ? "bg-ink" : "bg-[#F2F2F4]")}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <input
                {...register("nombre")}
                placeholder="Nombre de la cuenta"
                className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink placeholder:text-[#A0A0A4] focus:outline-none"
              />
              {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}

              {/* Tipo */}
              <div>
                <p className="text-xs text-[#6B6B6F] mb-2 font-medium">Tipo</p>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map((t) => (
                    <button key={t.id} type="button" onClick={() => setValue("tipo", t.id)}
                      className={clsx("flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-all",
                        tipoSeleccionado === t.id ? "bg-ink text-white" : "bg-[#F2F2F4] text-ink")}>
                      <span className="text-base">{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Moneda */}
              <div>
                <p className="text-xs text-[#6B6B6F] mb-2 font-medium">Moneda</p>
                <div className="flex gap-2 flex-wrap">
                  {MONEDAS.map((m) => (
                    <button key={m} type="button" onClick={() => setValue("moneda", m)}
                      className={clsx("px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                        watch("moneda") === m ? "bg-ink text-white" : "bg-[#F2F2F4] text-ink")}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saldo inicial */}
              <div>
                <p className="text-xs text-[#6B6B6F] mb-2 font-medium">Saldo inicial</p>
                <input
                  {...register("saldo_inicial")}
                  type="number" step="0.01" placeholder="0.00"
                  className="w-full bg-[#F2F2F4] rounded-xl px-4 py-3 text-sm text-ink focus:outline-none"
                />
              </div>

              <button
                type="submit" disabled={crear.isPending}
                className="w-full bg-ink text-white rounded-2xl py-4 font-semibold active:scale-95 transition-transform disabled:opacity-60"
              >
                {crear.isPending ? "Creando…" : "Crear cuenta"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
