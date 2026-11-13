import { CalendarRange, Paperclip, Pencil, Receipt, Stethoscope, Trash2 } from "lucide-react";

import type { MedicationWithAttachments } from "@/contexts/FamilyContext";
import { formatFileSize } from "@/lib/attachments";
import { formatCents } from "@/lib/expenses";
import { formatNumericDate } from "@/lib/family";
import { frequencyMeta, medicationIsCurrent, todayString } from "@/lib/medications";
import type { MedicationAttachment } from "@/types/database";
import { cn } from "@/lib/utils";

type MedicationCardProps = {
  medication: MedicationWithAttachments;
  todayTotal: number;
  todayTaken: number;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: (attachment: MedicationAttachment) => void;
};

export function MedicationCard({
  medication,
  todayTotal,
  todayTaken,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onDownload,
}: MedicationCardProps) {
  const today = todayString();
  const current = medicationIsCurrent(medication, today);
  const upcoming = medication.start_date > today;
  const state = upcoming ? "upcoming" : current ? "current" : "ended";
  const stateMeta = {
    current: { label: "Em uso", chip: "bg-mint/80 text-mint-foreground" },
    upcoming: { label: "A iniciar", chip: "bg-sun/90 text-sun-foreground" },
    ended: { label: "Encerrado", chip: "bg-muted text-muted-foreground" },
  }[state];

  return (
    <article className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-display text-base font-semibold leading-tight text-foreground">
              {medication.name}
            </h3>
            <span
              className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", stateMeta.chip)}
            >
              {stateMeta.label}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-foreground/75">
            {medication.dosage} {medication.dosage_unit}
            <span className="font-normal text-muted-foreground">
              {" · "}
              {frequencyMeta[medication.frequency].label}
            </span>
          </p>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex shrink-0 items-center gap-1">
            {canEdit && (
              <button
                type="button"
                aria-label={`Editar ${medication.name}`}
                onClick={onEdit}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                aria-label={`Excluir ${medication.name}`}
                onClick={onDelete}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </header>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(medication.times.length > 0 ? [...medication.times].sort() : [null]).map((time) =>
          time ? (
            <span
              key={time}
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground"
            >
              {time.slice(0, 5)}
            </span>
          ) : (
            <span
              key="none"
              className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              Sem horário fixo
            </span>
          ),
        )}
      </div>

      {todayTotal > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Hoje: {todayTaken} de {todayTotal}{" "}
          {todayTotal === 1 ? "dose registrada" : "doses registradas"}
        </p>
      )}

      <dl className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CalendarRange className="h-3.5 w-3.5 shrink-0" />
          <span>
            {formatNumericDate(medication.start_date)}
            {medication.end_date ? ` até ${formatNumericDate(medication.end_date)}` : " em diante"}
          </span>
        </div>
        {medication.doctor_name && (
          <div className="flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{medication.doctor_name}</span>
          </div>
        )}
        {medication.cost_cents !== null && (
          <div className="flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 shrink-0" />
            <span>{formatCents(medication.cost_cents)} no Financeiro</span>
          </div>
        )}
      </dl>

      {medication.attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {medication.attachments.map((attachment) => (
            <button
              key={attachment.id}
              type="button"
              onClick={() => onDownload(attachment)}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-semibold text-foreground/75 transition-colors hover:bg-muted"
            >
              <Paperclip className="h-3 w-3 shrink-0" />
              <span className="truncate">{attachment.file_name}</span>
              {attachment.size_bytes ? (
                <span className="shrink-0 text-muted-foreground">
                  {formatFileSize(attachment.size_bytes)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
