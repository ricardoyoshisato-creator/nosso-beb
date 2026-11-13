import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { format } from "date-fns";
import { AlertTriangle, Clock3, History, Loader2, Plus } from "lucide-react";

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
import {
  formatMovementDate,
  formatQuantity,
  formatStock,
  inventoryMovementMeta,
  inventoryMovementTypes,
  inventoryUnitLabel,
  isLowStock,
  movementQuantityLabel,
  parseQuantity,
  previewQuantity,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";
import type {
  InventoryItem,
  InventoryMovement,
  InventoryMovementType,
} from "@/types/database";

export type MovementFormValues = {
  movementType: InventoryMovementType;
  quantity: number;
  occurredAt: string;
  notes: string;
};

type InventoryHistoryDialogProps = {
  item: InventoryItem | null;
  movements: InventoryMovement[];
  memberNames: Map<string, string>;
  canRecord: boolean;
  submitting: boolean;
  resetSignal: number;
  onClose: () => void;
  onSubmit: (values: MovementFormValues) => void;
};

function localDateTimeValue(date = new Date()) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

type MovementFormProps = {
  item: InventoryItem;
  submitting: boolean;
  resetSignal: number;
  onSubmit: (values: MovementFormValues) => void;
};

function MovementForm({ item, submitting, resetSignal, onSubmit }: MovementFormProps) {
  const [movementType, setMovementType] = useState<InventoryMovementType>("entrada_compra");
  const [quantity, setQuantity] = useState("");
  const [occurredAt, setOccurredAt] = useState(localDateTimeValue());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resetSignal === 0) return;
    setQuantity("");
    setNotes("");
    setOccurredAt(localDateTimeValue());
    setError(null);
  }, [resetSignal]);

  const meta = inventoryMovementMeta[movementType];
  const isAdjustment = movementType === "ajuste_manual";
  const parsed = parseQuantity(quantity);
  const preview = parsed === null ? null : previewQuantity(item.current_quantity, movementType, parsed);
  const exceedsStock = !isAdjustment && meta.direction === "saida" && parsed !== null && parsed > item.current_quantity;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (parsed === null) {
      setError("Informe uma quantidade válida. Ex.: 2 ou 1,5");
      return;
    }

    if (!isAdjustment && parsed <= 0) {
      setError("A quantidade precisa ser maior que zero.");
      return;
    }

    if (!occurredAt) {
      setError("Informe a data e a hora da movimentação.");
      return;
    }

    const instant = new Date(occurredAt);
    if (Number.isNaN(instant.getTime())) {
      setError("Data e hora inválidas.");
      return;
    }

    if (exceedsStock) {
      setError("A saída é maior que o estoque atual. Faça um ajuste manual se o saldo estiver errado.");
      return;
    }

    setError(null);
    onSubmit({
      movementType,
      quantity: parsed,
      occurredAt: instant.toISOString(),
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border/70 bg-muted/40 p-4">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Plus className="h-3.5 w-3.5 text-primary" />
          Nova movimentação
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          O saldo do produto é atualizado automaticamente ao salvar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {inventoryMovementTypes.map((value) => {
          const typeMeta = inventoryMovementMeta[value];
          const active = movementType === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setMovementType(value);
                setError(null);
              }}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2 text-[11px] font-semibold transition-all",
                active
                  ? cn(typeMeta.chip, "ring-2 ring-primary/25")
                  : "border border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              <typeMeta.icon className="h-3.5 w-3.5" />
              {typeMeta.shortLabel}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="movement-quantity" className="text-[11px] font-semibold text-foreground/80">
            {isAdjustment ? "Nova quantidade" : "Quantidade"}
          </Label>
          <Input
            id="movement-quantity"
            value={quantity}
            inputMode="decimal"
            onChange={(event) => setQuantity(event.target.value)}
            placeholder={isAdjustment ? "Saldo correto" : "0"}
            className="h-10 rounded-2xl border-border bg-card text-sm font-semibold focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="movement-date" className="text-[11px] font-semibold text-foreground/80">
            Data e hora
          </Label>
          <Input
            id="movement-date"
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            className="h-10 rounded-2xl border-border bg-card text-[12.5px] focus-visible:ring-primary/40"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="movement-notes" className="text-[11px] font-semibold text-foreground/80">
          Observações
        </Label>
        <Input
          id="movement-notes"
          value={notes}
          maxLength={500}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ex.: compra no mercado, usado no banho…"
          className="h-10 rounded-2xl border-border bg-card text-sm focus-visible:ring-primary/40"
        />
      </div>

      <p
        className={cn(
          "rounded-2xl px-3 py-2 text-[11px] font-medium leading-relaxed",
          exceedsStock
            ? "bg-destructive/10 text-destructive"
            : "bg-card text-foreground/75",
        )}
      >
        {exceedsStock && parsed !== null ? (
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Saída maior que o saldo atual ({formatStock(item.current_quantity, item.unit)}).
          </span>
        ) : preview !== null ? (
          <>
            Saldo: <strong>{formatStock(item.current_quantity, item.unit)}</strong> →{" "}
            <strong>{formatStock(preview, item.unit)}</strong>
          </>
        ) : (
          <>
            Saldo atual: <strong>{formatStock(item.current_quantity, item.unit)}</strong>
          </>
        )}
      </p>

      {error && (
        <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-[11px] font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="h-10 w-full rounded-2xl text-sm font-semibold shadow-soft"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
        Registrar movimentação
      </Button>
    </form>
  );
}

export function InventoryHistoryDialog({
  item,
  movements,
  memberNames,
  canRecord,
  submitting,
  resetSignal,
  onClose,
  onSubmit,
}: InventoryHistoryDialogProps) {
  const low = item ? isLowStock(item) : false;

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{item.product_name}</DialogTitle>
              <DialogDescription>
                {[item.brand, item.size ? `Tam. ${item.size}` : null]
                  .filter(Boolean)
                  .join(" · ") || "Histórico de movimentações do produto"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-end justify-between gap-3 rounded-3xl border border-border/70 bg-muted/40 p-4">
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Quantidade atual
                </p>
                <p
                  className={cn(
                    "font-display text-2xl font-semibold leading-none",
                    low ? "text-destructive" : "text-foreground",
                  )}
                >
                  {formatQuantity(item.current_quantity)}{" "}
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {inventoryUnitLabel(item.unit, item.current_quantity)}
                  </span>
                </p>
                <p className="mt-1 text-[10.5px] text-muted-foreground">
                  Mínimo {formatStock(item.minimum_stock, item.unit)}
                </p>
              </div>

              {low && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-semibold text-destructive-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  Estoque baixo
                </span>
              )}
            </div>

            {canRecord ? (
              <MovementForm
                item={item}
                submitting={submitting}
                resetSignal={resetSignal}
                onSubmit={onSubmit}
              />
            ) : (
              <p className="rounded-2xl bg-secondary/40 px-3 py-2.5 text-[11px] leading-relaxed text-secondary-foreground/85">
                Seu papel permite consultar o histórico, mas não registrar movimentações. Peça a um
                administrador para liberar a permissão de adicionar registros.
              </p>
            )}

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Histórico de movimentações
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {movements.length} {movements.length === 1 ? "registro" : "registros"}
                </span>
              </div>

              {movements.length > 0 ? (
                <ul className="space-y-2">
                  {movements.map((movement) => {
                    const meta = inventoryMovementMeta[movement.movement_type];
                    const who = movement.user_id
                      ? memberNames.get(movement.user_id) ?? "Alguém da família"
                      : "Alguém da família";

                    return (
                      <li
                        key={movement.id}
                        className="rounded-2xl border border-border/70 bg-card px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              meta.chip,
                            )}
                          >
                            <meta.icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          <span
                            className={cn(
                              "font-display text-sm font-semibold",
                              meta.direction === "entrada"
                                ? "text-[hsl(164,34%,30%)]"
                                : meta.direction === "saida"
                                  ? "text-[hsl(13,55%,42%)]"
                                  : "text-foreground/80",
                            )}
                          >
                            {movementQuantityLabel(movement)}{" "}
                            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                              {inventoryUnitLabel(item.unit, movement.quantity)}
                            </span>
                          </span>
                        </div>

                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3 shrink-0" />
                            {formatMovementDate(movement.occurred_at)}
                          </span>
                          <span aria-hidden>·</span>
                          <span className="truncate">{who}</span>
                        </p>

                        {movement.notes && (
                          <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground/90">
                            {movement.notes}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-2xl bg-muted/60 px-3 py-4 text-[11px] leading-relaxed text-muted-foreground">
                  Nenhuma movimentação registrada ainda. Registre a primeira entrada ou saída acima
                  para começar o histórico.
                </p>
              )}
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
