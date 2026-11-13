import { useState } from "react";
import type { FormEvent } from "react";
import { FlaskConical, Loader2, Receipt } from "lucide-react";

import { AttachmentPicker } from "@/components/AttachmentPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { centsToInput, expenseCategoryMeta, formatCents, parseAmountToCents } from "@/lib/expenses";
import type { Exam, ExamAttachment } from "@/types/database";

export type ExamFormValues = {
  name: string;
  requestedDate: string;
  scheduledDate: string;
  performedDate: string;
  doctorName: string;
  lab: string;
  result: string;
  notes: string;
  isPrivate: boolean;
  costCents: number | null;
  files: File[];
};

type ExamFormProps = {
  exam?: Exam | null;
  attachments?: ExamAttachment[];
  submitting?: boolean;
  removingAttachmentId?: string | null;
  onSubmit: (values: ExamFormValues) => void;
  onRemoveAttachment?: (attachment: ExamAttachment) => void;
  onCancel?: () => void;
};

export function ExamForm({
  exam,
  attachments = [],
  submitting = false,
  removingAttachmentId = null,
  onSubmit,
  onRemoveAttachment,
  onCancel,
}: ExamFormProps) {
  const [name, setName] = useState(exam?.name ?? "");
  const [requestedDate, setRequestedDate] = useState(exam?.requested_date ?? "");
  const [scheduledDate, setScheduledDate] = useState(exam?.scheduled_date ?? "");
  const [performedDate, setPerformedDate] = useState(exam?.performed_date ?? "");
  const [doctorName, setDoctorName] = useState(exam?.doctor_name ?? "");
  const [lab, setLab] = useState(exam?.lab ?? "");
  const [result, setResult] = useState(exam?.result ?? "");
  const [notes, setNotes] = useState(exam?.notes ?? "");
  const [isPrivate, setIsPrivate] = useState(exam?.is_private ?? false);
  const [cost, setCost] = useState(exam?.cost_cents ? centsToInput(exam.cost_cents) : "");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const costCents = isPrivate && cost.trim() ? parseAmountToCents(cost) : null;
  const costCategory = expenseCategoryMeta.consultas_exames.label;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Informe o nome do exame.");
      return;
    }

    if (!requestedDate && !scheduledDate && !performedDate) {
      setError("Preencha pelo menos uma das datas do exame.");
      return;
    }

    if (requestedDate && scheduledDate && scheduledDate < requestedDate) {
      setError("A data agendada não pode ser anterior à data solicitada.");
      return;
    }

    if (requestedDate && performedDate && performedDate < requestedDate) {
      setError("A data de realização não pode ser anterior à data solicitada.");
      return;
    }

    if (isPrivate && cost.trim() && costCents === null) {
      setError("Informe um valor pago válido. Ex.: 129,90");
      return;
    }

    setError(null);
    onSubmit({
      name: name.trim(),
      requestedDate,
      scheduledDate,
      performedDate,
      doctorName,
      lab,
      result,
      notes,
      isPrivate,
      costCents,
      files,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="exam-name" className="text-xs font-semibold text-foreground/80">
          Nome do exame *
        </Label>
        <Input
          id="exam-name"
          value={name}
          maxLength={120}
          autoFocus
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Hemograma completo"
          className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Exames com o mesmo nome ficam agrupados para você comparar os resultados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="exam-requested" className="text-xs font-semibold text-foreground/80">
            Data solicitada
          </Label>
          <Input
            id="exam-requested"
            type="date"
            value={requestedDate}
            onChange={(event) => setRequestedDate(event.target.value)}
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exam-scheduled" className="text-xs font-semibold text-foreground/80">
            Data agendada
          </Label>
          <Input
            id="exam-scheduled"
            type="date"
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exam-performed" className="text-xs font-semibold text-foreground/80">
            Data realizada
          </Label>
          <Input
            id="exam-performed"
            type="date"
            value={performedDate}
            onChange={(event) => setPerformedDate(event.target.value)}
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="exam-doctor" className="text-xs font-semibold text-foreground/80">
            Médico solicitante
          </Label>
          <Input
            id="exam-doctor"
            value={doctorName}
            onChange={(event) => setDoctorName(event.target.value)}
            placeholder="Dra. Helena Prado"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exam-lab" className="text-xs font-semibold text-foreground/80">
            Laboratório
          </Label>
          <Input
            id="exam-lab"
            value={lab}
            onChange={(event) => setLab(event.target.value)}
            placeholder="Lab Viver"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="exam-result" className="text-xs font-semibold text-foreground/80">
          Resultado
        </Label>
        <Textarea
          id="exam-result"
          value={result}
          rows={4}
          onChange={(event) => setResult(event.target.value)}
          placeholder="Cole aqui os valores e a conclusão do laudo. Ex.: Hemoglobina 11,2 g/dL (referência 11,0–15,0)."
          className="min-h-[110px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="exam-notes" className="text-xs font-semibold text-foreground/80">
          Observações
        </Label>
        <Textarea
          id="exam-notes"
          value={notes}
          rows={2}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Jejum de 8 horas, repetir em 30 dias…"
          className="min-h-[76px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
      </div>

      <div className="space-y-3 rounded-3xl border border-border/70 bg-muted/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              Exame particular
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Informe o valor pago para lançar a despesa automaticamente no Financeiro.
            </p>
          </div>
          <Switch
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
            aria-label="Exame particular"
            className="mt-0.5 shrink-0"
          />
        </div>

        {isPrivate && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="exam-cost" className="text-xs font-semibold text-foreground/80">
                Valor pago
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="exam-cost"
                  value={cost}
                  inputMode="decimal"
                  onChange={(event) => setCost(event.target.value)}
                  placeholder="0,00"
                  className="h-11 rounded-2xl border-border bg-card pl-10 text-sm font-semibold focus-visible:ring-primary/40"
                />
              </div>
            </div>

            <p className="rounded-2xl bg-cream/70 px-3 py-2 text-[11px] leading-relaxed text-foreground/75">
              {costCents !== null
                ? `${formatCents(costCents)} entram no Financeiro como ${costCategory}.`
                : `Deixe em branco para não gerar despesa. Com valor, entra em ${costCategory}.`}
            </p>
          </>
        )}
      </div>

      <AttachmentPicker
        existing={attachments}
        files={files}
        onFilesChange={setFiles}
        onRemoveExisting={onRemoveAttachment}
        removingId={removingAttachmentId}
        onError={setError}
        disabled={submitting}
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
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          {exam ? "Salvar alterações" : "Adicionar exame"}
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
