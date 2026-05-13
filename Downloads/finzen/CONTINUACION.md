# Finzen — Continuación de trabajo

> Última sesión: 2026-05-13
> Repo: https://github.com/marcmonar31/finzen

---

## Cómo arrancar

```bash
# Backend
cd backend
pip install -r requirements.txt   # si es equipo nuevo
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# Frontend
cd frontend
npm install                        # si es equipo nuevo
npm run dev
```

Auth simulada: el backend usa cabecera `X-User-Id` y `X-Workspace-Id` (modo local, sin JWT real).

---

## Estado actual — qué está hecho

### Páginas pulidas (design system consistente)
| Página | Estado |
|--------|--------|
| Reglas | ✅ Reescrita completa |
| Amigos | ✅ Live search, blur modals, BETA badge |
| Grupos | ✅ AppIcon picker, editar/eliminar grupo, BETA badge |
| GrupoDetalle | ✅ Rounded card header, settings button, EditarGrupoModal |
| Deudas | ✅ Header, iconos, modal centrado, skeleton, saldo pendiente real |

### Páginas pendientes de pulir
- **Inversiones** — pendiente
- **Insights** — pendiente
- **Objetivos** — revisar (puede que ya esté bien)
- **Presupuestos** — revisar
- **Dashboard** — revisar

---

## Design system — reglas que seguir

### Colores / tokens
- `bg-surface`, `bg-surface-2`, `bg-ink`, `bg-app`
- `text-fg`, `text-fg-muted`, `text-fg-subtle`
- Verde: `#5BAA1F` | Rojo: `#FF5C5C` | Lima: `#C7FF6B`
- Sombras: `shadow-[var(--shadow-card)]` / `shadow-[var(--shadow-floating)]`

### Patrón de header (todas las páginas)
```tsx
<div className="pt-10 px-4 pb-4">
  <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
    <div>
      <h1 className="text-white font-bold text-2xl">{título}</h1>
      <p className="text-white/50 text-xs mt-0.5">{subtítulo}</p>
    </div>
    <button className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform">
      <Plus className="w-4 h-4 text-fg" />
    </button>
  </div>
</div>
```

### Patrón de modal centrado con blur
```tsx
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
```

### Patrón de empty state
```tsx
<div className="flex flex-col items-center py-16 text-center">
  <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center mb-4">
    <IconLucide className="w-8 h-8 text-fg-muted" />
  </div>
  <p className="font-bold text-fg mb-1">{título}</p>
  <p className="text-fg-muted text-sm mb-6">{desc}</p>
  <button className="bg-ink text-white rounded-2xl px-6 py-3 text-sm font-semibold">
    {cta}
  </button>
</div>
```

### Patrón de skeleton
```tsx
{isLoading && (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-2 rounded w-1/2" />
            <div className="h-3 bg-surface-2 rounded w-1/3" />
          </div>
        </div>
      </div>
    ))}
  </div>
)}
```

### Inputs en modales (sin borde)
```tsx
<input className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none" />
```

### NO usar nunca
- Emojis hardcodeados (usar Lucide icons)
- `border border-gray-200` en inputs
- `bg-black/50` opaco en overlays (usar `backdrop-blur-md`)
- `rounded-b-3xl` en headers (estilo banner viejo)
- Texto plano como estado de carga

---

## AppIcon — iconos disponibles

Archivo: `frontend/src/components/AppIcon.tsx`
34 iconos registrados. Usar `ICON_LIST` y `ICON_MAP` para pickers.
Iconos nuevos añadidos: `handshake`, `users`, `trophy`, `gamepad2`, `party-popper`, `pizza`, `dog`, `sun`, `shopping-bag`, `bike`, `dumbbell`, `book-open`, `film`

---

## i18n

3 archivos: `frontend/src/i18n/es.json`, `en.json`, `uk.json`
**Siempre añadir claves nuevas a los 3 archivos a la vez.**

---

## Backend — endpoints relevantes añadidos esta sesión

- `PATCH /grupos/{id}` — editar nombre e icono
- `DELETE /grupos/{id}` — eliminar grupo (solo creador, archiva)
- `GET /deudas` — ahora incluye campo `saldo_pendiente` calculado

### Bug corregido
`_cuotas_frances` en `backend/routers/deudas.py`: el `replace(day=dia_cuota)` petaba en meses cortos (febrero con `dia_cuota=30`). Corregido con `_dia_seguro()` que recorta al último día válido del mes.

---

## Navegación (MinimizableShell)

Badges BETA activos en: `amigos`, `grupos`
Para añadir BETA a una sección: `beta: true` en el array `SECTION_IDS`.

---

## Próximos pasos sugeridos

1. Pulir **Inversiones** (mismo checklist que Deudas)
2. Pulir **Insights**
3. Revisar **Dashboard** y **Presupuestos**
4. Selector de tipo de deuda → botones pill (quedó pendiente como paso 8 de Deudas)
5. Página `/clinicas` para Vemacode (proyecto paralelo)
