import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useActualizarCuenta } from "@/hooks/useCuentas";
import { clsx } from "clsx";
import { showFlash } from "@/stores/flash";
import type { Cuenta } from "@/types/api";

const TIPOS = [
  { id: "corriente",      label: "Corriente",  emoji: "🏦" },
  { id: "ahorro",         label: "Ahorro",     emoji: "🏆" },
  { id: "efectivo",       label: "Efectivo",   emoji: "💵" },
  { id: "tarjeta_credito",label: "Tarjeta",    emoji: "💳" },
  { id: "inversion",      label: "Inversión",  emoji: "📈" },
  { id: "otro",           label: "Otro",       emoji: "📦" },
];

const EMOJIS = ["🏦", "💵", "💳", "🏆", "🐷", "🪙", "💰", "🏠", "🚗", "✈️", "🎯", "📊"];

const schema = z.object({
  nombre: z.string().min(1, "Pon un nombre"),
  tipo:   z.string().min(1),
  emoji:  z.string().optional(),
  incluir_en_patrimonio: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  cuenta: Cuenta | null;
  onClose: () => void;
}

export function EditarCuentaSheet({ cuenta, onClose }: Props) {
  const open = !!cuenta;
  const actualizar = useActualizarCuenta();

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: "", tipo: "corriente", emoji: "🏦", incluir_en_patrimonio: true },
  });

  const tipoSeleccionado  = watch("tipo");
  const emojiSeleccionado = watch("emoji");
  const enPatrimonio      = watch("incluir_en_patrimonio");

  useEffect(() => {
    if (!cuenta) return;
    reset({
      nombre: cuenta.nombre,
      tipo:   cuenta.tipo,
      emoji:  cuenta.emoji ?? "🏦",
      incluir_en_patrimonio: cuenta.incluir_en_patrimonio,
    });
  }, [cuenta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: FormValues) {
    if (!cuenta) return;
    try {
      await actualizar.mutateAsync({ id: cuenta.id, ...data });
      showFlash("Cuenta actualizada");
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
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-fg">Editar cuenta</h2>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>

              {/* Emoji */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-medium">Icono</p>
                <div className="flex gap-2 flex-wrap">
                  {EMOJIS.map((e) => (
                    <button key={e} type="button" onClick={() => setValue("emoji", e)}
                      className={clsx("w-10 h-10 rounded-xl text-xl transition-all",
                        emojiSeleccionado === e ? "bg-ink" : "bg-surface-2")}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <input
                {...register("nombre")}
                placeholder="Nombre de la cuenta"
                className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
              />

              {/* Tipo */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-medium">Tipo</p>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map((t) => (
                    <button key={t.id} type="button" onClick={() => setValue("tipo", t.id)}
                      className={clsx("flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-all",
                        tipoSeleccionado === t.id ? "bg-ink text-white" : "bg-surface-2 text-fg")}>
                      <span className="text-base">{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Incluir en patrimonio */}
              <button
                type="button"
                onClick={() => setValue("incluir_en_patrimonio", !enPatrimonio)}
                className={clsx(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all",
                  enPatrimonio ? "bg-ink text-white" : "bg-surface-2 text-fg"
                )}
              >
                <span className="font-medium">Incluir en patrimonio</span>
                <span className="text-lg">{enPatrimonio ? "✓" : "○"}</span>
              </button>

              <button
                type="submit" disabled={actualizar.isPending}
                className="w-full bg-ink text-white rounded-2xl py-4 font-semibold active:scale-95 transition-transform disabled:opacity-60"
              >
                {actualizar.isPending ? "Guardando…" : "Guardar cambios"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
