import { format } from "date-fns";

import {
  Gift,
  MinusCircle,
  ShoppingBag,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import type {
  InventoryItem,
  InventoryMovement,
  InventoryMovementType,
  InventoryUnit,
} from "@/types/database";

export const inventoryUnits: InventoryUnit[] = [
  "un",
  "pacote",
  "caixa",
  "par",
  "frasco",
  "rolo",
  "ml",
  "l",
  "g",
  "kg",
];

const unitLabels: Record<InventoryUnit, { one: string; many: string }> = {
  un: { one: "un", many: "un" },
  pacote: { one: "pacote", many: "pacotes" },
  caixa: { one: "caixa", many: "caixas" },
  par: { one: "par", many: "pares" },
  frasco: { one: "frasco", many: "frascos" },
  rolo: { one: "rolo", many: "rolos" },
  ml: { one: "ml", many: "ml" },
  l: { one: "L", many: "L" },
  g: { one: "g", many: "g" },
  kg: { one: "kg", many: "kg" },
};

export function inventoryUnitLabel(unit: InventoryUnit, quantity = 1) {
  const labels = unitLabels[unit] ?? unitLabels.un;
  return quantity === 1 ? labels.one : labels.many;
}

const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

/** "5", "2,5" — quantidades sem zeros sobrando. */
export function formatQuantity(value: number) {
  return quantityFormatter.format(Number.isFinite(value) ? value : 0);
}

/** "3 pacotes" / "250 ml". */
export function formatStock(quantity: number, unit: InventoryUnit) {
  return `${formatQuantity(quantity)} ${inventoryUnitLabel(unit, quantity)}`;
}

/** Quantidade digitada ("2,5" ou "2.5") para número; `null` se inválida. */
export function parseQuantity(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;

  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

/** Quantidade para o campo de edição. */
export function quantityToInput(value: number) {
  return Number.isFinite(value) ? String(value).replace(".", ",") : "0";
}

/** Estoque baixo: a quantidade atual chegou (ou passou) do mínimo definido. */
export function isLowStock(item: InventoryItem) {
  return item.current_quantity <= item.minimum_stock;
}

export function isOutOfStock(item: InventoryItem) {
  return item.current_quantity <= 0;
}

export type InventorySummary = {
  total: number;
  lowStock: number;
  healthy: number;
  outOfStock: number;
};

export function inventorySummary(items: readonly InventoryItem[]): InventorySummary {
  const lowStock = items.filter(isLowStock).length;
  return {
    total: items.length,
    lowStock,
    healthy: items.length - lowStock,
    outOfStock: items.filter(isOutOfStock).length,
  };
}

/** Estoque baixo primeiro, depois por nome do produto. */
export function sortInventory<T extends InventoryItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    if (isLowStock(a) !== isLowStock(b)) return isLowStock(a) ? -1 : 1;
    return a.product_name.localeCompare(b.product_name, "pt-BR");
  });
}

type MovementMeta = {
  label: string;
  shortLabel: string;
  chip: string;
  icon: LucideIcon;
  /** "entrada" soma, "saida" subtrai, "ajuste" define o saldo. */
  direction: "entrada" | "saida" | "ajuste";
};

export const inventoryMovementMeta: Record<InventoryMovementType, MovementMeta> = {
  entrada_compra: {
    label: "Entrada · compra",
    shortLabel: "Compra",
    chip: "bg-mint/70 text-mint-foreground",
    icon: ShoppingBag,
    direction: "entrada",
  },
  entrada_presente: {
    label: "Entrada · presente",
    shortLabel: "Presente",
    chip: "bg-lavender/70 text-lavender-foreground",
    icon: Gift,
    direction: "entrada",
  },
  saida_uso: {
    label: "Saída · uso",
    shortLabel: "Saída",
    chip: "bg-sun/80 text-sun-foreground",
    icon: MinusCircle,
    direction: "saida",
  },
  ajuste_manual: {
    label: "Ajuste manual",
    shortLabel: "Ajuste",
    chip: "bg-secondary text-secondary-foreground",
    icon: SlidersHorizontal,
    direction: "ajuste",
  },
};

export const inventoryMovementTypes = Object.keys(
  inventoryMovementMeta,
) as InventoryMovementType[];

/** "+3", "−2" ou "Ajuste para 5". */
export function movementQuantityLabel(movement: InventoryMovement) {
  if (movement.movement_type === "ajuste_manual") {
    return `Ajuste para ${formatQuantity(movement.quantity)}`;
  }
  const sign = inventoryMovementMeta[movement.movement_type].direction === "entrada" ? "+" : "−";
  return `${sign}${formatQuantity(movement.quantity)}`;
}

/** Data e hora do movimento no fuso local: "12/02/2026 às 14:32". */
export function formatMovementDate(iso: string) {
  return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm");
}

/**
 * Saldo resultante da movimentação. O banco é a fonte da verdade (trigger);
 * isto serve apenas para pré-visualizar no formulário.
 */
export function previewQuantity(
  currentQuantity: number,
  type: InventoryMovementType,
  quantity: number,
) {
  if (type === "ajuste_manual") return quantity;
  if (inventoryMovementMeta[type].direction === "entrada") return currentQuantity + quantity;
  return currentQuantity - quantity;
}

/** Preenchimento da barra em relação ao estoque mínimo (100% = no mínimo). */
export function stockLevelPercent(item: InventoryItem) {
  if (item.minimum_stock <= 0) {
    return item.current_quantity > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((item.current_quantity / item.minimum_stock) * 100));
}
