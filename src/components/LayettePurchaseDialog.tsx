import { useState } from "react";
import type { FormEvent } from "react";
import { format } from "date-fns";
import { CalendarDays, Loader2, Receipt, ShoppingBag, User, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToInput, expenseCategoryMeta, formatCents, parseAmountToCents } from "@/lib/expenses";
import { layetteCategoryMeta, layetteExpenseCategory } from "@/lib/layette";
import { cn } from "@/lib/utils";
import type { LayetteCategory } from "@/types/database";

/** Item do enxoval que receberá mais unidades compradas pela família. */
export type LayettePurchaseTarget = {
  id: string;
  name: string;
  category: LayetteCategory;
  desiredQuantity: number;
  purchasedQuantity: number;
};

export type LayettePurchaseValues = {
  quantity: number;
  totalCents: number;
  paidBy: string;
  purchaseDate: string;
};

type LayettePurchaseDialogProps = {
  item: LayettePurchaseTarget;
  payerSuggestions?: string[];
  submitting?: boolean;
  onSubmit: (values: LayettePurchaseValues) => void;
  onCancel: () => void;
};

const labelClass = "text-xs font-semibold text-foreground/80";
const fieldClass =
  "h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40";

export function LayettePurchaseDialog({
  item,
  payerSuggestions = [],
  submitting = false,
  onSubmit,
  onCancel,
}: LayettePurchaseDialogProps) {
  const [quantity, setQuantity] = useState("1");
  const [total, setTotal] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [error, setError] = useState<string | null>(null);

  const category = layetteCategoryMeta[item.category];
  const expenseCategory = expenseCategoryMeta[layetteExpenseCategory(item.category)];

  const parsedQuantity = Number(quantity);
  const quantityValid = Number.isInteger(parsedQuantity) && parsedQuantity >= 1;
  const totalCents = parseAmountToCents(total);
  const perUnitCents =
    quantityValid && totalCents !== null ? Math.max(1, Math.round(totalCents / parsedQuantity)) : null;

  const purchasedAfter = quantityValid ? item.purchasedQuantity + parsedQuantity : null;
  const closesItem = purchasedAfter !== null && purchasedAfter >= item.desiredQuantity;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!quantityValid) {
      setError("Informe a quantidade comprada (1 ou mais).");
      return;
    }

    if (totalCents === null) {
      setError("Informe o valor total pago. Ex.: 159,90");
      return;
    }

    if (!date) {
      setError("Informe a data da compra.");
      return;
    }

    setError(null);
    onSubmit({ quantity: parsedQuantity, totalCents, paidBy, purchaseDate: date });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onCancel();
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Registrar compra</DialogTitle>
          <DialogDescription>
            As unidades compradas somam no enxoval e o valor total entra no Financeiro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3 rounded-3xl border border-border/70 bg-muted/40 p-3">
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", category.chip)}>
              <category.icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-foreground">
                {item.name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {category.label} · {item.purchasedQuantity} de {item.desiredQuantity} peças
              </p>
            </div>
            <span
              className={cn(
                "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                expenseCategory.chip,
              )}
            >
              {expenseCategory.label}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_1.3fr]">
            <div className="space-y-1.5">
              <Label htmlFor="purchase-quantity" className={labelClass}>
                Quantidade comprada *
              </Label>
              <Input
                id="purchase-quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className={cn(fieldClass, "text-center font-semibold")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purchase-total" className={labelClass}>
                Valor total pago *
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="purchase-total"
                  value={total}
                  inputMode="decimal"
                  autoFocus
                  onChange={(event) => setTotal(event.target.value)}
                  placeholder="0,00"
                  className={cn(fieldClass, "pl-10 font-semibold")}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="purchase-paid-by" className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3 w-3 text-primary" />
                  Quem pagou
                </span>
              </Label>
              <Input
                id="purchase-paid-by"
                value={paidBy}
                list="purchase-payer-options"
                maxLength={80}
                onChange={(event) => setPaidBy(event.target.value)}
                placeholder="Ex.: Ana"
                className={fieldClass}
              />
              <datalist id="purchase-payer-options">
                {payerSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purchase-date" className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3 text-primary" />
                  Data da compra *
                </span>
              </Label>
              <Input
                id="purchase-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-3xl bg-cream/70 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/80">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              Ao salvar
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-2xl bg-card/80 px-3 py-2">
                <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <ShoppingBag className="h-3 w-3" />
                  Enxoval
                </p>
                <p className="mt-0.5 font-display text-sm font-semibold text-foreground">
                  {purchasedAfter !== null
                    ? `${purchasedAfter} de ${item.desiredQuantity}`
                    : `${item.purchasedQuantity} de ${item.desiredQuantity}`}
                </p>
              </div>
              <div className="rounded-2xl bg-card/80 px-3 py-2">
                <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <Wallet className="h-3 w-3" />
                  Financeiro
                </p>
                <p className="mt-0.5 font-display text-sm font-semibold text-foreground">
                  {totalCents !== null ? formatCents(totalCents) : "—"}
                </p>
              </div>
            </div>
            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              O valor por unidade que fica salvo no enxoval é a média do que já foi pago
              {perUnitCents !== null && quantityValid
                ? ` (${centsToInput(perUnitCents)} nesta compra)`
                : ""}
              .{" "}
              {closesItem
                ? "Com essa quantidade o item fica Concluído."
                : "O item só fica Concluído quando alcançar a quantidade desejada."}
            </p>
          </div>

          {error && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-2xl text-sm font-semibold shadow-soft sm:w-auto sm:px-6"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="h-4 w-4" />
              )}
              Salvar compra
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={submitting}
              className="h-11 w-full rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
