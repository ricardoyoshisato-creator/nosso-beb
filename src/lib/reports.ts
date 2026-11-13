import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { categoryTotals } from "@/lib/expenses";
import type { CategoryTotal } from "@/lib/expenses";
import type {
  Appointment,
  BabyLog,
  Exam,
  Expense,
  ExpenseCategory,
  Medication,
  Vaccine,
} from "@/types/database";

export type ReportPeriod = { from: string; to: string };

/** Dias de calendário "AAAA-MM-DD": `from` sempre antes de `to`. */
export function normalizePeriod(period: ReportPeriod): ReportPeriod {
  if (period.from && period.to && period.from > period.to) {
    return { from: period.to, to: period.from };
  }
  return period;
}

export function isInPeriod(date: string | null | undefined, period: ReportPeriod) {
  if (!date) return false;
  return date >= period.from && date <= period.to;
}

/** Dia local de um instante ISO (timestamptz do banco). */
export function localDay(iso: string) {
  return format(parseISO(iso), "yyyy-MM-dd");
}

export function periodDays(period: ReportPeriod) {
  if (!period.from || !period.to) return 0;
  return Math.max(0, differenceInCalendarDays(parseISO(period.to), parseISO(period.from)) + 1);
}

export function formatPeriodDate(date: string) {
  if (!date) return "-";
  return format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/** "12 de janeiro de 2026 a 10 de fevereiro de 2026" (ou um único dia). */
export function formatPeriod(period: ReportPeriod) {
  if (!period.from || !period.to) return "-";
  if (period.from === period.to) return formatPeriodDate(period.from);
  return `${formatPeriodDate(period.from)} a ${formatPeriodDate(period.to)}`;
}

export type ReportPreset = { key: string; label: string; from: string; to: string };

export function reportPresets(now: Date = new Date()): ReportPreset[] {
  const lastMonth = subMonths(now, 1);

  return [
    {
      key: "current",
      label: "Este mês",
      from: format(startOfMonth(now), "yyyy-MM-dd"),
      to: format(now, "yyyy-MM-dd"),
    },
    {
      key: "last",
      label: "Mês passado",
      from: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
      to: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
    },
    {
      key: "30",
      label: "Últimos 30 dias",
      from: format(subDays(now, 29), "yyyy-MM-dd"),
      to: format(now, "yyyy-MM-dd"),
    },
  ];
}

export function defaultReportPeriod(now: Date = new Date()): ReportPeriod {
  return {
    from: format(subDays(now, 29), "yyyy-MM-dd"),
    to: format(now, "yyyy-MM-dd"),
  };
}

export type ReportCategoryTotal = CategoryTotal & {
  /** Cor fixa da categoria no gráfico e nas legendas. */
  color: string;
  /** Participação no total (0 a 1). */
  share: number;
};

/** Cores das categorias de despesa no gráfico (mesma família da paleta do app). */
export const reportCategoryColors: Record<ExpenseCategory, string> = {
  roupas: "#A78BC8",
  higiene: "#6FB8A0",
  moveis: "#E4BE63",
  quarto: "#C4A28C",
  alimentacao: "#EB8B74",
  saude: "#4F8F7F",
  consultas_exames: "#8E7AB5",
  transporte: "#E0A458",
  brinquedos: "#D98AA0",
  outros: "#B9A79B",
};

export type ReportHealth = {
  /** Consultas com status "realizada" dentro do período. */
  consultationsDone: number;
  consultationsScheduled: number;
  consultationsCanceled: number;
  /** Exames ainda sem resultado, pela data do exame no período. */
  pendingExams: number;
  examsWithResult: number;
  /** Medicamentos cadastrados (início do tratamento) no período. */
  medications: number;
  /** Medicamentos em uso em algum dia do período. */
  medicationsActive: number;
};

export type ReportFinance = {
  totalCents: number;
  expenseCount: number;
  averagePerDayCents: number;
  categories: ReportCategoryTotal[];
  biggestCategory: ReportCategoryTotal | null;
};

export type ReportBaby = {
  diapers: number;
  bottles: number;
  baths: number;
  breastfeedings: number;
  sleep: number;
  vaccines: number;
  totalLogs: number;
};

export type ReportSummary = {
  period: ReportPeriod;
  days: number;
  health: ReportHealth;
  finance: ReportFinance;
  baby: ReportBaby;
};

type ReportSources = {
  appointments: readonly Appointment[];
  exams: readonly Exam[];
  medications: readonly Medication[];
  expenses: readonly Expense[];
  babyLogs: readonly BabyLog[];
  vaccines: readonly Vaccine[];
};

/** Data que posiciona o exame no período (realização > agendamento > solicitação). */
function examPeriodDate(exam: Exam) {
  return (
    exam.performed_date ??
    exam.scheduled_date ??
    exam.requested_date ??
    localDay(exam.created_at)
  );
}

/**
 * Consolida o resumo do período a partir dos dados já carregados pelo
 * `FamilyContext` — que só traz as linhas visíveis pelo RLS da família logada.
 */
export function buildReportSummary(periodInput: ReportPeriod, sources: ReportSources): ReportSummary {
  const period = normalizePeriod(periodInput);

  const appointments = sources.appointments.filter((appointment) =>
    isInPeriod(localDay(appointment.scheduled_at), period),
  );

  const exams = sources.exams.filter((exam) => isInPeriod(examPeriodDate(exam), period));

  const medications = sources.medications.filter((medication) =>
    isInPeriod(medication.start_date, period),
  );

  const medicationsActive = sources.medications.filter((medication) => {
    if (medication.start_date > period.to) return false;
    return !medication.end_date || medication.end_date >= period.from;
  });

  const expenses = sources.expenses.filter((expense) =>
    isInPeriod(expense.expense_date, period),
  );

  const logs = sources.babyLogs.filter((log) => isInPeriod(localDay(log.logged_at), period));
  const countLogs = (type: BabyLog["log_type"]) =>
    logs.filter((log) => log.log_type === type).length;

  const vaccines = sources.vaccines.filter((vaccine) =>
    isInPeriod(vaccine.applied_date, period),
  );

  const totalCents = expenses.reduce((total, expense) => total + expense.amount_cents, 0);
  const categories = categoryTotals(expenses).map((category) => ({
    ...category,
    color: reportCategoryColors[category.category],
    share: totalCents > 0 ? category.cents / totalCents : 0,
  }));
  const days = periodDays(period);

  return {
    period,
    days,
    health: {
      consultationsDone: appointments.filter((appointment) => appointment.status === "done").length,
      consultationsScheduled: appointments.filter(
        (appointment) =>
          appointment.status === "scheduled" || appointment.status === "rescheduled",
      ).length,
      consultationsCanceled: appointments.filter((appointment) => appointment.status === "canceled")
        .length,
      pendingExams: exams.filter((exam) => !exam.result?.trim()).length,
      examsWithResult: exams.filter((exam) => Boolean(exam.result?.trim())).length,
      medications: medications.length,
      medicationsActive: medicationsActive.length,
    },
    finance: {
      totalCents,
      expenseCount: expenses.length,
      averagePerDayCents: days > 0 ? Math.round(totalCents / days) : totalCents,
      categories,
      biggestCategory: categories[0] ?? null,
    },
    baby: {
      diapers: countLogs("fralda"),
      bottles: countLogs("mamadeira"),
      baths: countLogs("banho"),
      breastfeedings: countLogs("amamentacao"),
      sleep: countLogs("sono"),
      vaccines: vaccines.length,
      totalLogs: logs.length,
    },
  };
}

/** Despesas do período, da mais recente para a mais antiga (base do CSV). */
export function expensesInPeriod<T extends Expense>(
  expenses: readonly T[],
  period: ReportPeriod,
): T[] {
  const normalized = normalizePeriod(period);

  return expenses
    .filter((expense) => isInPeriod(expense.expense_date, normalized))
    .sort((a, b) => {
      if (a.expense_date === b.expense_date) return b.created_at.localeCompare(a.created_at);
      return b.expense_date.localeCompare(a.expense_date);
    });
}

/** Nome base dos arquivos exportados (sem acentos, pronto para download). */
export function reportFileBase(prefix: string, period: ReportPeriod) {
  const normalized = normalizePeriod(period);
  return `${prefix}-${normalized.from}-a-${normalized.to}`;
}
