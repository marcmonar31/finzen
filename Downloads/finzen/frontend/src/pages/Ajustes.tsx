import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Plane, Shield, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import type { ModoViajeOut } from "@/types/api";
import { useWorkspaceStore } from "@/stores/workspace";

// ── Modo Emergencia ────────────────────────────────────────────────────────────

function ModoEmergencia() {
  const qc = useQueryClient();
  const { data } = useQuery<{ activo: boolean }>({
    queryKey: ["modo-emergencia"],
    queryFn: () => api.get("/modos/emergencia"),
  });
  const toggle = useMutation({
    mutationFn: (activo: boolean) => api.patch("/modos/emergencia", { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modo-emergencia"] }),
  });

  const activo = data?.activo ?? false;

  return (
    <div className={clsx(
      "rounded-2xl p-4 shadow-sm transition-colors",
      activo ? "bg-red-50 border border-red-200" : "bg-white"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex gap-3 items-center">
          <div className={clsx("p-2 rounded-xl", activo ? "bg-red-100" : "bg-gray-100")}>
            <Shield size={20} className={activo ? "text-red-600" : "text-gray-500"} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Modo Emergencia</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {activo ? "Activo — sólo gastos esenciales" : "Desactivado"}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            toggle.mutateAsync(!activo)
              .then(() => toast.success(activo ? "Modo emergencia desactivado" : "Modo emergencia activado"))
              .catch(() => toast.error("Error al cambiar el modo"));
          }}
          disabled={toggle.isPending}
          className={clsx(
            "relative w-12 h-6 rounded-full transition-colors focus:outline-none",
            activo ? "bg-red-500" : "bg-gray-200"
          )}
        >
          <span
            className={clsx(
              "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
              activo ? "translate-x-6" : "translate-x-0"
            )}
          />
        </button>
      </div>
      {activo && (
        <p className="mt-3 text-xs text-red-600 bg-red-100 rounded-xl px-3 py-2">
          El modo emergencia te recuerda evitar gastos no esenciales. No bloquea ninguna funcionalidad.
        </p>
      )}
    </div>
  );
}

// ── Nuevo Viaje Sheet ─────────────────────────────────────────────────────────

function NuevoViajeSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split("T")[0]);
  const [fechaFin, setFechaFin] = useState("");

  const crear = useMutation({
    mutationFn: (data: { nombre: string; fecha_inicio: string; fecha_fin?: string }) =>
      api.post<ModoViajeOut>("/modos/viaje", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modos-viaje"] });
      toast.success("Modo viaje creado");
      onClose();
    },
    onError: () => toast.error("Error al crear el viaje"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Nuevo viaje</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nombre del viaje</label>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              placeholder="Tokyo 2026"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Inicio</label>
              <input
                type="date"
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Fin (opcional)</label>
              <input
                type="date"
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => crear.mutate({ nombre, fecha_inicio: fechaInicio, fecha_fin: fechaFin || undefined })}
          disabled={!nombre || crear.isPending}
          className="mt-5 w-full bg-indigo-600 text-white py-3 rounded-2xl font-medium text-sm disabled:opacity-50"
        >
          {crear.isPending ? "Guardando..." : "Crear viaje"}
        </button>
      </div>
    </div>
  );
}

// ── Modos Viaje ───────────────────────────────────────────────────────────────

function ModosViaje() {
  const qc = useQueryClient();
  const { data: viajes = [] } = useQuery<ModoViajeOut[]>({
    queryKey: ["modos-viaje"],
    queryFn: () => api.get("/modos/viaje"),
  });
  const eliminar = useMutation({
    mutationFn: (id: string) => api.delete(`/modos/viaje/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modos-viaje"] });
      toast.success("Viaje eliminado");
    },
  });
  const [showSheet, setShowSheet] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Plane size={18} className="text-indigo-500" />
          <h2 className="font-semibold text-gray-900">Modos Viaje</h2>
        </div>
        <button onClick={() => setShowSheet(true)} className="text-indigo-600 text-sm font-medium flex items-center gap-1">
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {viajes.length === 0 && (
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <p className="text-gray-400 text-sm">Sin viajes registrados</p>
        </div>
      )}

      <div className="space-y-2">
        {viajes.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">{v.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {v.fecha_inicio} {v.fecha_fin ? `→ ${v.fecha_fin}` : "(en curso)"}
              </p>
            </div>
            <button
              onClick={() => {
                if (!confirm("¿Eliminar este viaje?")) return;
                eliminar.mutate(v.id);
              }}
              className="text-gray-300 hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {showSheet && <NuevoViajeSheet onClose={() => setShowSheet(false)} />}
    </div>
  );
}

// ── Cierre Mensual ─────────────────────────────────────────────────────────────

function CierreResumen() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const { data, isLoading } = useQuery({
    queryKey: ["cierre", anio, mes],
    queryFn: () => api.get<{
      ingresos: string; gastos: string; balance: string; tasa_ahorro: string;
      num_movimientos: number;
      top_categorias: { nombre: string; total: string; pct: string }[];
      vs_mes_anterior: { variacion_gastos_pct: string | null; variacion_ingresos_pct: string | null };
    }>(`/cierre/${anio}/${mes}`),
  });

  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function prevMes() {
    if (mes === 1) { setAnio(a => a - 1); setMes(12); } else setMes(m => m - 1);
  }
  function nextMes() {
    if (mes === 12) { setAnio(a => a + 1); setMes(1); } else setMes(m => m + 1);
  }

  const balance = data ? parseFloat(data.balance) : 0;

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-3">Cierre mensual</h2>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        {/* Selector mes */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMes} className="text-gray-400 hover:text-gray-600 px-2 py-1">‹</button>
          <p className="font-medium text-gray-900">{MESES[mes - 1]} {anio}</p>
          <button
            onClick={nextMes}
            disabled={anio === hoy.getFullYear() && mes === hoy.getMonth() + 1}
            className="text-gray-400 hover:text-gray-600 px-2 py-1 disabled:opacity-30"
          >›</button>
        </div>

        {isLoading && <p className="text-center text-gray-400 text-sm py-4">Cargando...</p>}

        {data && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-emerald-600">Ingresos</p>
                <p className="font-bold text-emerald-700">{parseFloat(data.ingresos).toFixed(0)}€</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-500">Gastos</p>
                <p className="font-bold text-red-600">{parseFloat(data.gastos).toFixed(0)}€</p>
              </div>
              <div className={clsx("rounded-xl p-3", balance >= 0 ? "bg-indigo-50" : "bg-orange-50")}>
                <p className={clsx("text-xs", balance >= 0 ? "text-indigo-500" : "text-orange-500")}>Balance</p>
                <p className={clsx("font-bold", balance >= 0 ? "text-indigo-700" : "text-orange-600")}>
                  {balance >= 0 ? "+" : ""}{balance.toFixed(0)}€
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Tasa de ahorro</span>
              <span className={clsx("font-semibold", parseFloat(data.tasa_ahorro) >= 20 ? "text-emerald-600" : "text-gray-700")}>
                {data.tasa_ahorro}%
              </span>
            </div>

            {data.top_categorias.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Top gastos por categoría</p>
                <div className="space-y-1.5">
                  {data.top_categorias.map((c) => (
                    <div key={c.nombre} className="flex justify-between items-center">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-gray-600">{c.nombre}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-indigo-400 h-1.5 rounded-full"
                            style={{ width: `${Math.min(parseFloat(c.pct), 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-700 ml-2">{parseFloat(c.total).toFixed(0)}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.vs_mes_anterior.variacion_gastos_pct && (
              <p className="text-xs text-gray-400">
                Gastos vs mes anterior:{" "}
                <span className={clsx(
                  "font-medium",
                  parseFloat(data.vs_mes_anterior.variacion_gastos_pct) <= 0 ? "text-emerald-600" : "text-red-500"
                )}>
                  {parseFloat(data.vs_mes_anterior.variacion_gastos_pct) > 0 ? "+" : ""}
                  {data.vs_mes_anterior.variacion_gastos_pct}%
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Workspace Info ─────────────────────────────────────────────────────────────

function WorkspaceInfo() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  if (!workspace) return null;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <p className="font-semibold text-gray-900">
        {workspace.emoji} {workspace.nombre}
      </p>
      <p className="text-xs text-gray-400 mt-1">Moneda base: {workspace.moneda_base}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Ajustes() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Ajustes</h1>

        <div className="space-y-6">
          <WorkspaceInfo />
          <ModoEmergencia />
          <ModosViaje />
          <CierreResumen />
        </div>
      </div>
    </div>
  );
}
