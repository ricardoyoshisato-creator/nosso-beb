import { useState } from "react";
import type { FormEvent } from "react";
import { CalendarClock, Loader2, Receipt } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  appointmentStatusMeta,
  appointmentStatuses,
  datetimeLocalToISO,
  toDatetimeLocalValue,
} from "@/lib/appointments";
import { centsToInput, expenseCategoryMeta, formatCents, parseAmountToCents } from "@/lib/expenses";
import type { Appointment, AppointmentAttachment, AppointmentStatus } from "@/types/database";

export type AppointmentFormValues = {
  doctorName: string;
  specialty: string;
  clinic: string;
  address: string;
  scheduledAt: string;
  reason: string;
  notes: string;
  recommendations: string;
  status: AppointmentStatus;
  isPrivate: boolean;
  costCents: number | null;
  files: File[];
};

type AppointmentFormProps = {
  appointment?: Appointment | null;
  attachments?: AppointmentAttachment[];
  submitting?: boolean;
  removingAttachmentId?: string | null;
  onSubmit: (values: AppointmentFormValues) => void;
  onRemoveAttachment?: (attachment: AppointmentAttachment) => void;
  onCancel?: () => void;
};

export function AppointmentForm({
  appointment,
  attachments = [],
  submitting = false,
  removingAttachmentId = null,
  onSubmit,
  onRemoveAttachment,
  onCancel,
}: AppointmentFormProps) {
  const [doctorName, setDoctorName] = useState(appointment?.doctor_name ?? "");
  const [specialty, setSpecialty] = useState(appointment?.specialty ?? "");
  const [clinic, setClinic] = useState(appointment?.clinic ?? "");
  const [address, setAddress] = useState(appointment?.address ?? "");
  const [scheduledLocal, setScheduledLocal] = useState(
    toDatetimeLocalValue(appointment?.scheduled_at) ||
      toDatetimeLocalValue(new Date().toISOString()),
  );
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status ?? "scheduled");
  const [reason, setReason] = useState(appointment?.reason ?? "");
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [recommendations, setRecommendations] = useState(appointment?.recommendations ?? "");
  const [isPrivate, setIsPrivate] = useState(appointment?.is_private ?? false);
  const [cost, setCost] = useState(
    appointment?.cost_cents ? centsToInput(appointment.cost_cents) : "",
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const costCents = isPrivate && cost.trim() ? parseAmountToCents(cost) : null;
  const costCategory = expenseCategoryMeta.consultas_exames.label;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!doctorName.trim()) {
      setError("Informe o nome do médico.");
      return;
    }

    if (!scheduledLocal) {
      setError("Informe a data e o horário da consulta.");
      return;
    }

    if (isPrivate && cost.trim() && costCents === null) {
      setError("Informe um valor pago válido. Ex.: 350,00");
      return;
    }

    setError(null);
    onSubmit({
      doctorName: doctorName.trim(),
      specialty,
      clinic,
      address,
      scheduledAt: datetimeLocalToISO(scheduledLocal),
      reason,
      notes,
      recommendations,
      status,
      isPrivate,
      costCents,
      files,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="doctor-name" className="text-xs font-semibold text-foreground/80">
            Nome do médico *
          </Label>
          <Input
            id="doctor-name"
            value={doctorName}
            maxLength={120}
            autoFocus
            onChange={(event) => setDoctorName(event.target.value)}
            placeholder="Dra. Helena Prado"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doctor-specialty" className="text-xs font-semibold text-foreground/80">
            Especialidade
          </Label>
          <Input
            id="doctor-specialty"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            placeholder="Obstetrícia"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="appointment-status" className="text-xs font-semibold text-foreground/80">
            Status
          </Label>
          <Select value={status} onValueChange={(value) => setStatus(value as AppointmentStatus)}>
            <SelectTrigger
              id="appointment-status"
              className="h-11 rounded-2xl border-border bg-background text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {appointmentStatuses.map((option) => (
                <SelectItem key={option} value={option}>
                  {appointmentStatusMeta[option].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="appointment-clinic" className="text-xs font-semibold text-foreground/80">
            Clínica
          </Label>
          <Input
            id="appointment-clinic"
            value={clinic}
            onChange={(event) => setClinic(event.target.value)}
            placeholder="Clínica Bem Nascer"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="appointment-address" className="text-xs font-semibold text-foreground/80">
            Endereço
          </Label>
          <Input
            id="appointment-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Rua das Flores, 120 - sala 4"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="appointment-when" className="text-xs font-semibold text-foreground/80">
            Data e horário *
          </Label>
          <Input
            id="appointment-when"
            type="datetime-local"
            required
            value={scheduledLocal}
            onChange={(event) => setScheduledLocal(event.target.value)}
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <CalendarClock className="h-3 w-3 shrink-0" />
            Usamos o horário do seu dispositivo.
          </p>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="appointment-reason" className="text-xs font-semibold text-foreground/80">
            Motivo da consulta
          </Label>
          <Textarea
            id="appointment-reason"
            value={reason}
            rows={2}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ultrassom morfológico de rotina"
            className="min-h-[70px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="appointment-notes" className="text-xs font-semibold text-foreground/80">
            Observações
          </Label>
          <Textarea
            id="appointment-notes"
            value={notes}
            rows={3}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Levar carteirinha e exames anteriores."
            className="min-h-[90px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="appointment-recommendations"
            className="text-xs font-semibold text-foreground/80"
          >
            Recomendações recebidas
          </Label>
          <Textarea
            id="appointment-recommendations"
            value={recommendations}
            rows={3}
            onChange={(event) => setRecommendations(event.target.value)}
            placeholder="Beber mais água, caminhar 20 min por dia…"
            className="min-h-[90px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border border-border/70 bg-muted/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              Consulta particular
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Informe o valor pago para lançar a despesa automaticamente no Financeiro.
            </p>
          </div>
          <Switch
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
            aria-label="Consulta particular"
            className="mt-0.5 shrink-0"
          />
        </div>

        {isPrivate && (
          <>
            <div className="space-y-1.5">
              <Label
                htmlFor="appointment-cost"
                className="text-xs font-semibold text-foreground/80"
              >
                Valor pago
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="appointment-cost"
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
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarClock className="h-4 w-4" />
          )}
          {appointment ? "Salvar alterações" : "Agendar consulta"}
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
