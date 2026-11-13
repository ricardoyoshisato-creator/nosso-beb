import { useState } from "react";
import type { FormEvent } from "react";
import { Clock, Loader2, Pill, Plus, X } from "lucide-react";

import { AttachmentPicker } from "@/components/AttachmentPicker";
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
import { centsToInput, formatCents, parseAmountToCents } from "@/lib/expenses";
import { dosageUnitOptions, frequencyMeta, frequencyOptions, todayString } from "@/lib/medications";
import type { Medication, MedicationAttachment, MedicationFrequency } from "@/types/database";

export type MedicationFormValues = {
  name: string;
  dosage: string;
  dosageUnit: string;
  times: string[];
  frequency: MedicationFrequency;
  startDate: string;
  endDate: string;
  doctorName: string;
  costCents: number | null;
  files: File[];
};

type MedicationFormProps = {
  medication?: Medication | null;
  attachments?: MedicationAttachment[];
  submitting?: boolean;
  removingAttachmentId?: string | null;
  onSubmit: (values: MedicationFormValues) => void;
  onRemoveAttachment?: (attachment: MedicationAttachment) => void;
  onCancel?: () => void;
};

export function MedicationForm({
  medication,
  attachments = [],
  submitting = false,
  removingAttachmentId = null,
  onSubmit,
  onRemoveAttachment,
  onCancel,
}: MedicationFormProps) {
  const [name, setName] = useState(medication?.name ?? "");
  const [dosage, setDosage] = useState(medication?.dosage ?? "");
  const [dosageUnit, setDosageUnit] = useState(medication?.dosage_unit ?? "");
  const [times, setTimes] = useState<string[]>(
    medication ? medication.times.map((time) => time.slice(0, 5)) : ["08:00"],
  );
  const [frequency, setFrequency] = useState<MedicationFrequency>(
    medication?.frequency ?? "daily",
  );
  const [startDate, setStartDate] = useState(medication?.start_date ?? todayString());
  const [endDate, setEndDate] = useState(medication?.end_date ?? "");
  const [doctorName, setDoctorName] = useState(medication?.doctor_name ?? "");
  const [cost, setCost] = useState(
    medication?.cost_cents ? centsToInput(medication.cost_cents) : "",
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const costCents = cost.trim() ? parseAmountToCents(cost) : null;

  const updateTime = (index: number, value: string) => {
    setTimes((current) => current.map((time, position) => (position === index ? value : time)));
  };

  const removeTime = (index: number) => {
    setTimes((current) => current.filter((_, position) => position !== index));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Informe o nome do medicamento ou da vitamina.");
      return;
    }
    if (!dosage.trim()) {
      setError("Informe a dosagem exatamente como está na receita.");
      return;
    }
    if (!dosageUnit.trim()) {
      setError("Informe a unidade da dosagem (mg, ml, gotas…).");
      return;
    }
    if (!startDate) {
      setError("Informe a data de início.");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("A data de término não pode ser anterior à data de início.");
      return;
    }

    const filledTimes = times.map((time) => time.slice(0, 5)).filter(Boolean);
    const uniqueTimes = [...new Set(filledTimes)].sort();

    if (frequency !== "as_needed" && uniqueTimes.length === 0) {
      setError("Informe pelo menos um horário para o checklist diário.");
      return;
    }
    if (uniqueTimes.length !== filledTimes.length) {
      setError("Existem horários repetidos. Deixe apenas um de cada.");
      return;
    }

    if (cost.trim() && costCents === null) {
      setError("Informe um valor válido. Ex.: 45,90");
      return;
    }

    setError(null);
    onSubmit({
      name: name.trim(),
      dosage: dosage.trim(),
      dosageUnit: dosageUnit.trim(),
      times: uniqueTimes,
      frequency,
      startDate,
      endDate,
      doctorName,
      costCents,
      files,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="medication-name" className="text-xs font-semibold text-foreground/80">
          Nome *
        </Label>
        <Input
          id="medication-name"
          value={name}
          maxLength={120}
          autoFocus
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Ácido fólico"
          className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
        <div className="space-y-1.5">
          <Label htmlFor="medication-dosage" className="text-xs font-semibold text-foreground/80">
            Dosagem *
          </Label>
          <Input
            id="medication-dosage"
            value={dosage}
            maxLength={40}
            onChange={(event) => setDosage(event.target.value)}
            placeholder="Ex.: 400"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="medication-unit" className="text-xs font-semibold text-foreground/80">
            Unidade *
          </Label>
          <Input
            id="medication-unit"
            value={dosageUnit}
            list="dosage-unit-options"
            maxLength={40}
            onChange={(event) => setDosageUnit(event.target.value)}
            placeholder="Ex.: mcg"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
          <datalist id="dosage-unit-options">
            {dosageUnitOptions.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border border-border/70 bg-muted/40 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground/80">Frequência *</Label>
          <Select
            value={frequency}
            onValueChange={(value) => setFrequency(value as MedicationFrequency)}
          >
            <SelectTrigger className="h-11 rounded-2xl border-border bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {frequencyOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {frequencyMeta[option].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {frequencyMeta[frequency].hint}.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-semibold text-foreground/80">Horários do dia</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTimes((current) => [...current, "12:00"])}
              className="h-8 rounded-xl border-border bg-card px-2.5 text-[11px] font-semibold hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Horário
            </Button>
          </div>

          {times.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card px-3 py-3 text-[11px] text-muted-foreground">
              Nenhum horário informado. Adicione os horários que estão na receita.
            </p>
          ) : (
            <ul className="space-y-2">
              {times.map((time, index) => (
                <li key={`time-${index}`} className="flex items-center gap-2">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-card text-muted-foreground">
                    <Clock className="h-4 w-4" />
                  </span>
                  <Input
                    type="time"
                    value={time}
                    onChange={(event) => updateTime(index, event.target.value)}
                    className="h-10 flex-1 rounded-2xl border-border bg-card text-sm focus-visible:ring-primary/40"
                    aria-label={`Horário ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeTime(index)}
                    aria-label={`Remover horário ${index + 1}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="medication-start" className="text-xs font-semibold text-foreground/80">
            Data de início *
          </Label>
          <Input
            id="medication-start"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="medication-end" className="text-xs font-semibold text-foreground/80">
            Data de término
          </Label>
          <Input
            id="medication-end"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Deixe em branco se não houver data para encerrar.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="medication-doctor" className="text-xs font-semibold text-foreground/80">
            Médico responsável
          </Label>
          <Input
            id="medication-doctor"
            value={doctorName}
            onChange={(event) => setDoctorName(event.target.value)}
            placeholder="Quem indicou ou prescreveu"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="medication-cost" className="text-xs font-semibold text-foreground/80">
            Valor pago (opcional)
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              R$
            </span>
            <Input
              id="medication-cost"
              value={cost}
              inputMode="decimal"
              onChange={(event) => setCost(event.target.value)}
              placeholder="0,00"
              className="h-11 rounded-2xl border-border bg-background pl-10 text-sm font-semibold focus-visible:ring-primary/40"
            />
          </div>
          <p className="rounded-2xl bg-cream/70 px-3 py-2 text-[11px] leading-relaxed text-foreground/75">
            {costCents !== null
              ? `${formatCents(costCents)} entram no Financeiro como Saúde.`
              : "Em branco, nenhuma despesa é criada."}
          </p>
        </div>
      </div>

      <AttachmentPicker
        existing={attachments}
        files={files}
        onFilesChange={setFiles}
        onRemoveExisting={onRemoveAttachment}
        removingId={removingAttachmentId}
        onError={setError}
        disabled={submitting}
        hint="Anexe a receita ou a orientação recebida. O app só guarda o que você registrar e não sugere doses."
      />

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
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pill className="h-4 w-4" />}
          {medication ? "Salvar alterações" : "Adicionar medicamento"}
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
