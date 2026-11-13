import { ExternalLink, Pencil, Receipt, Trash2, User } from "lucide-react";

import { formatCents } from "@/lib/expenses";
import {
  layetteActualCents,
  layetteCategoryMeta,
  layetteDisplayStatus,
  layetteEstimatedCents,
  layetteItemComplete,
  layetteProgressPercent,
  layetteQuantityLabel,
  layetteRemainingUnits,
} from "@/lib/layette";
import { cn } from "@/lib/utils";
import type { LayetteItem } from "@/types/database";

type LayetteCardProps = {
  item: LayetteItem;
  canEdit: boolean;
  canDelete: boolean;
  /** Só quem registra gastos pode lançar uma compra no Financeiro. */
  canPurchase: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPurchase: () => void;
};

export function LayetteCard({
  item,
  canEdit,
  canDelete,
  canPurchase,
  onEdit,
  onDelete,
  onPurchase,
}: LayetteCardProps) {
  const category = layetteCategoryMeta[item.category];
  const status = layetteDisplayStatus(item);
  const remaining = layetteRemainingUnits(item);
  const percent = layetteProgressPercent(item);
  const barWidth = item.purchased_quantity > 0 ? Math.max(percent, 4) : 0;
  const complete = layetteItemComplete(item);
  const actualTotal = layetteActualCents(item);
  const estimatedTotal = layetteEstimatedCents(item);

  return (
    <article className="animate-rise rounded-3xl border border-border/70 bg-card p-3.5 shadow-soft sm:p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
            category.chip,
          )}
        >
          <category.icon className="h-[18px] w-[18px]" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 truncate font-display text-sm font-semibold leading-tight text-foreground">
              {item.name}
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                status.chip,
              )}
            >
              <status.icon className="h-3 w-3" />
              {status.label}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="truncate">{category.label}</span>
            {item.responsible && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.responsible}</span>
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  complete ? "bg-[hsl(164,42%,52%)]" : "bg-primary",
                )}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="shrink-0 font-display text-[11px] font-semibold text-foreground/80">
              {layetteQuantityLabel(item)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {!complete && remaining > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                Faltam {remaining} {remaining === 1 ? "peça" : "peças"}
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/70">
              Estimado {item.estimated_price_cents !== null ? formatCents(item.estimated_price_cents) : "—"}/un
            </span>
            <span className="rounded-full bg-mint/60 px-2 py-0.5 text-[10px] font-semibold text-mint-foreground">
              Pago {item.actual_price_cents !== null ? formatCents(item.actual_price_cents) : "—"}/un
            </span>
            {actualTotal > 0 && item.purchased_quantity > 1 && (
              <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-foreground/75">
                Total pago {formatCents(actualTotal)}
              </span>
            )}
            {actualTotal === 0 && estimatedTotal > 0 && (
              <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-foreground/75">
                Estimado total {formatCents(estimatedTotal)}
              </span>
            )}
          </div>

          {item.notes && (
            <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground/90">
              {item.notes}
            </p>
          )}

          {item.store_link && (
            <a
              href={item.store_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-semibold text-foreground/75 transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              Ver na loja
            </a>
          )}

          {canPurchase && (
            <button
              type="button"
              onClick={onPurchase}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 sm:w-auto sm:px-4"
            >
              <Receipt className="h-3.5 w-3.5" />
              Registrar compra
            </button>
          )}
        </div>

        {(canEdit || canDelete) && (
          <div className="flex shrink-0 flex-col items-center gap-1">
            {canEdit && (
              <button
                type="button"
                aria-label={`Editar ${item.name}`}
                onClick={onEdit}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                aria-label={`Excluir ${item.name}`}
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
