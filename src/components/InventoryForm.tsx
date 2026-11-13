import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, PackagePlus } from "lucide-react";

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
import {
  inventoryUnitLabel,
  inventoryUnits,
  parseQuantity,
  quantityToInput,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";
import type { InventoryItem, InventoryUnit } from "@/types/database";

export type InventoryFormValues = {
  productName: string;
  brand: string;
  size: string;
  currentQuantity: number;
  unit: InventoryUnit;
  minimumStock: number;
};

type InventoryFormProps = {
  item?: InventoryItem | null;
  submitting?: boolean;
  onSubmit: (values: InventoryFormValues) => void;
  onCancel?: () => void;
};

const labelClass = "text-xs font-semibold text-foreground/80";
const fieldClass =
  "h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40";

export function InventoryForm({ item, submitting = false, onSubmit, onCancel }: InventoryFormProps) {
  const [productName, setProductName] = useState(item?.product_name ?? "");
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [size, setSize] = useState(item?.size ?? "");
  const [currentQuantity, setCurrentQuantity] = useState(
    item ? quantityToInput(item.current_quantity) : "",
  );
  const [minimumStock, setMinimumStock] = useState(
    item ? quantityToInput(item.minimum_stock) : "",
  );
  const [unit, setUnit] = useState<InventoryUnit>(item?.unit ?? "un");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!productName.trim()) {
      setError("Informe o nome do produto.");
      return;
    }

    const quantity = currentQuantity.trim() === "" ? 0 : parseQuantity(currentQuantity);
    if (quantity === null) {
      setError("Informe uma quantidade atual válida. Ex.: 3 ou 2,5");
      return;
    }

    const minimum = minimumStock.trim() === "" ? 0 : parseQuantity(minimumStock);
    if (minimum === null) {
      setError("Informe um estoque mínimo válido. Ex.: 2");
      return;
    }

    setError(null);
    onSubmit({
      productName: productName.trim(),
      brand,
      size,
      currentQuantity: quantity,
      unit,
      minimumStock: minimum,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="inventory-name" className={labelClass}>
          Produto *
        </Label>
        <Input
          id="inventory-name"
          value={productName}
          maxLength={120}
          autoFocus
          onChange={(event) => setProductName(event.target.value)}
          placeholder="Ex.: Fralda descartável"
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inventory-brand" className={labelClass}>
            Marca
          </Label>
          <Input
            id="inventory-brand"
            value={brand}
            maxLength={80}
            onChange={(event) => setBrand(event.target.value)}
            placeholder="Ex.: Pampers"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inventory-size" className={labelClass}>
            Tamanho
          </Label>
          <Input
            id="inventory-size"
            value={size}
            maxLength={40}
            onChange={(event) => setSize(event.target.value)}
            placeholder="Ex.: RN, P, 200 ml"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="inventory-quantity" className={labelClass}>
            Quantidade atual *
          </Label>
          <Input
            id="inventory-quantity"
            value={currentQuantity}
            inputMode="decimal"
            onChange={(event) => setCurrentQuantity(event.target.value)}
            placeholder="0"
            className={cn(fieldClass, "font-semibold")}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Unidade *</Label>
          <Select value={unit} onValueChange={(value) => setUnit(value as InventoryUnit)}>
            <SelectTrigger className={cn(fieldClass, "w-full")}>
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

      <div className="space-y-1.5">
        <Label htmlFor="inventory-minimum" className={labelClass}>
          Estoque mínimo *
        </Label>
        <Input
          id="inventory-minimum"
          value={minimumStock}
          inputMode="decimal"
          onChange={(event) => setMinimumStock(event.target.value)}
          placeholder="Ex.: 2"
          className={cn(fieldClass, "font-semibold")}
        />
        <p className="rounded-2xl bg-sun/40 px-3 py-2 text-[11px] leading-relaxed text-sun-foreground">
          O alerta de <strong>Estoque baixo</strong> aparece quando a quantidade atual for menor ou
          igual a este valor.
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
            <PackagePlus className="h-4 w-4" />
          )}
          {item ? "Salvar alterações" : "Cadastrar produto"}
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
