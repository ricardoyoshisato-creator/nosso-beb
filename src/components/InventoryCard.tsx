import { AlertTriangle, Clock3, History, Package, Pencil, Trash2 } from "lucide-react";

import { relativeTime } from "@/lib/family";
import {
  formatQuantity,
  formatStock,
  inventoryUnitLabel,
  isLowStock,
  stockLevelPercent,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/types/database";

type InventoryCardProps = {
  item: InventoryItem;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function InventoryCard({
  item,
  canEdit,
  canDelete,
  onOpen,
  onEdit,
  onDelete,
}: InventoryCardProps) {
  const low = isLowStock(item);
  const level = stockLevelPercent(item);

  return (
    <article
      className={cn(
        "animate-rise rounded-3xl border bg-card p-3.5 shadow-soft sm:p-4",
        low ? "border-destructive/40 bg-destructive/[0.03]" : "border-border/70",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
            low
              ? "bg-destructive/10 text-destructive"
              : "bg-mint/60 text-mint-foreground",
          )}
        >
          {low ? <AlertTriangle className="h-[18px] w-[18px]" /> : <Package className="h-[18px] w-[18px]" />}
        </span>

        <div
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen();
            }
          }}
          aria-label={`Abrir histórico de ${item.product_name}`}
          className="min-w-0 flex-1 cursor-pointer rounded-2xl text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 truncate font-display text-sm font-semibold leading-tight text-foreground">
              {item.product_name}
            </h3>
            {low && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                <AlertTriangle className="h-3 w-3" />
                Estoque baixo
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            {item.brand && <span className="truncate">{item.brand}</span>}
            {item.brand && item.size && <span aria-hidden>·</span>}
            {item.size && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                Tam. {item.size}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Quantidade atual
              </p>
              <p
                className={cn(
                  "font-display text-xl font-semibold leading-tight",
                  low ? "text-destructive" : "text-foreground",
                )}
              >
                {formatQuantity(item.current_quantity)}{" "}
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {inventoryUnitLabel(item.unit, item.current_quantity)}
                </span>
              </p>
            </div>

            <p className="shrink-0 text-right text-[10.5px] leading-tight text-muted-foreground">
              Mínimo
              <br />
              <span className="font-semibold text-foreground/70">
                {formatStock(item.minimum_stock, item.unit)}
              </span>
            </p>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                low ? "bg-destructive" : "bg-[hsl(164,42%,52%)]",
              )}
              style={{ width: `${Math.max(level, item.current_quantity > 0 ? 4 : 0)}%` }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground/85">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3 shrink-0" />
              Atualizado {relativeTime(item.updated_at)}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary">
              <History className="h-3 w-3" />
              Histórico
            </span>
          </div>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex shrink-0 flex-col items-center gap-1">
            {canEdit && (
              <button
                type="button"
                aria-label={`Editar ${item.product_name}`}
                onClick={onEdit}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                aria-label={`Excluir ${item.product_name}`}
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
