import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { Expense, ExpenseAttachment, ExpenseCategory } from "@/types/database";

type CategoryMeta = {
  label: string;
  chip: string;
  bar: string;
};

export const expenseCategoryMeta: Record<ExpenseCategory, CategoryMeta> = {
  roupas: { label: "Roupas", chip: "bg-lavender/70 text-lavender-foreground", bar: "bg-lavender" },
  higiene: { label: "Higiene", chip: "bg-mint/70 text-mint-foreground", bar: "bg-mint" },
  moveis: { label: "Móveis", chip: "bg-sun/80 text-sun-foreground", bar: "bg-sun" },
  quarto: { label: "Quarto", chip: "bg-secondary text-secondary-foreground", bar: "bg-secondary" },
  alimentacao: {
    label: "Alimentação",
    chip: "bg-primary/15 text-[hsl(13,62%,38%)]",
    bar: "bg-primary",
  },
  saude: { label: "Saúde", chip: "bg-mint/70 text-mint-foreground", bar: "bg-mint" },
  consultas_exames: {
    label: "Consultas e exames",
    chip: "bg-lavender/70 text-lavender-foreground",
    bar: "bg-lavender",
  },
  transporte: {
    label: "Transporte",
    chip: "bg-sun/80 text-sun-foreground",
    bar: "bg-sun",
  },
  brinquedos: { label: "Brinquedos", chip: "bg-secondary text-secondary-foreground", bar: "bg-secondary" },
  outros: { label: "Outros", chip: "bg-muted text-muted-foreground", bar: "bg-muted-foreground/40" },
};

export const expenseCategories = Object.keys(expenseCategoryMeta) as ExpenseCategory[];

export function categoryLabel(category: ExpenseCategory) {
  return expenseCategoryMeta[category].label;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCents(cents: number) {
  return currencyFormatter.format(cents / 100);
}

/** Valor de reais digitado ("1.234,56" ou "1234.56") para centavos. */
export function parseAmountToCents(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;

  let normalized = raw.replace(/[^\d.,]/g, "");
  if (!normalized) return null;

  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else {
    const parts = normalized.split(".");
    // "1.234" e "1.234.567" são separadores de milhar, não decimais.
    if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
      normalized = parts.join("");
    }
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;

  return Math.round(value * 100);
}

/** Centavos para o valor exibido no campo de edição ("1234,56"). */
export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function formatExpenseDayBadge(date: string) {
  const parsed = parseISO(date);
  return {
    day: format(parsed, "dd", { locale: ptBR }),
    month: format(parsed, "MMM", { locale: ptBR }).replace(".", ""),
    year: format(parsed, "yyyy", { locale: ptBR }),
  };
}

export function totalCents(expenses: readonly Expense[]) {
  return expenses.reduce((total, expense) => total + expense.amount_cents, 0);
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function currentMonthKey(now: Date = new Date()) {
  return format(now, "yyyy-MM");
}

export type CategoryTotal = {
  category: ExpenseCategory;
  label: string;
  cents: number;
  count: number;
};

/** Totais por categoria, do maior para o menor. */
export function categoryTotals(expenses: readonly Expense[]): CategoryTotal[] {
  const buckets = new Map<ExpenseCategory, { cents: number; count: number }>();

  for (const expense of expenses) {
    const current = buckets.get(expense.category) ?? { cents: 0, count: 0 };
    buckets.set(expense.category, {
      cents: current.cents + expense.amount_cents,
      count: current.count + 1,
    });
  }

  return [...buckets.entries()]
    .map(([category, value]) => ({
      category,
      label: categoryLabel(category),
      cents: value.cents,
      count: value.count,
    }))
    .sort((a, b) => b.cents - a.cents);
}

export type MonthTotal = { key: string; label: string; cents: number; isCurrent: boolean };

/** Últimos `months` meses (incluindo o atual), do mais antigo para o mais novo. */
export function monthlyTotals(
  expenses: readonly Expense[],
  months = 4,
  now: Date = new Date(),
): MonthTotal[] {
  const currentKey = currentMonthKey(now);

  return Array.from({ length: months }, (_, index) => {
    const date = addMonths(parseISO(`${currentKey}-01`), index - (months - 1));
    const key = format(date, "yyyy-MM");
    const cents = expenses
      .filter((expense) => monthKey(expense.expense_date) === key)
      .reduce((total, expense) => total + expense.amount_cents, 0);

    return {
      key,
      label: format(date, "MMM", { locale: ptBR }).replace(".", ""),
      cents,
      isCurrent: key === currentKey,
    };
  });
}

export function monthTotalsFor(expenses: readonly Expense[], now: Date = new Date()) {
  const currentKey = currentMonthKey(now);
  const previousKey = format(addMonths(parseISO(`${currentKey}-01`), -1), "yyyy-MM");

  const sum = (key: string) =>
    expenses
      .filter((expense) => monthKey(expense.expense_date) === key)
      .reduce((total, expense) => total + expense.amount_cents, 0);

  const current = sum(currentKey);
  const previous = sum(previousKey);

  return {
    current,
    previous,
    difference: current - previous,
    variation:
      previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0,
  };
}

export function latestExpenses(expenses: readonly Expense[], limit = 4) {
  return [...expenses]
    .sort((a, b) => {
      if (a.expense_date === b.expense_date) return b.created_at.localeCompare(a.created_at);
      return b.expense_date.localeCompare(a.expense_date);
    })
    .slice(0, limit);
}

export type ExpenseFilters = {
  query: string;
  category: ExpenseCategory | "all";
  from: string;
  to: string;
};

export const emptyExpenseFilters: ExpenseFilters = {
  query: "",
  category: "all",
  from: "",
  to: "",
};

export function filtersActive(filters: ExpenseFilters) {
  return (
    filters.query.trim().length > 0 ||
    filters.category !== "all" ||
    Boolean(filters.from) ||
    Boolean(filters.to)
  );
}

/** Busca por nome, loja, descrição, observações ou quem pagou + filtros de data/categoria. */
export function filterExpenses<T extends Expense>(
  expenses: readonly T[],
  filters: ExpenseFilters,
): T[] {
  const term = filters.query.trim().toLowerCase();

  return expenses.filter((expense) => {
    if (filters.category !== "all" && expense.category !== filters.category) return false;
    if (filters.from && expense.expense_date < filters.from) return false;
    if (filters.to && expense.expense_date > filters.to) return false;
    if (!term) return true;

    return [expense.name, expense.store, expense.description, expense.notes, expense.paid_by]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(term));
  });
}

export type ExpenseWithAttachments = Expense & { attachments: ExpenseAttachment[] };
