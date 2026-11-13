import {
  CheckCircle2,
  Gift,
  Heart,
  PackageCheck,
  Search,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

import type {
  ExpenseCategory,
  LayetteCategory,
  LayetteItem,
  LayetteStatus,
} from "@/types/database";

type CategoryMeta = { label: string; chip: string; icon: LucideIcon };

export const layetteCategoryMeta: Record<LayetteCategory, CategoryMeta> = {
  roupas: {
    label: "Roupas",
    chip: "bg-primary/15 text-[hsl(13,62%,38%)]",
    icon: Heart,
  },
  berco: {
    label: "Berço e colchão",
    chip: "bg-secondary text-secondary-foreground",
    icon: PackageCheck,
  },
  banho: {
    label: "Banho e higiene",
    chip: "bg-mint/70 text-mint-foreground",
    icon: PackageCheck,
  },
  alimentacao: {
    label: "Alimentação",
    chip: "bg-sun/80 text-sun-foreground",
    icon: ShoppingBag,
  },
  passeio: {
    label: "Passeio e transporte",
    chip: "bg-lavender/70 text-lavender-foreground",
    icon: ShoppingBag,
  },
  quarto: {
    label: "Quarto e decoração",
    chip: "bg-secondary text-secondary-foreground",
    icon: Heart,
  },
  brinquedos: {
    label: "Brinquedos",
    chip: "bg-mint/70 text-mint-foreground",
    icon: Gift,
  },
  outros: {
    label: "Outros",
    chip: "bg-muted text-muted-foreground",
    icon: PackageCheck,
  },
};

export const layetteCategories = Object.keys(layetteCategoryMeta) as LayetteCategory[];

export function layetteCategoryLabel(category: LayetteCategory) {
  return layetteCategoryMeta[category].label;
}

/**
 * Categoria do Financeiro equivalente à categoria do enxoval. Espelha
 * `public.layette_expense_category` no banco, que é quem manda ao registrar
 * a despesa da compra (aqui serve só para pré-visualizar no modal).
 */
const expenseCategoryByLayetteCategory: Record<LayetteCategory, ExpenseCategory> = {
  roupas: "roupas",
  berco: "moveis",
  banho: "higiene",
  alimentacao: "alimentacao",
  passeio: "transporte",
  quarto: "quarto",
  brinquedos: "brinquedos",
  outros: "outros",
};

export function layetteExpenseCategory(category: LayetteCategory): ExpenseCategory {
  return expenseCategoryByLayetteCategory[category];
}

type StatusMeta = {
  label: string;
  chip: string;
  dot: string;
  icon: LucideIcon;
  /** Item considerado resolvido na lista (já saiu do "quero comprar"). */
  settled: boolean;
};

export const layetteStatusMeta: Record<LayetteStatus, StatusMeta> = {
  desejado: {
    label: "Desejado",
    chip: "bg-muted text-foreground/70",
    dot: "bg-muted-foreground/50",
    icon: Heart,
    settled: false,
  },
  pesquisando: {
    label: "Pesquisando",
    chip: "bg-sun/80 text-sun-foreground",
    dot: "bg-[hsl(32,72%,52%)]",
    icon: Search,
    settled: false,
  },
  comprado: {
    label: "Comprado",
    chip: "bg-primary/15 text-[hsl(13,62%,38%)]",
    dot: "bg-primary",
    icon: ShoppingBag,
    settled: true,
  },
  recebido: {
    label: "Recebido",
    chip: "bg-mint/70 text-mint-foreground",
    dot: "bg-[hsl(164,42%,42%)]",
    icon: PackageCheck,
    settled: true,
  },
  presenteado: {
    label: "Presenteado",
    chip: "bg-[hsl(340,58%,94%)] text-[hsl(340,38%,34%)]",
    dot: "bg-[hsl(340,52%,62%)]",
    icon: Gift,
    settled: true,
  },
};

export const layetteStatuses = Object.keys(layetteStatusMeta) as LayetteStatus[];

export function layetteStatusLabel(status: LayetteStatus) {
  return layetteStatusMeta[status].label;
}

/** "2 de 5" a partir das quantidades do item. */
export function layetteQuantityLabel(item: LayetteItem) {
  return `${item.purchased_quantity} de ${item.desired_quantity}`;
}

/** Unidades que ainda faltam para fechar o item (nunca negativo). */
export function layetteRemainingUnits(item: LayetteItem) {
  return Math.max(0, item.desired_quantity - item.purchased_quantity);
}

export function layetteProgressPercent(item: LayetteItem) {
  if (item.desired_quantity <= 0) return 0;
  const percent = Math.round((item.purchased_quantity / item.desired_quantity) * 100);
  return Math.min(100, Math.max(0, percent));
}

/**
 * Regra das quantidades: o item só fica "Concluído" quando a quantidade
 * recebida/comprada alcança a desejada. Antes disso ele mostra o status que
 * conta a origem das peças (comprado, presenteado…), mesmo que já tenha
 * chegado parte delas.
 */
export function layetteItemComplete(item: LayetteItem) {
  return item.purchased_quantity >= item.desired_quantity;
}

export const layetteCompleteMeta: StatusMeta = {
  label: "Concluído",
  chip: "bg-mint/70 text-mint-foreground",
  dot: "bg-[hsl(164,42%,42%)]",
  icon: CheckCircle2,
  settled: true,
};

/** Status exibido no card: "Concluído" só quando a quantidade fecha. */
export function layetteDisplayStatus(item: LayetteItem): StatusMeta {
  return layetteItemComplete(item) ? layetteCompleteMeta : layetteStatusMeta[item.status];
}

/** Estimado = preço estimado por unidade × quantidade desejada. */
export function layetteEstimatedCents(item: LayetteItem) {
  return (item.estimated_price_cents ?? 0) * item.desired_quantity;
}

/** Gasto real = preço pago por unidade × quantidade comprada. */
export function layetteActualCents(item: LayetteItem) {
  return (item.actual_price_cents ?? 0) * item.purchased_quantity;
}

export type LayetteTotals = {
  items: number;
  desiredUnits: number;
  purchasedUnits: number;
  percent: number;
  estimatedCents: number;
  actualCents: number;
  completeItems: number;
  pendingItems: number;
};

export function layetteTotals(items: readonly LayetteItem[]): LayetteTotals {
  const desiredUnits = items.reduce((total, item) => total + item.desired_quantity, 0);
  const purchasedUnits = items.reduce(
    (total, item) => total + Math.min(item.purchased_quantity, item.desired_quantity),
    0,
  );
  const completeItems = items.filter((item) => layetteItemComplete(item)).length;

  return {
    items: items.length,
    desiredUnits,
    purchasedUnits,
    percent: desiredUnits > 0 ? Math.round((purchasedUnits / desiredUnits) * 100) : 0,
    estimatedCents: items.reduce((total, item) => total + layetteEstimatedCents(item), 0),
    actualCents: items.reduce((total, item) => total + layetteActualCents(item), 0),
    completeItems,
    pendingItems: items.length - completeItems,
  };
}

export function layetteStatusCounts(items: readonly LayetteItem[]) {
  const counts = new Map<LayetteStatus, number>();
  for (const item of items) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }
  return counts;
}

