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

export interface Cuenta {
  id: string;
  workspace_id: string;
  nombre: string;
  tipo: string;
  moneda: string;
  saldo_inicial: string;
  fecha_saldo_inicial: string;
  emoji: string | null;
  color: string | null;
  institucion: string | null;
  iban_ultimos4: string | null;
  notas: string | null;
  incluir_en_patrimonio: boolean;
  orden: number;
  archivado_en: string | null;
  creado_en: string;
  saldo: string | null;
}

export interface Categoria {
  id: string;
  workspace_id: string;
  nombre: string;
  tipo: string;
  parent_id: string | null;
  emoji: string | null;
  color: string | null;
  orden: number;
  archivado_en: string | null;
  creado_en: string;
  hijos: Categoria[];
}

export interface Movimiento {
  id: string;
  workspace_id: string;
  cuenta_id: string;
  tipo: string;
  importe: string;
  moneda: string;
  importe_base: string;
  tasa_cambio: string;
  fecha: string;
  categoria_id: string | null;
  concepto: string;
  notas: string | null;
  transferencia_id: string | null;
  estado: string;
  fuente: string;
  hash_idempotencia: string | null;
  archivado_en: string | null;
  creado_por: string;
  creado_en: string;
  actualizado_en: string;
  categoria_emoji: string | null;
  categoria_nombre: string | null;
}

export interface Transferencia {
  id: string;
  workspace_id: string;
  movimiento_origen_id: string;
  movimiento_destino_id: string;
  creado_en: string;
  movimiento_origen: Movimiento | null;
  movimiento_destino: Movimiento | null;
}

export interface ResumenDashboard {
  saldo_total: string;
  moneda_base: string;
  ultimos_movimientos: Movimiento[];
}

export interface EstadoPresupuesto {
  consumido: string;
  restante: string;
  porcentaje: number;
  alerta: "ok" | "advertencia" | "superado";
  fecha_inicio: string;
  fecha_fin: string;
}

export interface Presupuesto {
  id: string;
  workspace_id: string;
  nombre: string;
  importe: string;
  moneda: string;
  periodo: string;
  modo: string;
  categoria_ids: string[];
  cuenta_ids: string[];
  orden: number;
  activo: boolean;
  creado_en: string;
  estado: EstadoPresupuesto;
}

export interface Recurrente {
  id: string;
  workspace_id: string;
  nombre: string;
  tipo: string;
  importe: string;
  moneda: string;
  cuenta_id: string;
  categoria_id: string | null;
  frecuencia: string;
  dia_mes: number | null;
  proxima_ejecucion: string;
  activo: boolean;
  notas: string | null;
  creado_en: string;
}
