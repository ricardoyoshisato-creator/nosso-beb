import { format, parseISO } from "date-fns";

import type { GrowthRecord } from "@/types/database";

export type GrowthMetric = "weight" | "height" | "head";

export const growthMetricMeta: {
  key: GrowthMetric;
  label: string;
  shortLabel: string;
  unit: "kg" | "cm";
  color: string;
  /** Campo correspondente no registro. */
  field: "weight" | "height" | "head_circumference";
}[] = [
  {
    key: "weight",
    label: "Peso",
    shortLabel: "Peso",
    unit: "kg",
    color: "#EB8B74",
    field: "weight",
  },
  {
    key: "height",
    label: "Altura",
    shortLabel: "Altura",
    unit: "cm",
    color: "#4F8F7F",
    field: "height",
  },
  {
    key: "head",
    label: "Perímetro cefálico",
    shortLabel: "Perímetro",
    unit: "cm",
    color: "#A78BC8",
    field: "head_circumference",
  },
];

export function growthMetricMetaOf(metric: GrowthMetric) {
  return growthMetricMeta.find((meta) => meta.key === metric) ?? growthMetricMeta[0];
}

/** Faixas aceitas no formulário (e nos checks da tabela). */
export const growthRanges = {
  weight: { min: 0.3, max: 60 },
  height: { min: 20, max: 140 },
  head: { min: 20, max: 70 },
} as const;

/** Medições em ordem cronológica (a mais antiga primeiro). */
export function sortGrowthRecords(records: GrowthRecord[]) {
  return [...records].sort((a, b) => a.measurement_date.localeCompare(b.measurement_date));
}

export function latestGrowthRecord(records: GrowthRecord[]) {
  const sorted = sortGrowthRecords(records);
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
}

export function firstGrowthRecord(records: GrowthRecord[]) {
  const sorted = sortGrowthRecords(records);
  return sorted.length > 0 ? sorted[0] : null;
}

export type GrowthChartPoint = {
  date: string;
  label: string;
  weight: number | null;
  height: number | null;
  head: number | null;
};

/** Séries do gráfico: uma linha por medição, com rótulo curto no eixo X. */
export function growthChartData(records: GrowthRecord[]): GrowthChartPoint[] {
  return sortGrowthRecords(records).map((record) => ({
    date: record.measurement_date,
    label: format(parseISO(record.measurement_date), "dd/MM/yy"),
    weight: record.weight,
    height: record.height,
    head: record.head_circumference,
  }));
}

/** "4,25 kg" / "55,5 cm" a partir da métrica. */
export function formatGrowthValue(metric: GrowthMetric, value?: number | null) {
  if (value === null || value === undefined) return "—";
  const meta = growthMetricMetaOf(metric);
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${meta.unit}`;
}

/** Diferença entre a primeira e a última medição de uma métrica. */
export function growthDelta(records: GrowthRecord[], metric: GrowthMetric) {
  const meta = growthMetricMetaOf(metric);
  const sorted = sortGrowthRecords(records).filter((record) => record[meta.field] !== null);
  if (sorted.length < 2) return null;

  const first = sorted[0][meta.field];
  const last = sorted[sorted.length - 1][meta.field];
  if (first === null || last === null) return null;

  return Math.round((Number(last) - Number(first)) * 100) / 100;
}
