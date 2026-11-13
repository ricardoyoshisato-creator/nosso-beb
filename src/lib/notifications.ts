import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { AlertTriangle, FlaskConical, Pill, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AppNotification, NotificationKind } from "@/types/database";

type NotificationKindMeta = {
  section: string;
  icon: LucideIcon;
  chip: string;
  /** Eventos com hora (consultas e doses) mostram o horário no rótulo. */
  withTime: boolean;
};

export const notificationKindMeta: Record<NotificationKind, NotificationKindMeta> = {
  appointment: {
    section: "Consultas próximas",
    icon: Stethoscope,
    chip: "bg-lavender/70 text-lavender-foreground",
    withTime: true,
  },
  exam: {
    section: "Exames próximos",
    icon: FlaskConical,
    chip: "bg-sun/80 text-sun-foreground",
    withTime: false,
  },
  medication: {
    section: "Medicamentos de hoje",
    icon: Pill,
    chip: "bg-mint/70 text-mint-foreground",
    withTime: true,
  },
  pending: {
    section: "Pendências",
    icon: AlertTriangle,
    chip: "bg-destructive/10 text-destructive",
    withTime: false,
  },
};

export const notificationKindOrder: NotificationKind[] = [
  "appointment",
  "exam",
  "medication",
  "pending",
];

/** Rótulo curto da data: Hoje, Amanhã, Ontem ou dd/MM/aaaa (+ hora quando faz sentido). */
export function notificationWhen(notification: AppNotification, now: Date = new Date()) {
  if (!notification.due_at) return "sem data";

  const due = parseISO(notification.due_at);
  if (Number.isNaN(due.getTime())) return "sem data";

  const days = differenceInCalendarDays(due, now);
  const dayPart =
    days === 0
      ? "Hoje"
      : days === 1
        ? "Amanhã"
        : days === -1
          ? "Ontem"
          : format(due, "dd/MM/yyyy");

  if (!notificationKindMeta[notification.kind].withTime) return dayPart;
  return `${dayPart} · ${format(due, "HH:mm")}`;
}

export function sortNotificationsByDue(notifications: readonly AppNotification[]) {
  return [...notifications].sort((a, b) => {
    if (a.due_at === b.due_at) return a.title.localeCompare(b.title, "pt-BR");
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return a.due_at.localeCompare(b.due_at);
  });
}
