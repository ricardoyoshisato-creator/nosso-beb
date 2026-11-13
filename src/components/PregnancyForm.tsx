import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CalendarDays, Loader2, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/family";
import { estimateDueDate, todayISO } from "@/lib/pregnancy";
import type { PregnancyReferenceType } from "@/types/database";
import { cn } from "@/lib/utils";

export type PregnancyFormValues = {
  referenceDate: string;
  referenceType: PregnancyReferenceType;
  cycleLength: number;
  dueDate: string;
  notes: string;
};

type PregnancyFormProps = {
  initialValues?: Partial<PregnancyFormValues>;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: PregnancyFormValues) => void;
  onCancel?: () => void;
};

const referenceOptions: {
  id: PregnancyReferenceType;
  label: string;
  hint: string;
}[] = [
  { id: "dum", label: "DUM", hint: "Primeiro dia da última menstruação" },
  { id: "reference", label: "Data de referência", hint: "Ex.: data do primeiro ultrassom" },
];

export function PregnancyForm({
  initialValues,
  submitLabel,
  submitting = false,
  onSubmit,
  onCancel,
}: PregnancyFormProps) {
  const [referenceType, setReferenceType] = useState<PregnancyReferenceType>(
    initialValues?.referenceType ?? "dum",
  );
  const [referenceDate, setReferenceDate] = useState(initialValues?.referenceDate ?? "");
  const [cycleLength, setCycleLength] = useState(initialValues?.cycleLength ?? 28);
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  // Se a DPP salva difere da calculada, ela foi ajustada manualmente: preservamos.
  const [manualDueDate, setManualDueDate] = useState(() => {
    if (!initialValues?.dueDate || !initialValues.referenceDate) return false;
    const auto = estimateDueDate(
      initialValues.referenceDate,
      initialValues.referenceType ?? "dum",
      initialValues.cycleLength ?? 28,
    );
    return initialValues.dueDate !== auto;
  });
  const [error, setError] = useState<string | null>(null);

  // A DPP é recalculada sempre que a referência muda (até ser editada à mão).
  useEffect(() => {
    if (!referenceDate || manualDueDate) return;
    setDueDate(estimateDueDate(referenceDate, referenceType, cycleLength));
  }, [cycleLength, manualDueDate, referenceDate, referenceType]);

  const recalculate = () => {
    setManualDueDate(false);
    if (referenceDate) setDueDate(estimateDueDate(referenceDate, referenceType, cycleLength));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!referenceDate) {
      setError("Informe a data para calcular a gestação.");
      return;
    }

    if (referenceDate > todayISO()) {
      setError("A data de referência não pode estar no futuro.");
      return;
    }

    if (!dueDate) {
      setError("Informe a data provável do parto.");
      return;
    }

    if (dueDate <= referenceDate) {
      setError("A data provável do parto precisa ser depois da data de referência.");
      return;
    }

    if (cycleLength < 20 || cycleLength > 45) {
      setError("O ciclo menstrual deve ficar entre 20 e 45 dias.");
      return;
    }

    setError(null);
    onSubmit({ referenceDate, referenceType, cycleLength, dueDate, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-foreground/80">Como quer calcular?</Label>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
          {referenceOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setReferenceType(option.id);
                setManualDueDate(false);
              }}
              aria-pressed={referenceType === option.id}
              className={cn(
                "rounded-xl px-2 py-2 text-xs font-semibold transition-all",
                referenceType === option.id
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {referenceOptions.find((option) => option.id === referenceType)?.hint}. A contagem das
          semanas começa nessa data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reference-date" className="text-xs font-semibold text-foreground/80">
            {referenceType === "dum" ? "Data da DUM" : "Data de referência"}
          </Label>
          <Input
            id="reference-date"
            type="date"
            required
            max={todayISO()}
            value={referenceDate}
            onChange={(event) => setReferenceDate(event.target.value)}
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        {referenceType === "dum" && (
          <div className="space-y-1.5">
            <Label htmlFor="cycle-length" className="text-xs font-semibold text-foreground/80">
              Duração do ciclo (dias)
            </Label>
            <Input
              id="cycle-length"
              type="number"
              inputMode="numeric"
              min={20}
              max={45}
              value={cycleLength}
              onChange={(event) => setCycleLength(Number(event.target.value))}
              className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="due-date" className="text-xs font-semibold text-foreground/80">
            Data provável do parto (DPP)
          </Label>
          {manualDueDate && (
            <button
              type="button"
              onClick={recalculate}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition-colors hover:text-primary/80"
            >
              <RotateCcw className="h-3 w-3" />
              Recalcular
            </button>
          )}
        </div>
        <Input
          id="due-date"
          type="date"
          required
          value={dueDate}
          onChange={(event) => {
            setManualDueDate(true);
            setDueDate(event.target.value);
          }}
          className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Sugerimos 40 semanas a partir da referência. Se o seu médico ajustou a data, pode trocar
          aqui.
        </p>
      </div>

      {dueDate && referenceDate && dueDate > referenceDate && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/8 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-soft">
            <CalendarDays className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              DPP estimada
            </p>
            <p className="font-display text-base font-semibold leading-tight text-foreground">
              {formatDate(dueDate)}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="pregnancy-notes" className="text-xs font-semibold text-foreground/80">
          Observações <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="pregnancy-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Ex.: DPP confirmada na ultrassom de 12 semanas."
          className="min-h-[84px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
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
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {submitLabel}
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
