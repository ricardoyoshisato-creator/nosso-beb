import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { Appointment, AppointmentStatus } from "@/types/database";

export const appointmentStatusMeta: Record<
  AppointmentStatus,
  { label: string; chip: string; dot: string }
> = {
  scheduled: {
    label: "Agendada",
    chip: "bg-lavender/70 text-lavender-foreground",
    dot: "bg-lavender-foreground",
  },
  done: {
    label: "Realizada",
    chip: "bg-mint/70 text-mint-foreground",
    dot: "bg-mint-foreground",
  },
  canceled: {
    label: "Cancelada",
    chip: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
  rescheduled: {
    label: "Remarcada",
    chip: "bg-sun/80 text-sun-foreground",
    dot: "bg-sun-foreground",
  },
};

export const appointmentStatuses: AppointmentStatus[] = [
  "scheduled",
  "done",
  "canceled",
  "rescheduled",
];

/** Consultas que ainda vão acontecer: status agendada/remarcada e data no futuro. */
export function isUpcomingAppointment(appointment: Appointment, now = new Date()) {
  const active = appointment.status === "scheduled" || appointment.status === "rescheduled";
  return active && parseISO(appointment.scheduled_at).getTime() >= now.getTime();
}

export function partitionAppointments<T extends Appointment>(
  appointments: readonly T[],
  now = new Date(),
) {
  const upcoming = [...appointments]
    .filter((appointment) => isUpcomingAppointment(appointment, now))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  const history = [...appointments]
    .filter((appointment) => !isUpcomingAppointment(appointment, now))
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

  return { upcoming, history };
}

/** Converte um instante ISO para o valor de um input `datetime-local` (hora local). */
export function toDatetimeLocalValue(value?: string | null) {
  if (!value) return "";
  return format(parseISO(value), "yyyy-MM-dd'T'HH:mm");
}

/** Valor de `datetime-local` (hora local) para o instante ISO salvo no banco. */
export function datetimeLocalToISO(value: string) {
  return new Date(value).toISOString();
}

export function formatAppointmentLong(iso: string) {
  return format(parseISO(iso), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatAppointmentTime(iso: string) {
  return format(parseISO(iso), "HH:mm", { locale: ptBR });
}

/** Bloco de data usado no card da consulta. */
export function appointmentDateBadge(iso: string) {
  const date = parseISO(iso);
  return {
    day: format(date, "dd", { locale: ptBR }),
    month: format(date, "MMM", { locale: ptBR }).replace(".", ""),
    weekday: format(date, "EEE", { locale: ptBR }).replace(".", ""),
    year: format(date, "yyyy", { locale: ptBR }),
    time: format(date, "HH:mm", { locale: ptBR }),
  };
}

/** Texto curto de contagem: hoje, amanhã, em 4 dias ou há 3 dias. */
export function appointmentCountdown(iso: string) {
  const days = differenceInCalendarDays(parseISO(iso), new Date());
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  if (days > 1) return `em ${days} dias`;
  return `há ${Math.abs(days)} dias`;
}