export type LayetteFilters = {
  query: string;
  category: LayetteCategory | "all";
  status: LayetteStatus | "all";
  onlyPending: boolean;
};

export const emptyLayetteFilters: LayetteFilters = {
  query: "",
  category: "all",
  status: "all",
  onlyPending: false,
};

export function layetteFiltersActive(filters: LayetteFilters) {
  return (
    filters.query.trim().length > 0 ||
    filters.category !== "all" ||
    filters.status !== "all" ||
    filters.onlyPending
  );
}

/** Junta busca textual (nome, responsável, observações) com os filtros. */
export function filterLayette<T extends LayetteItem>(
  items: readonly T[],
  filters: LayetteFilters,
): T[] {
  const term = filters.query.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.category !== "all" && item.category !== filters.category) return false;
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.onlyPending && layetteItemComplete(item)) return false;
    if (!term) return true;

    return [item.name, item.responsible, item.notes, layetteCategoryLabel(item.category)]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(term));
  });
}

/** Pendentes primeiro, depois por categoria e nome. */
export function sortLayette<T extends LayetteItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const aComplete = layetteItemComplete(a);
    const bComplete = layetteItemComplete(b);
    if (aComplete !== bComplete) return aComplete ? 1 : -1;

    const categoryDiff =
      layetteCategories.indexOf(a.category) - layetteCategories.indexOf(b.category);
    if (categoryDiff !== 0) return categoryDiff;

    return a.name.localeCompare(b.name, "pt-BR");
  });
}
