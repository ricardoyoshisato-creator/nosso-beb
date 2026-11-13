import { Link } from "react-router-dom";
import {
  Baby,
  CalendarDays,
  Camera,
  Gift as GiftIcon,
  PackagePlus,
  Pencil,
  Receipt,
  Trash2,
  User,
} from "lucide-react";

import { StorageImage } from "@/components/StorageImage";
import { GIFT_BUCKET } from "@/lib/attachments";
import { formatCents } from "@/lib/expenses";
import { formatNumericDate } from "@/lib/family";
import { formatQuantity, inventoryUnitLabel } from "@/lib/inventory";
import { cn } from "@/lib/utils";
import type { Gift, InventoryItem, LayetteItem } from "@/types/database";

type GiftCardProps = {
  gift: Gift;
  linkedLayette?: LayetteItem | null;
  stockItem?: InventoryItem | null;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenPhoto: () => void;
};

export function GiftCard({
  gift,
  linkedLayette,
  stockItem,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onOpenPhoto,
}: GiftCardProps) {
  return (
    <article className="animate-rise rounded-3xl border border-border/70 bg-card p-3.5 shadow-soft sm:p-4">
      <div className="flex items-start gap-3">
        {gift.photo_path ? (
          <button
            type="button"
            onClick={onOpenPhoto}
            aria-label={`Abrir foto de ${gift.product_name}`}
            className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-2xl border border-border/60 transition-transform hover:-translate-y-0.5"
          >
            <StorageImage
              bucket={GIFT_BUCKET}
              path={gift.photo_path}
              alt={gift.product_name}
              className="h-full w-full object-cover"
            />
          </button>
        ) : (
          <span className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-2xl bg-[hsl(340,58%,94%)] text-[hsl(340,40%,36%)]">
            <GiftIcon className="h-6 w-6" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 truncate font-display text-sm font-semibold leading-tight text-foreground">
              {gift.product_name}
            </h3>
            {gift.quantity > 1 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                ×{gift.quantity}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {gift.giver_name ? `Presente de ${gift.giver_name}` : "Presente recebido"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3 shrink-0" />
              {formatNumericDate(gift.date_received)}
            </span>
          </div>

          {gift.description && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {gift.description}
            </p>
          )}

          {gift.notes && (
            <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground/90">
              {gift.notes}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {gift.layette_item_id &&
              (linkedLayette ? (
                <Link
                  to="/enxoval"
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-mint/60 px-2 py-0.5 text-[10px] font-semibold text-mint-foreground transition-colors hover:bg-mint/80"
                >
                  <Baby className="h-3 w-3 shrink-0" />
                  <span className="truncate">Enxoval · {linkedLayette.name}</span>
                  <span className="shrink-0 rounded-full bg-card/70 px-1.5 text-[9.5px]">
                    +{gift.quantity} un
                  </span>
                </Link>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Item do enxoval removido
                </span>
              ))}

            {gift.inventory_item_id && (
              <Link
                to="/estoque"
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-lavender/70 px-2 py-0.5 text-[10px] font-semibold text-lavender-foreground transition-colors hover:bg-lavender"
              >
                <PackagePlus className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {stockItem ? stockItem.product_name : "Estoque"} ·{" "}
                  {gift.stock_quantity !== null
                    ? formatQuantity(gift.stock_quantity)
                    : gift.quantity}{" "}
                  {stockItem
                    ? inventoryUnitLabel(stockItem.unit, gift.stock_quantity ?? gift.quantity)
                    : "un"}{" "}
                  no estoque
                </span>
              </Link>
            )}

            {gift.cost_cents !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-[hsl(13,62%,38%)]">
                <Receipt className="h-3 w-3 shrink-0" />
                {formatCents(gift.cost_cents)} no Financeiro
              </span>
            )}

            {gift.photo_path && (
              <button
                type="button"
                onClick={onOpenPhoto}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1",
                  "text-[10px] font-semibold text-foreground/75 transition-colors hover:bg-muted",
                )}
              >
                <Camera className="h-3 w-3" />
                Ver foto
              </button>
            )}
          </div>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex shrink-0 flex-col items-center gap-1">
            {canEdit && (
              <button
                type="button"
                aria-label={`Editar ${gift.product_name}`}
                onClick={onEdit}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                aria-label={`Excluir ${gift.product_name}`}
                onClick={onDelete}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
