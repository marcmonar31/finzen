import { useState } from "react";
import { Tag, Plus, ChevronDown, ChevronRight, Pencil, Trash2, PlusCircle } from "lucide-react";
import { clsx } from "clsx";
import { useCategoriasArbol, useArchivarCategoria } from "@/hooks/useCategorias";
import { NuevaCategoriaSheet } from "@/components/NuevaCategoriaSheet";
import { ICONO_MAP } from "@/lib/iconos";
import { showFlash } from "@/stores/flash";
import type { Categoria } from "@/types/api";

type Tipo = "gasto" | "ingreso" | "transferencia";

const TABS: { id: Tipo; label: string; emoji: string }[] = [
  { id: "gasto",         label: "Gastos",        emoji: "💸" },
  { id: "ingreso",       label: "Ingresos",      emoji: "💰" },
  { id: "transferencia", label: "Transfer.",     emoji: "🔄" },
];

function CategoriaRow({
  cat,
  onEdit,
  onAddSub,
  onDelete,
}: {
  cat: Categoria;
  onEdit: (c: Categoria) => void;
  onAddSub: (parentId: string, tipo: Tipo) => void;
  onDelete: (c: Categoria) => void;
}) {
  const [expandido, setExpandido] = useState(true);
  const tieneHijos = cat.hijos.length > 0;

  return (
    <div className="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      {/* Fila padre */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Toggle expand */}
        <button
          onClick={() => tieneHijos && setExpandido((v) => !v)}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
        >
          {tieneHijos ? (
            expandido
              ? <ChevronDown className="w-4 h-4 text-fg-muted" />
              : <ChevronRight className="w-4 h-4 text-fg-muted" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-fg/20 block" />
          )}
        </button>

        {/* Icono + color dot */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: cat.color ? `${cat.color}22` : undefined }}
        >
          {(() => { const Icon = cat.emoji ? ICONO_MAP[cat.emoji] : null; return Icon ? <Icon className="w-4 h-4" style={{ color: cat.color ?? undefined }} strokeWidth={2} /> : <Tag className="w-4 h-4 text-fg-muted" />; })()}
        </div>

        {/* Nombre + badge hijos */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-fg text-sm truncate">{cat.nombre}</p>
          {tieneHijos && (
            <p className="text-xs text-fg-muted">{cat.hijos.length} subcategoría{cat.hijos.length !== 1 ? "s" : ""}</p>
          )}
        </div>

        {/* Color pill */}
        {cat.color && (
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
        )}

        {/* Acciones */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onAddSub(cat.id, cat.tipo as Tipo)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-2 active:scale-90 transition-transform"
            title="Añadir subcategoría"
          >
            <PlusCircle className="w-3.5 h-3.5 text-fg-muted" />
          </button>
          <button
            onClick={() => onEdit(cat)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-2 active:scale-90 transition-transform"
          >
            <Pencil className="w-3.5 h-3.5 text-fg-muted" />
          </button>
          <button
            onClick={() => onDelete(cat)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 active:scale-90 transition-transform"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Subcategorías */}
      {tieneHijos && expandido && (
        <div className="border-t border-fg/5">
          {cat.hijos.map((hijo, idx) => (
            <div
              key={hijo.id}
              className={clsx(
                "flex items-center gap-3 px-4 py-2.5 pl-14",
                idx < cat.hijos.length - 1 && "border-b border-fg/5"
              )}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: hijo.color ? `${hijo.color}22` : cat.color ? `${cat.color}15` : undefined }}
              >
                {(() => { const iconName = hijo.emoji ?? cat.emoji; const Icon = iconName ? ICONO_MAP[iconName] : null; const color = hijo.color ?? cat.color; return Icon ? <Icon className="w-3.5 h-3.5" style={{ color: color ?? undefined }} strokeWidth={2} /> : <Tag className="w-3.5 h-3.5 text-fg-muted" />; })()}
              </div>
              <p className="flex-1 text-sm text-fg truncate">{hijo.nombre}</p>
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(hijo)}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-surface-2 active:scale-90 transition-transform"
                >
                  <Pencil className="w-3 h-3 text-fg-muted" />
                </button>
                <button
                  onClick={() => onDelete(hijo)}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-red-500/10 active:scale-90 transition-transform"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Categorias() {
  const [tab, setTab]           = useState<Tipo>("gasto");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editando, setEditando]   = useState<Categoria | null>(null);
  const [parentId, setParentId]   = useState<string | null>(null);
  const [tipoForzado, setTipoForzado] = useState<Tipo | undefined>(undefined);

  const { data: arbol = [], isLoading } = useCategoriasArbol();
  const archivar = useArchivarCategoria();

  const categoriasFiltradas = arbol.filter((c) => c.tipo === tab && !c.parent_id);

  function abrirNueva() {
    setEditando(null);
    setParentId(null);
    setTipoForzado(tab);
    setSheetOpen(true);
  }

  function abrirNuevaSub(pid: string, tipo: Tipo) {
    setEditando(null);
    setParentId(pid);
    setTipoForzado(tipo);
    setSheetOpen(true);
  }

  function abrirEditar(cat: Categoria) {
    setEditando(cat);
    setParentId(null);
    setTipoForzado(undefined);
    setSheetOpen(true);
  }

  async function handleDelete(cat: Categoria) {
    const tieneHijos = (cat.hijos?.length ?? 0) > 0;
    if (tieneHijos) {
      showFlash("Archiva o borra las subcategorías primero", "error");
      return;
    }
    try {
      await archivar.mutateAsync(cat.id);
      showFlash("Categoría eliminada", "delete");
    } catch (e: unknown) {
      const msg = (e as { detail?: string })?.detail;
      showFlash(msg ?? "No se puede eliminar (tiene movimientos asignados)", "error");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header */}
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <h1 className="text-white font-bold text-2xl">Categorías</h1>
          <button
            onClick={abrirNueva}
            className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 text-fg" />
          </button>
        </div>
      </div>

      {/* Tabs tipo */}
      <div className="px-4 mb-4">
        <div className="bg-surface rounded-2xl p-1 flex gap-1 shadow-[var(--shadow-card)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all",
                tab === t.id ? "bg-ink text-white shadow-sm" : "text-fg-muted active:bg-surface-2"
              )}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="px-4 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-fg/10" />
                  <div className="flex-1">
                    <div className="h-4 bg-fg/10 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-fg/5 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && categoriasFiltradas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center mb-4">
              <Tag className="w-8 h-8 text-fg-muted" />
            </div>
            <p className="font-bold text-fg mb-1">Sin categorías</p>
            <p className="text-fg-muted text-sm mb-5">Crea tu primera categoría para organizar tus movimientos</p>
            <button
              onClick={abrirNueva}
              className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              Crear categoría
            </button>
          </div>
        )}

        {categoriasFiltradas.map((cat) => (
          <CategoriaRow
            key={cat.id}
            cat={cat}
            onEdit={abrirEditar}
            onAddSub={abrirNuevaSub}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <NuevaCategoriaSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditando(null); setParentId(null); }}
        categoria={editando}
        parentId={parentId}
        tipoForzado={tipoForzado}
      />
    </div>
  );
}
