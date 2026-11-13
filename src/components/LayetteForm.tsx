import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Loader2, PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { centsToInput, parseAmountToCents } from "@/lib/expenses";
import {
  layetteCategories,
  layetteCategoryMeta,
  layetteStatusMeta,
  layetteStatuses,
} from "@/lib/layette";
import { cn } from "@/lib/utils";
import type { LayetteCategory, LayetteItem, LayetteStatus } from "@/types/database";

export type LayetteFormValues = {
  name: string;
  category: LayetteCategory;
  desiredQuantity: number;
  purchasedQuantity: number;
  estimatedPriceCents: number | null;
  actualPriceCents: number | null;
  storeLink: string;
  responsible: string;
  status: LayetteStatus;
  notes: string;
};

type LayetteFormProps = {
  item?: LayetteItem | null;
  responsibleSuggestions?: string[];
  submitting?: boolean;
  onSubmit: (values: LayetteFormValues) => void;
  onCancel?: () => void;
};

const labelClass = "text-xs font-semibold text-foreground/80";
const fieldClass =
  "h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40";

export function LayetteForm({
  item,
  responsibleSuggestions = [],
  submitting = false,
  onSubmit,
  onCancel,
}: LayetteFormProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<LayetteCategory>(item?.category ?? "roupas");
  const [desiredQuantity, setDesiredQuantity] = useState(String(item?.desired_quantity ?? 1));
  const [purchasedQuantity, setPurchasedQuantity] = useState(
    String(item?.purchased_quantity ?? 0),
  );
  const [estimatedPrice, setEstimatedPrice] = useState(
    item?.estimated_price_cents ? centsToInput(item.estimated_price_cents) : "",
  );
  const [actualPrice, setActualPrice] = useState(
    item?.actual_price_cents ? centsToInput(item.actual_price_cents) : "",
  );
  const [storeLink, setStoreLink] = useState(item?.store_link ?? "");
  const [responsible, setResponsible] = useState(item?.responsible ?? "");
  const [status, setStatus] = useState<LayetteStatus>(item?.status ?? "desejado");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Informe o nome do produto.");
      return;
    }

    const desired = Number(desiredQuantity);
    if (!Number.isInteger(desired) || desired < 1) {
      setError("A quantidade desejada precisa ser de pelo menos 1.");
      return;
    }

    const purchased = purchasedQuantity.trim() === "" ? 0 : Number(purchasedQuantity);
    if (!Number.isInteger(purchased) || purchased < 0) {
      setError("A quantidade comprada não pode ser negativa.");
      return;
    }

    if (estimatedPrice.trim() && parseAmountToCents(estimatedPrice) === null) {
      setError("Informe um preço estimado válido. Ex.: 89,90");
      return;
    }

    if (actualPrice.trim() && parseAmountToCents(actualPrice) === null) {
      setError("Informe um preço real válido. Ex.: 79,90");
      return;
    }

    const link = storeLink.trim();
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      setError("O link da loja precisa começar com http:// ou https://");
      return;
    }

    setError(null);
    onSubmit({
      name: name.trim(),
      category,
      desiredQuantity: desired,
      purchasedQuantity: purchased,
      estimatedPriceCents: estimatedPrice.trim() ? parseAmountToCents(estimatedPrice) : null,
      actualPriceCents: actualPrice.trim() ? parseAmountToCents(actualPrice) : null,
      storeLink: link,
      responsible,
      status,
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="layette-name" className={labelClass}>
          Nome do produto *
        </Label>
        <Input
          id="layette-name"
          value={name}
          maxLength={120}
          autoFocus
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Body manga curta (RN)"
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className={labelClass}>Categoria *</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as LayetteCategory)}>
            <SelectTrigger className={cn(fieldClass, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {layetteCategories.map((value) => (
                <SelectItem key={value} value={value}>
                  {layetteCategoryMeta[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="layette-desired" className={labelClass}>
              Desejada *
            </Label>
            <Input
              id="layette-desired"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              value={desiredQuantity}
              onChange={(event) => setDesiredQuantity(event.target.value)}
              className={cn(fieldClass, "text-center font-semibold")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="layette-purchased" className={labelClass}>
              Comprada
            </Label>
            <Input
              id="layette-purchased"
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              value={purchasedQuantity}
              onChange={(event) => setPurchasedQuantity(event.target.value)}
              className={cn(fieldClass, "text-center font-semibold")}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="layette-estimated" className={labelClass}>
            Preço estimado (por unidade)
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              R$
            </span>
            <Input
              id="layette-estimated"
              value={estimatedPrice}
              inputMode="decimal"
              onChange={(event) => setEstimatedPrice(event.target.value)}
              placeholder="0,00"
              className={cn(fieldClass, "pl-10 font-semibold")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="layette-actual" className={labelClass}>
            Preço real pago (por unidade)
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              R$
            </span>
            <Input
              id="layette-actual"
              value={actualPrice}
              inputMode="decimal"
              onChange={(event) => setActualPrice(event.target.value)}
              placeholder="0,00"
              className={cn(fieldClass, "pl-10 font-semibold")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className={labelClass}>Status</Label>
        <div className="flex flex-wrap gap-1.5">
          {layetteStatuses.map((value) => {
            const meta = layetteStatusMeta[value];
            const active = status === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all",
                  active
                    ? cn(meta.chip, "ring-2 ring-primary/30")
                    : "border border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                <meta.icon className="h-3.5 w-3.5" />
                {meta.label}
                {active && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>

        {status === "comprado" && item?.status !== "comprado" && (
          <p className="rounded-2xl bg-primary/10 px-3 py-2 text-[11px] leading-relaxed text-[hsl(13,62%,38%)]">
            O status conta a origem das peças. Para somar unidades compradas e lançar o gasto no
            Financeiro, use <strong>Registrar compra</strong> no card do item.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="layette-responsible" className={labelClass}>
            Responsável
          </Label>
          <Input
            id="layette-responsible"
            value={responsible}
            list="layette-responsible-options"
            maxLength={80}
            onChange={(event) => setResponsible(event.target.value)}
            placeholder="Ex.: Ana"
            className={fieldClass}
          />
          <datalist id="layette-responsible-options">
            {responsibleSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="layette-link" className={labelClass}>
            Link da loja
          </Label>
          <Input
            id="layette-link"
            type="url"
            value={storeLink}
            maxLength={500}
            onChange={(event) => setStoreLink(event.target.value)}
            placeholder="https://…"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="layette-notes" className={labelClass}>
          Observações
        </Label>
        <Textarea
          id="layette-notes"
          value={notes}
          rows={2}
          maxLength={500}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Tamanho, cor, onde viu mais barato…"
          className="min-h-[72px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
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
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
          {item ? "Salvar alterações" : "Adicionar ao enxoval"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-11 w-full rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted sm:w-auto"
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
