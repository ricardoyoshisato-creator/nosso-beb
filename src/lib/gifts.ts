import type { Gift, LayetteItem } from "@/types/database";

export type GiftTotals = {
  count: number;
  units: number;
  linked: number;
  lastDate: string | null;
};

export function giftTotals(gifts: readonly Gift[]): GiftTotals {
  return {
    count: gifts.length,
    units: gifts.reduce((total, gift) => total + gift.quantity, 0),
    linked: gifts.filter((gift) => gift.layette_item_id).length,
    lastDate: gifts.reduce<string | null>(
      (latest, gift) => (!latest || gift.date_received > latest ? gift.date_received : latest),
      null,
    ),
  };
}

/**
 * Itens do enxoval que ainda não fecharam a quantidade desejada. Um item com
 * 2 de 10 peças continua podendo receber novos presentes — só fica fora da
 * lista quando `purchased_quantity` alcança `desired_quantity`.
 */
export function linkableLayetteItems(items: readonly LayetteItem[]): LayetteItem[] {
  return items.filter((item) => item.purchased_quantity < item.desired_quantity);
}

/** Quantidade do enxoval depois de somar as unidades deste presente. */
export function layetteQuantityAfter(layetteItem: LayetteItem, units: number) {
  return layetteItem.purchased_quantity + Math.max(0, units);
}

/** Nome legível da foto a partir do caminho no bucket (`<family>/<gift>/<uuid>-<nome>`). */
export function giftPhotoFileName(path: string | null) {
  if (!path) return "presente";
  const segment = path.split("/").pop() ?? "presente";
  const withoutId = segment.includes("-") ? segment.slice(segment.indexOf("-") + 1) : segment;
  return decodeURIComponent(withoutId) || "presente";
}
