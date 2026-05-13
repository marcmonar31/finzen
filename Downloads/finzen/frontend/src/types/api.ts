export interface Usuario {
  id: string;
  usuario_unico: string;
  nombre: string;
  email: string | null;
  avatar_emoji: string;
  avatar_color: string;
  foto_data: string | null;
  ocultar_importes: boolean;
  tema: "claro" | "oscuro";
  idioma: "es" | "en" | "uk";
  formato_fecha: string;
  primer_dia_mes: number;
  primer_dia_semana: string;
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
  num_movimientos: number;
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
  cuenta_nombre: string | null;
  cuenta_contraparte_nombre: string | null;
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

// ─── Bloque 5: Amigos y grupos compartidos ───────────────────────────────────

export interface AmigoOut {
  id: string;
  usuario_id: string;
  nombre: string;
  usuario_unico: string;
  avatar_emoji: string;
  estado: "pendiente" | "aceptado";
  soy_solicitante: boolean;
}

export interface AmigoExternoOut {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  usuario_real_id: string | null;
  creado_en: string;
}

export interface GrupoMiembroOut {
  id: string;
  grupo_id: string;
  usuario_id: string | null;
  externo_id: string | null;
  nombre_display: string;
  rol: string;
  activo: boolean;
}

export interface GrupoOut {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string | null;
  moneda_principal: string;
  es_cuenta_real: boolean;
  cuenta_id: string | null;
  modo_reparto_default: string;
  creado_por: string;
  creado_en: string;
  cerrado_en: string | null;
  miembros: GrupoMiembroOut[];
}

export interface GastoRepartoOut {
  id: string;
  miembro_id: string;
  importe_asignado: string;
  partes: number | null;
  porcentaje: string | null;
}

export interface GastoCompartidoOut {
  id: string;
  grupo_id: string;
  concepto: string;
  importe: string;
  moneda: string;
  importe_convertido: string;
  tasa_cambio: string;
  fecha: string;
  categoria_id: string | null;
  pagador_id: string;
  modo_reparto: string;
  afecta_cuenta_personal: boolean;
  movimiento_id: string | null;
  creado_por: string;
  creado_en: string;
  repartos: GastoRepartoOut[];
}

export interface LiquidacionOut {
  id: string;
  grupo_id: string;
  de_miembro_id: string;
  a_miembro_id: string;
  importe: string;
  moneda: string;
  movimiento_pago_id: string | null;
  movimiento_cobro_id: string | null;
  estado: "pendiente" | "confirmada" | "rechazada";
  creado_en: string;
  confirmado_en: string | null;
}

export interface BalanceGrupoOut {
  balance: Record<string, string>;
  transferencias_optimas: Array<{ de: string; a: string; importe: string }>;
}

// ─── Bloque 6: Motor de reglas ────────────────────────────────────────────────

export interface ReglaOut {
  id: string;
  workspace_id: string;
  nombre: string;
  descripcion: string | null;
  trigger_tipo: string;
  trigger_config: Record<string, unknown>;
  condiciones: Array<Record<string, unknown>>;
  modo_condiciones: "AND" | "OR";
  acciones: Array<Record<string, unknown>>;
  activa: boolean;
  orden: number;
  max_ejecuciones_mes: number | null;
  ultima_ejecucion: string | null;
  creado_en: string;
}

// ─── Bloque 7: Objetivos, Deudas, Insights ───────────────────────────────────

export interface ObjetivoOut {
  id: string;
  workspace_id: string;
  nombre: string;
  descripcion: string | null;
  emoji: string;
  importe_objetivo: string;
  moneda: string;
  fecha_objetivo: string | null;
  cuenta_id: string | null;
  activo: boolean;
  creado_en: string;
  importe_aportado: string;
  porcentaje: number;
  falta: string;
}

export interface AportacionOut {
  id: string;
  objetivo_id: string;
  importe: string;
  moneda: string;
  fecha: string;
  concepto: string | null;
  movimiento_id: string | null;
  creado_en: string;
}

export interface DeudaOut {
  id: string;
  workspace_id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  importe_total: string;
  moneda: string;
  tasa_interes_anual: string;
  num_cuotas: number | null;
  importe_cuota: string | null;
  fecha_inicio: string;
  dia_cuota: number;
  cuenta_id: string | null;
  activa: boolean;
  creado_en: string;
}

export interface CuotaOut {
  numero: number;
  fecha: string;
  importe: string;
  capital: string;
  intereses: string;
  saldo_pendiente: string;
}

export interface InsightPrediccion {
  dias: number;
  fecha: string;
  saldo_proyectado: string;
  impacto_recurrentes: string;
  gasto_proyectado: string;
}

export interface InsightSuscripcion {
  concepto: string;
  concepto_normalizado: string;
  importe_medio: string;
  moneda: string;
  num_ocurrencias: number;
  ultima_fecha: string;
  categoria_id: string | null;
}

export interface InsightHormiga {
  concepto: string;
  num_ocurrencias_mes: number;
  total_mes: string;
  importe_medio: string;
  moneda: string;
}

export interface InsightAnomalia {
  movimiento_id: string;
  concepto: string;
  importe: string;
  moneda: string;
  importe_base: string;
  media_categoria: string;
  factor: string;
  fecha: string;
  categoria_id: string | null;
}

export interface FactorSalud {
  nombre: string;
  descripcion: string;
  puntos: number;
  max_puntos: number;
}

export interface InsightSalud {
  score: number;
  nivel: "excelente" | "bueno" | "regular" | "mejorable";
  factores: FactorSalud[];
  calculado_en: string;
}

export interface ReglaEjecucionOut {
  id: string;
  regla_id: string;
  trigger_movimiento_id: string | null;
  estado: "exito" | "error" | "omitida" | "simulacion";
  movimientos_creados_ids: string[];
  razon_omision: string | null;
  error: string | null;
  ejecutado_en: string;
}

// ─── Bloque 8: Inversiones, Modos, Cierre ────────────────────────────────────

export interface ActivoOut {
  id: string;
  workspace_id: string;
  ticker: string;
  nombre: string;
  tipo: string;
  moneda: string;
  creado_en: string;
}

export interface PosicionOut {
  id: string;
  workspace_id: string;
  activo_id: string;
  cantidad: string;
  precio_medio: string;
  moneda: string;
  cuenta_id: string | null;
  activa: boolean;
  creado_en: string;
}

export interface ResumenCartera {
  total_coste: string;
  total_actual: string;
  pl_total: string;
  pl_pct_total: string;
  posiciones: PosicionDetalle[];
}

export interface PosicionDetalle {
  posicion_id: string;
  activo_id: string;
  ticker: string;
  nombre: string;
  tipo: string;
  cantidad: string;
  precio_medio: string;
  precio_actual: string | null;
  moneda: string;
  variacion_dia: string | null;
  actualizado_en: string | null;
  valor_coste: string;
  valor_actual: string;
  pl_absoluto: string;
  pl_pct: string;
}

export interface ModoViajeOut {
  id: string;
  workspace_id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  etiqueta_id: string | null;
  activo: boolean;
  creado_en: string;
}

export interface TopCategoria {
  categoria_id: string | null;
  nombre: string;
  total: string;
  pct: string;
}

export interface CierreMensual {
  anio: number;
  mes: number;
  ingresos: string;
  gastos: string;
  balance: string;
  tasa_ahorro: string;
  num_movimientos: number;
  top_categorias: TopCategoria[];
  vs_mes_anterior: {
    gastos_anterior: string;
    ingresos_anterior: string;
    variacion_gastos_pct: string | null;
    variacion_ingresos_pct: string | null;
  };
}
