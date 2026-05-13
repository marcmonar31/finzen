# Finzen — Estado del proyecto

Última sesión: 2026-05-14

---

## ✅ Completado hasta ahora

### Backend
- **QA completo** de todos los módulos: cuentas, movimientos, transferencias, presupuestos, recurrentes, objetivos, reglas, amigos, grupos, deudas, inversiones, insights, cierre, modos viaje, workspaces, usuarios, categorías, etiquetas
- **Validators Pydantic v2** en todos los schemas (nombres vacíos, importes, monedas, enums)
- **Soft delete** consistente (`archivado_en`) con checks en PATCH y DELETE
- **Aislamiento por workspace** verificado en todos los routers
- **Seed limpio**: 3 usuarios demo (Martín, María, Pedro), 3 workspaces personales, sin Familia García
- **Auth real** (`auth/real.py`): JWT Supabase → crea usuario+workspace al primer login
- **Iconos en lugar de emojis**: `workspace_defaults.py` usa nombres de iconos Lucide (home, briefcase, utensils…)

### Frontend
- **Módulo Categorías** (posición 6 en nav, entre Presupuestos y Recurrentes):
  - Página con tabs Gastos / Ingresos / Transferencias
  - Árbol expandible con subcategorías
  - Sheet crear/editar con icon picker (35 iconos Lucide) y color picker
  - Hook CRUD completo (`useCategorias.ts`)
  - `ICONO_MAP` en `src/lib/iconos.ts` — fuente única para icono→componente
- **Auth screen** completamente rediseñada:
  - Welcome: fondo negro, destello verde radial, headline grande, botones compactos
  - Tagline: *"No es cuánto ganas. Es cuánto controlas."*
  - Login: email + contraseña con ver/ocultar, recuperar contraseña
  - Registro: nombre + email + contraseña con barra de fuerza + confirmar
  - OTP: 6 cajas de dígito con auto-avance, pegar código directo, reenvío
  - Persistencia de pantalla en `sessionStorage` (si el usuario sale y vuelve, recupera el paso)
- **FlashOverlay**: fondo oscuro fijo (`#1a1a1a`) — ya no sale blanco en pantallas negras
- **ESLint 0 warnings**
- **TypeScript sin errores**

### Infraestructura
- **Supabase conectado**: proyecto `oeobienlydxproporxka.supabase.co`
- **PWA configurado**: `vite-plugin-pwa` con manifest, se puede instalar desde el navegador móvil
- **`.env` configurados** (backend y frontend, fuera de git)

---

## 🔧 Pendiente / siguiente sesión

### Inmediato
- [ ] **Email OTP en Supabase**: ir a Authentication → Email Templates → "Confirm signup" y reemplazar el body con `{{ .Token }}` para que llegue el código numérico en lugar del link
- [ ] **SMTP personalizado** (opcional, si hay rate limit): configurar Resend en Supabase → Project Settings → Auth → SMTP (host: `smtp.resend.com`, port: 465, user: `resend`)
- [ ] Probar registro completo en móvil con OTP funcionando

### Próximas features
- [ ] **Modo empresa**: workspace tipo "empresa", perfil fiscal (NIF, tipo sociedad, régimen IVA), módulo IVA trimestral, transferencias cross-workspace personal↔empresa
- [ ] **Deploy producción**: Vercel (frontend) + Railway (backend) + Supabase Postgres (en lugar de SQLite)
- [ ] Ajustes: editar nombre/email/avatar del usuario autenticado (ahora se toma del JWT)
- [ ] Onboarding post-registro: wizard para configurar moneda base y nombre del workspace

### Deuda técnica menor
- Limpiar imports no usados en algunos componentes shadcn
- `LockScreen`: revisar orden de declaración de `tryBiometric`

---

## 🗂️ Estructura de archivos clave

```
frontend/src/
  lib/iconos.ts              ← ICONO_MAP (35 iconos Lucide)
  pages/Auth.tsx             ← Auth completa (Welcome/Login/Register/OTP/Forgot)
  pages/Categorias.tsx       ← Módulo categorías con árbol
  components/
    NuevaCategoriaSheet.tsx  ← Sheet crear/editar categoría
    FlashOverlay.tsx         ← Notificaciones globales (fondo oscuro)
  hooks/useCategorias.ts     ← CRUD categorías

backend/
  auth/real.py               ← JWT Supabase → crea usuario en BD
  services/workspace_defaults.py  ← Categorías y cuentas por defecto (con nombres de iconos)
  .env                       ← ENVIRONMENT=produccion + credenciales Supabase (NO en git)

frontend/.env                ← VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (NO en git)
```

---

## 🔑 Credenciales (NO subir a git)

- Supabase URL: `https://oeobienlydxproporxka.supabase.co`
- Los `.env` están en `.gitignore` ✅

---

## 📱 Acceso local en móvil

Con backend y frontend corriendo:
- Frontend: `http://192.168.1.198:5173` (misma WiFi)
- Backend: `http://192.168.1.198:8000`

Comandos para arrancar:
```bash
# Backend
cd backend && source venv/bin/activate && uvicorn main:app --port 8000 --reload --host 0.0.0.0

# Frontend
cd frontend && npm run dev -- --host
```
