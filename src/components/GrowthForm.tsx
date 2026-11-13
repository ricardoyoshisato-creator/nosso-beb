import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Ruler, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseMeasure, toMeasureInput, todayISO } from "@/lib/baby";
import { growthRanges } from "@/lib/growth";
import type { GrowthRecord } from "@/types/database";

export type GrowthFormValues = {
  measurementDate: string;
  weight: number | null;
  height: number | null;
  headCircumference: number | null;
};

type GrowthFormProps = {
  record?: GrowthRecord | null;
  submitting?: boolean;
  onSubmit: (values: GrowthFormValues) => void;
  onCancel?: () => void;
};

const labelClass = "text-xs font-semibold text-foreground/80";
const fieldClass =
  "h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40";

export function GrowthForm({ record, submitting = false, onSubmit, onCancel }: GrowthFormProps) {
  const [measurementDate, setMeasurementDate] = useState(
    record?.measurement_date ?? todayISO(),
  );
  const [weight, setWeight] = useState(toMeasureInput(record?.weight));
  const [height, setHeight] = useState(toMeasureInput(record?.height));
  const [head, setHead] = useState(toMeasureInput(record?.head_circumference));
  const [error, setError] = useState<string | null>(null);

  const checkMeasure = (
    raw: string,
    range: { min: number; max: number },
    label: string,
    unit: string,
  ) => {
    if (!raw.trim()) return { value: null, error: null };
    const value = parseMeasure(raw);
    if (value === null) {
      return { value: null, error: `${label}: use apenas números (ex.: 4,25).` };
    }
    if (value < range.min || value > range.max) {
      return {
        value: null,
        error: `${label} deve ficar entre ${toMeasureInput(range.min)} e ${toMeasureInput(range.max)} ${unit}.`,
      };
    }
    return { value, error: null };
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!measurementDate) {
      setError("Informe a data da medição.");
      return;
    }

    if (measurementDate > todayISO()) {
      setError("A data da medição não pode estar no futuro.");
      return;
    }

    const parsedWeight = checkMeasure(weight, growthRanges.weight, "Peso", "kg");
    const parsedHeight = checkMeasure(height, growthRanges.height, "Altura", "cm");
    const parsedHead = checkMeasure(head, growthRanges.head, "Perímetro cefálico", "cm");
    const measureError = parsedWeight.error ?? parsedHeight.error ?? parsedHead.error;

    if (measureError) {
      setError(measureError);
      return;
    }

    if (
      parsedWeight.value === null &&
      parsedHeight.value === null &&
      parsedHead.value === null
    ) {
      setError("Preencha pelo menos uma medida: peso, altura ou perímetro cefálico.");
      return;
    }

    setError(null);
    onSubmit({
      measurementDate,
      weight: parsedWeight.value,
      height: parsedHeight.value,
      headCircumference: parsedHead.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="growth-date" className={labelClass}>
          Data da medição *
        </Label>
        <Input
          id="growth-date"
          type="date"
          required
          max={todayISO()}
          value={measurementDate}
          onChange={(event) => setMeasurementDate(event.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="growth-weight" className={labelClass}>
            Peso (kg)
          </Label>
          <Input
            id="growth-weight"
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            placeholder="4,25"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="growth-height" className={labelClass}>
            Altura (cm)
          </Label>
          <Input
            id="growth-height"
            inputMode="decimal"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            placeholder="55,5"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="growth-head" className={labelClass}>
            Perímetro (cm)
          </Label>
          <Input
            id="growth-head"
            inputMode="decimal"
            value={head}
            onChange={(event) => setHead(event.target.value)}
            placeholder="37,2"
            className={fieldClass}
          />
        </div>
      </div>

      <p className="flex items-start gap-1.5 rounded-2xl bg-muted/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        Preencha o que foi medido — só o peso, só a altura ou as três medidas juntas.
      </p>

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
            <Sparkles className="h-4 w-4" />
          )}
          {record ? "Salvar alterações" : "Salvar medição"}
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
