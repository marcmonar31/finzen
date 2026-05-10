export interface Usuario {
  id: string;
  usuario_unico: string;
  nombre: string;
  email: string | null;
  avatar_emoji: string;
  creado_en: string;
}

export interface Workspace {
  id: string;
  nombre: string;
  descripcion: string | null;
  emoji: string;
  moneda_base: string;
  owner_id: string;
  creado_en: string;
  rol?: string;
}
