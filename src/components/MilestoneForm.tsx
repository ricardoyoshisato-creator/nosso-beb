import { useState } from "react";
import type { FormEvent } from "react";
import { CalendarDays, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/family";
import { gestationWeekOn, todayISO } from "@/lib/pregnancy";

export type MilestoneFormValues = {
  title: string;
  eventDate: string;
  description: string;
};

type MilestoneFormProps = {
  referenceDate?: string | null;
  submitting?: boolean;
  onSubmit: (values: MilestoneFormValues) => void;
  onCancel?: () => void;
};

export function MilestoneForm({
  referenceDate,
  submitting = false,
  onSubmit,
  onCancel,
}: MilestoneFormProps) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const week = referenceDate && eventDate ? gestationWeekOn(referenceDate, eventDate) : null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Dê um nome para o marco.");
      return;
    }

    if (title.trim().length > 80) {
      setError("O título pode ter no máximo 80 caracteres.");
      return;
    }

    if (!eventDate) {
      setError("Informe a data do marco.");
      return;
    }

    if (description.trim().length > 500) {
      setError("A descrição pode ter no máximo 500 caracteres.");
      return;
    }

    setError(null);
    onSubmit({ title: title.trim(), eventDate, description: description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="milestone-title" className="text-xs font-semibold text-foreground/80">
          Título do marco
        </Label>
        <Input
          id="milestone-title"
          value={title}
          maxLength={80}
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Primeiro chute do bebê"
          className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="milestone-date" className="text-xs font-semibold text-foreground/80">
          Data
        </Label>
        <Input
          id="milestone-date"
          type="date"
          required
          value={eventDate}
          onChange={(event) => setEventDate(event.target.value)}
          className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
        {eventDate && (
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <CalendarDays className="h-3 w-3 shrink-0" />
            {formatDate(eventDate)}
            {referenceDate
              ? week === null
                ? " · antes da data de referência"
                : ` · semana ${week} da gestação`
              : ""}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="milestone-description" className="text-xs font-semibold text-foreground/80">
          Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="milestone-description"
          value={description}
          maxLength={500}
          rows={3}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Como foi esse momento? O que vocês sentiram?"
          className="min-h-[90px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
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
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Salvar marco
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
