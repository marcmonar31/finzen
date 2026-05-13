import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, ShoppingCart, TrendingUp, Repeat } from "lucide-react";
import { clsx } from "clsx";
import { useCrearCategoria, useActualizarCategoria } from "@/hooks/useCategorias";
import { showFlash } from "@/stores/flash";
import { ICONO_MAP, ICONOS } from "@/lib/iconos";
import type { Categoria } from "@/types/api";

const TIPOS = [
  { id: "gasto",         label: "Gasto",        Icon: ShoppingCart },
  { id: "ingreso",       label: "Ingreso",      Icon: TrendingUp },
  { id: "transferencia", label: "Transfer.",    Icon: Repeat },
] as const;

const COLORES = [
  "#C7FF6B", "#4A90E2", "#FF9A4D", "#B57BFF",
  "#FF5C5C", "#FFD84D", "#4DD8C7", "#FF6BB5",
  "#B0B0B4", "#34D399", "#F87171", "#60A5FA",
];

const schema = z.object({
  nombre: z.string().min(1, "Obligatorio").max(200),
  tipo:   z.enum(["gasto", "ingreso", "transferencia"]),
  icono:  z.string().nullable(),
  color:  z.string().nullable(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  categoria?: Categoria | null;
  parentId?: string | null;
  tipoForzado?: "gasto" | "ingreso" | "transferencia";
}

export function NuevaCategoriaSheet({ open, onClose, categoria, parentId, tipoForzado }: Props) {
  const crear    = useCrearCategoria();
  const editar   = useActualizarCategoria();
  const esEditar = !!categoria;

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: "", tipo: tipoForzado ?? "gasto", icono: null, color: null },
  });

  const iconoVal = watch("icono");
  const colorVal = watch("color");
  const tipoVal  = watch("tipo");

  useEffect(() => {
    if (open) {
      reset({
        nombre: categoria?.nombre ?? "",
        tipo:   tipoForzado ?? (categoria?.tipo as "gasto" | "ingreso" | "transferencia") ?? "gasto",
        icono:  categoria?.emoji ?? null,
        color:  categoria?.color ?? null,
      });
    }
  }, [open, categoria, tipoForzado, reset]);

  async function onSubmit(data: FormData) {
    try {
      if (esEditar) {
        await editar.mutateAsync({ id: categoria!.id, nombre: data.nombre, emoji: data.icono, color: data.color });
        showFlash("Categoría actualizada", "success");
      } else {
        await crear.mutateAsync({ nombre: data.nombre, tipo: data.tipo, emoji: data.icono, color: data.color, parent_id: parentId ?? null });
        showFlash("Categoría creada", "success");
      }
      onClose();
    } catch {
      showFlash("Error al guardar la categoría", "error");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* handle */}
        <div className="w-10 h-1 rounded-full bg-fg/20 mx-auto mb-4" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-fg">
            {esEditar ? "Editar categoría" : parentId ? "Nueva subcategoría" : "Nueva categoría"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2">
            <X className="w-4 h-4 text-fg-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Nombre */}
          <div>
            <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5 block">Nombre</label>
            <input
              {...register("nombre")}
              placeholder="Ej: Supermercado"
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-fg text-sm outline-none focus:ring-2 focus:ring-accent-positive/50"
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          {/* Tipo — solo si no hay padre ni tipo forzado */}
          {!parentId && !esEditar && (
            <div>
              <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5 block">Tipo</label>
              <div className="flex gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setValue("tipo", t.id)}
                    className={clsx(
                      "flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                      tipoVal === t.id ? "bg-ink text-white" : "bg-surface-2 text-fg-muted"
                    )}
                  >
                    <t.Icon className="w-4 h-4" strokeWidth={2} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Icono */}
          <div>
            <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5 block">Icono</label>
            <div className="grid grid-cols-7 gap-1.5">
              {ICONOS.map((name) => {
                const Icon = ICONO_MAP[name];
                const activo = iconoVal === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setValue("icono", activo ? null : name)}
                    className={clsx(
                      "aspect-square rounded-xl flex items-center justify-center transition-all",
                      activo
                        ? "bg-ink shadow-lg scale-110"
                        : "bg-surface-2 active:scale-95"
                    )}
                  >
                    <Icon
                      className={clsx("w-4 h-4", activo ? "text-[#C7FF6B]" : "text-fg-muted")}
                      strokeWidth={activo ? 2.5 : 2}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("color", colorVal === c ? null : c)}
                  className={clsx(
                    "w-8 h-8 rounded-full transition-all",
                    colorVal === c ? "ring-2 ring-offset-2 ring-fg scale-110" : "active:scale-95"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-ink text-white rounded-2xl py-3.5 font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {isSubmitting ? "Guardando…" : esEditar ? "Guardar cambios" : "Crear categoría"}
          </button>
        </form>
      </div>
    </div>
  );
}
