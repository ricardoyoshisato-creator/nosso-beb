import { Building2, MapPin, Paperclip, Pencil, Sparkles, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  appointmentCountdown,
  appointmentDateBadge,
  appointmentStatusMeta,
  isUpcomingAppointment,
} from "@/lib/appointments";
import { formatFileSize } from "@/lib/attachments";
import { formatCents } from "@/lib/expenses";
import type { AppointmentWithAttachments } from "@/contexts/FamilyContext";
import type { AppointmentAttachment } from "@/types/database";
import { cn } from "@/lib/utils";

type AppointmentCardProps = {
  appointment: AppointmentWithAttachments;
  canManage: boolean;
  onEdit: (appointment: AppointmentWithAttachments) => void;
  onDelete: (appointment: AppointmentWithAttachments) => void;
  onDownload: (attachment: AppointmentAttachment) => void;
};

export function AppointmentCard({
  appointment,
  canManage,
  onEdit,
  onDelete,
  onDownload,
}: AppointmentCardProps) {
  const badge = appointmentDateBadge(appointment.scheduled_at);
  const status = appointmentStatusMeta[appointment.status];
  const upcoming = isUpcomingAppointment(appointment);
  const attachments = appointment.attachments ?? [];

  return (
    <article
      className={cn(
        "animate-rise flex gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-soft",
        appointment.status === "canceled" && "opacity-80",
      )}
    >
      <div
        className={cn(
          "flex h-fit w-14 shrink-0 flex-col items-center rounded-2xl px-1 py-2",
          upcoming ? "bg-lavender/60 text-lavender-foreground" : "bg-muted text-foreground/70",
        )}
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] opacity-80">
          {badge.month}
        </span>
        <span className="font-display text-xl font-semibold leading-none">{badge.day}</span>
        <span className="mt-0.5 text-[10px] font-semibold opacity-90">{badge.time}</span>
        <span className="text-[9px] font-medium opacity-70">{badge.year}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold leading-tight text-foreground">
              {appointment.doctor_name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {appointment.specialty?.trim() || "Consulta"} · {badge.weekday}
            </p>
          </div>

          {canManage && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={`Editar consulta de ${appointment.doctor_name}`}
                onClick={() => onEdit(appointment)}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Excluir consulta de ${appointment.doctor_name}`}
                onClick={() => onDelete(appointment)}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge
            className={cn(
              "rounded-full border-transparent px-2 py-0 text-[10px] font-semibold",
              status.chip,
            )}
          >
            {status.label}
          </Badge>
          {upcoming && (
            <span className="rounded-full bg-muted px-2 py-0 text-[10px] font-semibold text-muted-foreground">
              {appointmentCountdown(appointment.scheduled_at)}
            </span>
          )}
          {appointment.is_private && (
            <span className="rounded-full bg-cream px-2 py-0 text-[10px] font-semibold text-foreground/75">
              Particular
              {appointment.cost_cents ? ` · ${formatCents(appointment.cost_cents)}` : ""}
            </span>
          )}
        </div>

        {(appointment.clinic || appointment.address) && (
          <div className="mt-2 space-y-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {appointment.clinic && (
              <p className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{appointment.clinic}</span>
              </p>
            )}
            {appointment.address && (
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="min-w-0 break-words">{appointment.address}</span>
              </p>
            )}
          </div>
        )}

        {appointment.reason && (
          <p className="mt-2 text-xs leading-relaxed text-foreground/80">
            <span className="font-semibold text-foreground">Motivo: </span>
            {appointment.reason}
          </p>
        )}

        {appointment.recommendations && (
          <div className="mt-2 flex items-start gap-1.5 rounded-2xl bg-mint/50 px-2.5 py-2 text-[11px] leading-relaxed text-mint-foreground">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="min-w-0">
              <span className="font-semibold">Recomendações: </span>
              {appointment.recommendations}
            </span>
          </div>
        )}

        {appointment.notes && (
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {appointment.notes}
          </p>
        )}

        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {attachments.map((attachment) => (
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
      </div>
    </article>
  );
}
