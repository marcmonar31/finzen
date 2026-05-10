/**
 * Cliente Supabase para autenticación.
 *
 * Para activar la auth real:
 * 1. Crea un proyecto en supabase.com
 * 2. Activa "Google" en Authentication → Providers
 * 3. Copia las credenciales en frontend/.env:
 *    VITE_SUPABASE_URL=https://xxxx.supabase.co
 *    VITE_SUPABASE_ANON_KEY=eyJhbGci...
 * 4. En backend/.env añade:
 *    ENVIRONMENT=produccion
 *    SUPABASE_JWT_SECRET=tu-jwt-secret  (en Supabase → Settings → API → JWT Secret)
 *
 * En modo local (VITE_SUPABASE_URL no definida), el cliente es null
 * y la app usa el selector de usuario demo.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const IS_SUPABASE_ENABLED = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/** Obtiene el JWT del usuario actual (null si no hay sesión o modo local). */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
