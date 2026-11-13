import { Link } from "react-router-dom";
import { Baby, Pencil, Receipt, Store, Trash2, User } from "lucide-react";

import type { ExpenseWithAttachments } from "@/lib/expenses";
import {
  expenseCategoryMeta,
  formatCents,
  formatExpenseDayBadge,
} from "@/lib/expenses";
import type { ExpenseAttachment } from "@/types/database";
import { cn } from "@/lib/utils";

type ExpenseCardProps = {
  expense: ExpenseWithAttachments;
  /** Nome do item do enxoval que originou a compra, quando houver. */
  layetteName?: string | null;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenReceipt: (attachment: ExpenseAttachment) => void;
};

export function ExpenseCard({
  expense,
  layetteName,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onOpenReceipt,
}: ExpenseCardProps) {
  const badge = formatExpenseDayBadge(expense.expense_date);
  const category = expenseCategoryMeta[expense.category];

  return (
    <article className="animate-rise rounded-3xl border border-border/70 bg-card p-3.5 shadow-soft sm:p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <span className="text-center leading-none">
            <span className="block font-display text-sm font-semibold">{badge.day}</span>
            <span className="block text-[9px] font-semibold uppercase tracking-wider">
              {badge.month}
            </span>
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 truncate font-display text-sm font-semibold leading-tight text-foreground">
              {expense.name}
            </h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", category.chip)}>
              {category.label}
            </span>
          </div>

          {expense.description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground">
              {expense.description}
            </p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {expense.store && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Store className="h-3 w-3 shrink-0" />
                <span className="truncate">{expense.store}</span>
              </span>
            )}
            {expense.paid_by && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{expense.paid_by}</span>
              </span>
            )}
            <span className="text-muted-foreground/70">{badge.year}</span>
          </div>

          {expense.notes && (
            <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground/90">
              {expense.notes}
            </p>
          )}

          {expense.layette_item_id && (
            <Link
              to="/enxoval"
              className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-mint/60 px-2 py-0.5 text-[10px] font-semibold text-mint-foreground transition-colors hover:bg-mint/80"
            >
              <Baby className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {layetteName ? `Enxoval · ${layetteName}` : "Compra do enxoval"}
              </span>
            </Link>
          )}

          {expense.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expense.attachments.map((attachment) => (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => onOpenReceipt(attachment)}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-semibold text-foreground/75 transition-colors hover:bg-muted"
                >
                  <Receipt className="h-3 w-3 shrink-0" />
                  <span className="truncate">{attachment.file_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="font-display text-base font-semibold leading-none text-foreground">
            {formatCents(expense.amount_cents)}
          </p>

          {(canEdit || canDelete) && (
            <div className="flex items-center gap-0.5">
              {canEdit && (
                <button
                  type="button"
                  aria-label={`Editar ${expense.name}`}
                  onClick={onEdit}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Excluir ${expense.name}`}
                  onClick={onDelete}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
