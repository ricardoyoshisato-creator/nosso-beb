import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

import type { Pregnancy, PregnancyMilestone, PregnancyReferenceType } from "@/types/database";

/** Duração de referência de uma gestação a termo (40 semanas). */
export const GESTATION_DAYS = 280;

export const referenceTypeLabels: Record<PregnancyReferenceType, string> = {
  dum: "DUM (última menstruação)",
  reference: "Data de referência",
};

/**
 * Todas as datas do módulo são dias de calendário no formato "AAAA-MM-DD".
 * Usamos date-fns (`parseISO`/`format`/`differenceInCalendarDays`) para nunca
 * converter para UTC — assim o dia não "anda" em nenhum fuso horário e o
 * horário de verão é considerado nos cálculos de dias.
 */
export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function addDaysISO(value: string, days: number) {
  return format(addDays(parseISO(value), days), "yyyy-MM-dd");
}

/** Dias de calendário entre duas datas (b - a). */
export function daysBetween(a: string, b: string) {
  return differenceInCalendarDays(parseISO(b), parseISO(a));
}

/**
 * DPP estimada: 40 semanas após a referência.
 * Na DUM, o ciclo é considerado (ciclos mais longos deslocam a ovulação).
 */
export function estimateDueDate(
  referenceDate: string,
  referenceType: PregnancyReferenceType,
  cycleLength: number,
) {
  const adjustment = referenceType === "dum" ? cycleLength - 28 : 0;
  return addDaysISO(referenceDate, GESTATION_DAYS + adjustment);
}

export type GestationSummary = {
  totalDays: number;
  weeks: number;
  days: number;
  weeksLabel: string;
  progress: number;
  trimester: 1 | 2 | 3;
  trimesterLabel: string;
  dueDate: string;
  daysUntilDue: number;
  remainingWeeks: number;
  remainingDays: number;
  notStarted: boolean;
  overdue: boolean;
};

export function gestationSummary(
  pregnancy: Pregnancy | null,
  today = todayISO(),
): GestationSummary | null {
  if (!pregnancy) return null;

  // Idade gestacional = dias de calendário desde a referência (DUM).
  const totalDays = daysBetween(pregnancy.reference_date, today);
  const safeDays = Math.max(0, totalDays);
  const weeks = Math.floor(safeDays / 7);
  const days = safeDays % 7;
  const daysUntilDue = daysBetween(today, pregnancy.due_date);
  const remainingDays = Math.max(0, daysUntilDue);
  const trimester: 1 | 2 | 3 = weeks < 14 ? 1 : weeks < 28 ? 2 : 3;

  return {
    totalDays: safeDays,
    weeks,
    days,
    weeksLabel: `${weeks} ${weeks === 1 ? "semana" : "semanas"} e ${days} ${days === 1 ? "dia" : "dias"}`,
    progress: Math.min(100, Math.max(0, Math.round((safeDays / GESTATION_DAYS) * 100))),
    trimester,
    trimesterLabel: `${trimester}º trimestre`,
    dueDate: pregnancy.due_date,
    daysUntilDue,
    remainingWeeks: Math.floor(remainingDays / 7),
    remainingDays: remainingDays % 7,
    notStarted: totalDays < 0,
    overdue: daysUntilDue < 0,
  };
}

export type Milestone = {
  week: number;
  title: string;
  description: string;
};

/** Etapas padrão da gestação, em semanas. Sempre exibidas na linha do tempo. */
export const gestationMilestones: Milestone[] = [
  {
    week: 4,
    title: "Primeiro contato",
    description: "O coração e o tubo neural começam a se formar.",
  },
  {
    week: 8,
    title: "Primeira consulta",
    description: "É comum o primeiro ultrassom e os exames iniciais do pré-natal.",
  },
  {
    week: 12,
    title: "Fim do 1º trimestre",
    description: "Translucência nucal e exames de rotina do primeiro trimestre.",
  },
  {
    week: 16,
    title: "Primeiros movimentos",
    description: "Muitas famílias começam a perceber os movimentos do bebê.",
  },
  {
    week: 20,
    title: "Ultrassom morfológico",
    description: "Avaliação detalhada da formação e do desenvolvimento do bebê.",
  },
  {
    week: 24,
    title: "Marco de viabilidade",
    description: "Etapa importante do desenvolvimento pulmonar.",
  },
  {
    week: 28,
    title: "3º trimestre",
    description: "Consultas mais frequentes e contagem diária de movimentos.",
  },
  {
    week: 37,
    title: "Bebê a termo",
    description: "A partir daqui o nascimento já não é considerado prematuro.",
  },
  {
    week: 40,
    title: "Data provável do parto",
    description: "A estimativa para o grande encontro com o bebê.",
  },
];

export type TimelineEntry = {
  key: string;
  source: "standard" | "custom";
  title: string;
  description: string;
  date: string;
  /** Semana gestacional na data do marco (null quando anterior à referência). */
  week: number | null;
  state: "done" | "current" | "upcoming";
  milestoneId?: string;
  createdBy?: string | null;
};

export type MilestoneState = TimelineEntry;

/** Semana gestacional correspondente a uma data. */
export function gestationWeekOn(referenceDate: string, date: string) {
  const days = daysBetween(referenceDate, date);
  return days < 0 ? null : Math.floor(days / 7);
}

/**
 * Linha do tempo completa: etapas padrão (calculadas a partir da DUM) +
 * marcos personalizados da família, tudo ordenado por data.
 */
export function buildTimeline(
  pregnancy: Pregnancy | null,
  customMilestones: PregnancyMilestone[] = [],
  today = todayISO(),
): TimelineEntry[] {
  if (!pregnancy) return [];

  const completedDays = daysBetween(pregnancy.reference_date, today);
  let currentAssigned = false;

  const standard: TimelineEntry[] = gestationMilestones.map((milestone) => {
    const milestoneDays = milestone.week * 7;
    let state: TimelineEntry["state"] = "upcoming";

    if (completedDays >= milestoneDays) {
      state = "done";
    } else if (!currentAssigned) {
      state = "current";
      currentAssigned = true;
    }

    return {
      key: `standard-${milestone.week}`,
      source: "standard",
      title: milestone.title,
      description: milestone.description,
      date: addDaysISO(pregnancy.reference_date, milestoneDays),
      week: milestone.week,
      state,
    };
  });

  const custom: TimelineEntry[] = customMilestones.map((milestone) => ({
    key: `custom-${milestone.id}`,
    source: "custom",
    title: milestone.title,
    description: milestone.description ?? "",
    date: milestone.event_date,
    week: gestationWeekOn(pregnancy.reference_date, milestone.event_date),
    state: daysBetween(milestone.event_date, today) >= 0 ? "done" : "upcoming",
    milestoneId: milestone.id,
    createdBy: milestone.created_by,
  }));

  return [...standard, ...custom].sort((a, b) => {
    if (a.date === b.date) {
      if (a.source === b.source) return 0;
      return a.source === "standard" ? -1 : 1;
    }
    return a.date < b.date ? -1 : 1;
  });
}

/** Próximo marco ainda não alcançado (ou o último, se todos passaram). */
export function nextMilestone(timeline: TimelineEntry[]) {
  return timeline.find((item) => item.state !== "done") ?? timeline[timeline.length - 1] ?? null;
}
