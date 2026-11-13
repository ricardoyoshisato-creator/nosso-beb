import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { format } from "date-fns";
import {
  Camera,
  Gift as GiftIcon,
  ImagePlus,
  Loader2,
  PackagePlus,
  PackageSearch,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";

import { StorageImage } from "@/components/StorageImage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GIFT_BUCKET, MAX_ATTACHMENT_BYTES, formatFileSize } from "@/lib/attachments";
import { centsToInput, expenseCategoryMeta, formatCents, parseAmountToCents } from "@/lib/expenses";
import { giftPhotoFileName } from "@/lib/gifts";
import { layetteExpenseCategory } from "@/lib/layette";
import {
  formatQuantity,
  formatStock,
  inventoryUnitLabel,
  inventoryUnits,
  parseQuantity,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";
import type { Gift, InventoryItem, InventoryUnit, LayetteItem } from "@/types/database";

/** Entrada de estoque gerada pelo presente (opcional). */
export type GiftStockValues = {
  /** `null` quando o produto ainda não existe no estoque. */
  inventoryItemId: string | null;
  productName: string;
  unit: InventoryUnit;
  quantity: number;
};

export type GiftFormValues = {
  productName: string;
  dateReceived: string;
  giverName: string;
  quantity: number;
  description: string;
  notes: string;
  layetteItemId: string | null;
  photo: File | null;
  removePhoto: boolean;
  /** `null` = presente só registrado, sem mexer no estoque. */
  stock: GiftStockValues | null;
  /** `null` = presente sem custo para a família (nada lançado no Financeiro). */
  costCents: number | null;
};

type GiftFormProps = {
  gift?: Gift | null;
  layetteOptions: LayetteItem[];
  inventoryItems?: InventoryItem[];
  giverSuggestions?: string[];
  submitting?: boolean;
  onSubmit: (values: GiftFormValues) => void;
  onCancel?: () => void;
};

const labelClass = "text-xs font-semibold text-foreground/80";
const fieldClass =
  "h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40";
const NO_LINK = "none";
const NEW_STOCK_ITEM = "new";

export function GiftForm({
  gift,
  layetteOptions,
  inventoryItems = [],
  giverSuggestions = [],
  submitting = false,
  onSubmit,
  onCancel,
}: GiftFormProps) {
  const [productName, setProductName] = useState(gift?.product_name ?? "");
  const [dateReceived, setDateReceived] = useState(
    gift?.date_received ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [giverName, setGiverName] = useState(gift?.giver_name ?? "");
  const [quantity, setQuantity] = useState(String(gift?.quantity ?? 1));
  const [description, setDescription] = useState(gift?.description ?? "");
  const [notes, setNotes] = useState(gift?.notes ?? "");
  const [layetteItemId, setLayetteItemId] = useState(gift?.layette_item_id ?? NO_LINK);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [addToStock, setAddToStock] = useState(false);
  const [stockItemId, setStockItemId] = useState(NEW_STOCK_ITEM);
  const [stockProductName, setStockProductName] = useState("");
  const [stockUnit, setStockUnit] = useState<InventoryUnit>("un");
  const [stockQuantity, setStockQuantity] = useState("");
  const [hasCost, setHasCost] = useState(Boolean(gift?.cost_cents));
  const [cost, setCost] = useState(gift?.cost_cents ? centsToInput(gift.cost_cents) : "");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }

    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("A foto do presente precisa ser uma imagem (JPG, PNG ou WEBP).");
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(`“${file.name}” passa de 10 MB.`);
      return;
    }

    setError(null);
    setRemovePhoto(false);
    setPhoto(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleToggleStock = (checked: boolean) => {
    setAddToStock(checked);
    if (!checked) return;
    if (!stockQuantity.trim()) setStockQuantity(quantity);
    if (!stockProductName.trim()) setStockProductName(productName);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!productName.trim()) {
      setError("Informe o nome do presente.");
      return;
    }

    if (!dateReceived) {
      setError("Informe a data em que o presente foi recebido.");
      return;
    }

    const parsedQuantity = quantity.trim() === "" ? 1 : Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError("A quantidade precisa ser de pelo menos 1.");
      return;
    }

    let stock: GiftStockValues | null = null;
    if (addToStock) {
      const parsedStock = parseQuantity(stockQuantity);
      if (parsedStock === null || parsedStock <= 0) {
        setError("Informe a quantidade que entrou no estoque. Ex.: 120");
        return;
      }

      if (stockItemId === NEW_STOCK_ITEM && !stockProductName.trim()) {
        setError("Informe o nome do produto que vai para o estoque.");
        return;
      }

      stock = {
        inventoryItemId: stockItemId === NEW_STOCK_ITEM ? null : stockItemId,
        productName: stockProductName.trim(),
        unit: stockUnit,
        quantity: parsedStock,
      };
    }

    // Regra financeira: só entra despesa quando a família pagou por este presente.
    let costCents: number | null = null;
    if (hasCost) {
      costCents = parseAmountToCents(cost);
      if (costCents === null) {
        setError("Informe o valor que a família pagou. Ex.: 89,90");
        return;
      }
    }

    setError(null);
    onSubmit({
      productName: productName.trim(),
      dateReceived,
      giverName,
      quantity: parsedQuantity,
      description,
      notes,
      layetteItemId: layetteItemId === NO_LINK ? null : layetteItemId,
      photo,
      removePhoto,
      stock,
      costCents,
    });
  };

  const hasExistingPhoto = Boolean(gift?.photo_path) && !removePhoto && !photo;
  const linkedItem = layetteOptions.find((item) => item.id === layetteItemId) ?? null;

  const quantityValue = quantity.trim() === "" ? 1 : Number(quantity);
  const quantityValid = Number.isInteger(quantityValue) && quantityValue >= 1;
  // Ao editar, a quantidade antiga já está somada no enxoval: prevê só a diferença.
  const previousUnits = gift && linkedItem && gift.layette_item_id === linkedItem.id ? gift.quantity : 0;
  const layetteAfter =
    linkedItem && quantityValid
      ? Math.max(0, linkedItem.purchased_quantity + quantityValue - previousUnits)
      : null;

  const costCents = hasCost ? parseAmountToCents(cost) : null;
  const costCategory = expenseCategoryMeta[layetteExpenseCategory(linkedItem?.category ?? "outros")];

  const selectedStockItem = inventoryItems.find((item) => item.id === stockItemId) ?? null;
  const parsedStockQuantity = parseQuantity(stockQuantity);
  const stockUnitLabel = inventoryUnitLabel(
    selectedStockItem ? selectedStockItem.unit : stockUnit,
    parsedStockQuantity ?? 1,
  );
  const stockAfter =
    selectedStockItem && parsedStockQuantity !== null
      ? selectedStockItem.current_quantity + parsedStockQuantity
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="gift-name" className={labelClass}>
            Presente *
          </Label>
          <Input
            id="gift-name"
            value={productName}
            maxLength={120}
            autoFocus
            onChange={(event) => setProductName(event.target.value)}
            placeholder="Ex.: Macacão de tricô"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gift-date" className={labelClass}>
            Recebido em *
          </Label>
          <Input
            id="gift-date"
            type="date"
            value={dateReceived}
            onChange={(event) => setDateReceived(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="gift-giver" className={labelClass}>
            Quem presenteou
          </Label>
          <Input
            id="gift-giver"
            value={giverName}
            list="gift-giver-options"
            maxLength={120}
            onChange={(event) => setGiverName(event.target.value)}
            placeholder="Ex.: Tia Marcela"
            className={fieldClass}
          />
          <datalist id="gift-giver-options">
            {giverSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gift-quantity" className={labelClass}>
            {linkedItem ? "Unidades recebidas" : "Quantidade"}
          </Label>
          <Input
            id="gift-quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={cn(fieldClass, "text-center font-semibold")}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-3xl border border-border/70 bg-muted/40 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className={cn(labelClass, "flex items-center gap-1.5")}>
              <GiftIcon className="h-3.5 w-3.5 text-primary" />
              Vincular ao enxoval
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Opcional. Só aparecem itens que ainda não completaram a quantidade desejada.
            </p>
          </div>
        </div>

        <Select
          value={layetteItemId}
          onValueChange={setLayetteItemId}
          disabled={layetteOptions.length === 0}
        >
          <SelectTrigger className={cn(fieldClass, "w-full bg-card")} aria-label="Item do enxoval">
            <SelectValue placeholder="Não vincular" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value={NO_LINK}>Não vincular a nenhum item</SelectItem>
            {layetteOptions.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name} · {item.purchased_quantity} de {item.desired_quantity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {layetteOptions.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Todos os itens do enxoval já estão completos — cadastre novos itens em Enxoval para
            vincular este presente.
          </p>
        ) : linkedItem ? (
          <div className="rounded-2xl bg-mint/50 px-3 py-2 text-[11px] font-medium leading-relaxed text-mint-foreground">
            <p>
              {quantityValid ? (
                <>
                  <strong>
                    {quantityValue} {quantityValue === 1 ? "unidade" : "unidades"}
                  </strong>{" "}
                  somam em “{linkedItem.name}”: {linkedItem.purchased_quantity} de{" "}
                  {linkedItem.desired_quantity}
                  {layetteAfter !== null && <> → {layetteAfter} de {linkedItem.desired_quantity}</>}
                </>
              ) : (
                <>Informe a quantidade recebida para somar no item “{linkedItem.name}”.</>
              )}
            </p>
            <p className="mt-1 text-[10.5px] font-normal leading-relaxed text-mint-foreground/85">
              O item só fica Concluído quando a quantidade alcança {linkedItem.desired_quantity}{" "}
              peças.
            </p>
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Ao vincular, as unidades recebidas são somadas à quantidade do item — o item inteiro não
            é marcado como concluído.
          </p>
        )}
      </div>

      <div
        className={cn(
          "space-y-2.5 rounded-3xl border p-4 transition-colors",
          hasCost ? "border-primary/40 bg-primary/5" : "border-border/70 bg-muted/40",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Label
              htmlFor="gift-has-cost"
              className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-foreground/80"
            >
              <Wallet className="h-3.5 w-3.5 text-primary" />
              Gerou custo para a família?
            </Label>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Marque quando a família pagou por este presente. Desmarcado, nada vai para o
              Financeiro.
            </p>
          </div>
          <Checkbox
            id="gift-has-cost"
            checked={hasCost}
            onCheckedChange={(checked) => setHasCost(checked === true)}
            aria-label="Gerou custo para a família?"
            className="mt-0.5 shrink-0 border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
        </div>

        {hasCost && (
          <div className="space-y-2">
            <Label htmlFor="gift-cost" className={labelClass}>
              Valor (R$) *
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                id="gift-cost"
                value={cost}
                inputMode="decimal"
                onChange={(event) => setCost(event.target.value)}
                placeholder="0,00"
                className={cn(fieldClass, "pl-10 font-semibold")}
              />
            </div>

            <p className="flex items-start gap-1.5 rounded-2xl bg-card px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <Receipt className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span>
                Vai entrar no Financeiro como{" "}
                <strong className="text-foreground/80">{costCategory.label}</strong>
                {costCents !== null ? ` · ${formatCents(costCents)}` : ""}. Ao desmarcar, a despesa
                é removida.
              </span>
            </p>
          </div>
        )}
      </div>

      {gift ? (
        gift.inventory_item_id ? (
          <div className="flex items-start gap-2 rounded-3xl border border-border/70 bg-muted/40 p-4">
            <PackageSearch className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Este presente já registrou entrada no estoque
              {gift.stock_quantity !== null
                ? ` (${formatQuantity(gift.stock_quantity)})`
                : ""}
              . O histórico de movimentações fica na tela de Estoque.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-3xl border border-border/70 bg-muted/40 p-4">
            <PackageSearch className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Este presente não entrou no estoque. Para somar a quantidade depois, registre uma
              entrada na tela de Estoque.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-2.5 rounded-3xl border border-border/70 bg-muted/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={cn(labelClass, "flex items-center gap-1.5")}>
                <PackagePlus className="h-3.5 w-3.5 text-primary" />
                Adicionar ao estoque
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Para consumíveis (fraldas, lenços, pomadas): a quantidade entra no Estoque como
                entrada de presente.
              </p>
            </div>
            <Switch
              checked={addToStock}
              onCheckedChange={handleToggleStock}
              aria-label="Adicionar ao estoque"
              className="mt-0.5 shrink-0"
            />
          </div>

          {addToStock && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>Produto no estoque</Label>
                <Select value={stockItemId} onValueChange={setStockItemId}>
                  <SelectTrigger
                    className={cn(fieldClass, "w-full bg-card")}
                    aria-label="Produto do estoque"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value={NEW_STOCK_ITEM}>Novo produto no estoque</SelectItem>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.product_name} · {formatStock(item.current_quantity, item.unit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {stockItemId === NEW_STOCK_ITEM && (
                <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr]">
                  <div className="space-y-1.5">
                    <Label htmlFor="gift-stock-name" className={labelClass}>
                      Produto *
                    </Label>
                    <Input
                      id="gift-stock-name"
                      value={stockProductName}
                      maxLength={120}
                      onChange={(event) => setStockProductName(event.target.value)}
                      placeholder="Ex.: Fralda descartável"
                      className={fieldClass}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className={labelClass}>Unidade</Label>
                    <Select
                      value={stockUnit}
                      onValueChange={(value) => setStockUnit(value as InventoryUnit)}
                    >
                      <SelectTrigger className={cn(fieldClass, "w-full bg-card")} aria-label="Unidade">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {inventoryUnits.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value} · {inventoryUnitLabel(value, 2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="gift-stock-quantity" className={labelClass}>
                  Quantidade que entrou *
                </Label>
                <Input
                  id="gift-stock-quantity"
                  value={stockQuantity}
                  inputMode="decimal"
                  onChange={(event) => setStockQuantity(event.target.value)}
                  placeholder="Ex.: 120"
                  className={cn(fieldClass, "font-semibold")}
                />
              </div>

              <p className="rounded-2xl bg-mint/50 px-3 py-2 text-[11px] font-medium leading-relaxed text-mint-foreground">
                {parsedStockQuantity !== null && parsedStockQuantity > 0
                  ? `${formatQuantity(parsedStockQuantity)} ${stockUnitLabel} entram no estoque${
                      stockAfter !== null
                        ? ` (o saldo vai para ${formatQuantity(stockAfter)})`
                        : ""
                    }. `
                  : ""}
                A entrada no estoque não cria despesa própria.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="gift-description" className={labelClass}>
            Descrição
          </Label>
          <Textarea
            id="gift-description"
            value={description}
            rows={2}
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex.: Conjunto tamanho RN, cor bege"
            className="min-h-[72px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gift-notes" className={labelClass}>
            Observações
          </Label>
          <Textarea
            id="gift-notes"
            value={notes}
            rows={2}
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: entregue no chá de bebê"
            className="min-h-[72px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className={labelClass}>Foto do presente</Label>

        {hasExistingPhoto && gift?.photo_path ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 p-2.5">
            <StorageImage
              bucket={GIFT_BUCKET}
              path={gift.photo_path}
              alt={gift.product_name}
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {giftPhotoFileName(gift.photo_path)}
              </p>
              <p className="text-[10px] text-muted-foreground">Foto atual do presente</p>
            </div>
            <button
              type="button"
              onClick={() => setRemovePhoto(true)}
              aria-label="Remover foto"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : photo && photoPreview ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 p-2.5">
            <img
              src={photoPreview}
              alt="Prévia da foto"
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{photo.name}</p>
              <p className="text-[10px] text-muted-foreground">{formatFileSize(photo.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => setPhoto(null)}
              aria-label="Descartar foto"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background px-4 py-3 text-xs font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-60"
          >
            <ImagePlus className="h-4 w-4 text-primary" />
            {removePhoto && gift?.photo_path ? "Escolher nova foto" : "Adicionar foto"}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleFile(event.target.files)}
          className="sr-only"
          aria-label="Selecionar foto do presente"
        />

        <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Camera className="h-3 w-3 shrink-0" />
          Opcional · imagem até 10 MB, guardada no armazenamento privado da família.
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
            <GiftIcon className="h-4 w-4" />
          )}
          {gift ? "Salvar alterações" : "Registrar presente"}
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
