import { differenceInCalendarDays, parseISO } from "date-fns";

import { todayISO } from "@/lib/baby";
import type { Vaccine } from "@/types/database";

export type VaccineStatus = "applied" | "late" | "upcoming";

/**
 * Regra visual das vacinas:
 * - `applied`  → tem `applied_date` (verde)
 * - `late`     → sem `applied_date` e `expected_date` já passou (vermelho)
 * - `upcoming` → previsão para hoje ou para o futuro
 */
export function vaccineStatus(vaccine: Vaccine): VaccineStatus {
  if (vaccine.applied_date) return "applied";

  if (vaccine.expected_date && vaccine.expected_date < todayISO()) return "late";

  return "upcoming";
}

export const vaccineStatusMeta: Record<
  VaccineStatus,
  { label: string; badge: string; dot: string; card: string }
> = {
  applied: {
    label: "Aplicada",
    badge: "bg-mint/70 text-[hsl(164,34%,22%)]",
    dot: "bg-mint text-mint-foreground ring-4 ring-mint/30",
    card: "border-mint/60 bg-mint/15",
  },
  late: {
    label: "Atrasada",
    badge: "bg-destructive/15 text-destructive",
    dot: "bg-destructive text-destructive-foreground ring-4 ring-destructive/20",
    card: "border-destructive/45 bg-destructive/10",
  },
  upcoming: {
    label: "Prevista",
    badge: "bg-lavender/70 text-lavender-foreground",
    dot: "bg-lavender text-lavender-foreground ring-4 ring-lavender/30",
    card: "border-border bg-card",
  },
};

/** Data que posiciona a vacina na linha do tempo. */
export function vaccineReferenceDate(vaccine: Vaccine) {
  return vaccine.applied_date ?? vaccine.expected_date ?? "";
}

/** Linha do tempo ordenada da data mais antiga para a mais recente. */
export function sortVaccines(vaccines: Vaccine[]) {
  return [...vaccines].sort((a, b) => {
    const first = vaccineReferenceDate(a);
    const second = vaccineReferenceDate(b);
    if (!first) return 1;
    if (!second) return -1;
    return first.localeCompare(second);
  });
}

/** Dias de atraso (0 quando não está atrasada). */
export function vaccineDaysLate(vaccine: Vaccine) {
  if (vaccineStatus(vaccine) !== "late" || !vaccine.expected_date) return 0;
  return Math.abs(differenceInCalendarDays(parseISO(vaccine.expected_date), new Date()));
}

export function vaccineSummary(vaccines: Vaccine[]) {
  return vaccines.reduce(
    (totals, vaccine) => {
      const status = vaccineStatus(vaccine);
      totals[status] += 1;
      return totals;
    },
    { applied: 0, late: 0, upcoming: 0 },
  );
}

/** Próxima vacina prevista (a mais próxima de hoje, ainda não aplicada). */
export function nextVaccine(vaccines: Vaccine[]) {
  return (
    vaccines
      .filter((vaccine) => !vaccine.applied_date && vaccine.expected_date)
      .sort((a, b) => (a.expected_date ?? "").localeCompare(b.expected_date ?? ""))[0] ?? null
  );
}

/** Nome do arquivo de comprovante a partir do caminho no storage. */
export function vaccineProofFileName(path?: string | null) {
  if (!path) return "";
  const base = path.split("/").pop() ?? path;
  return base.replace(/^[0-9a-f-]{36}-/i, "");
}

export function vaccineProofIsImage(path?: string | null) {
  if (!path) return false;
  return /\.(jpe?g|png|webp)$/i.test(path);
}
