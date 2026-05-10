import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  InsightPrediccion, InsightSuscripcion, InsightHormiga,
  InsightAnomalia, InsightSalud,
} from "@/types/api";

interface InsightsCompletos {
  prediccion: InsightPrediccion[];
  suscripciones: InsightSuscripcion[];
  gastos_hormiga: InsightHormiga[];
  anomalias: InsightAnomalia[];
  salud: InsightSalud;
}

export function useInsights() {
  return useQuery<InsightsCompletos>({
    queryKey: ["insights"],
    queryFn: () => api.get("/insights"),
    staleTime: 5 * 60 * 1000, // 5 min — insights no cambian en tiempo real
  });
}
