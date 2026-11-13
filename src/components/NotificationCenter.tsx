import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, Check, CheckCheck, Loader2, Sparkles } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFamily } from "@/contexts/FamilyContext";
import {
  notificationKindMeta,
  notificationKindOrder,
  notificationWhen,
  sortNotificationsByDue,
} from "@/lib/notifications";
import type { AppNotification } from "@/types/database";
import { cn } from "@/lib/utils";

type NotificationCenterProps = {
  /** Cores do botão do sino, conforme o cabeçalho onde ele aparece. */
  className?: string;
};

export function NotificationCenter({ className }: NotificationCenterProps) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useFamily();

  const [open, setOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const hasUnread = unreadNotificationsCount > 0;

  const sections = notificationKindOrder
    .map((kind) => ({
      kind,
      meta: notificationKindMeta[kind],
      items: sortNotificationsByDue(notifications.filter((item) => item.kind === kind)),
    }))
    .filter((section) => section.items.length > 0);

  const handleOpenItem = (notification: AppNotification) => {
    if (!notification.read_at) void markNotificationRead(notification.id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const handleMarkOne = async (notification: AppNotification) => {
    setMarkingId(notification.id);
    await markNotificationRead(notification.id);
    setMarkingId(null);
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    await markAllNotificationsRead();
    setMarkingAll(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            hasUnread ? `Notificações: ${unreadNotificationsCount} não lidas` : "Notificações"
          }
          className={cn(
            "relative grid h-10 w-10 place-items-center rounded-2xl border border-border/70 transition-colors",
            className,
          )}
        >
          {hasUnread ? (
            <BellRing className="h-[18px] w-[18px]" />
          ) : (
            <Bell className="h-[18px] w-[18px]" />
          )}
          {hasUnread && (
            <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-card">
              {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(92vw,25rem)] overflow-hidden rounded-3xl border-border/70 p-0 shadow-float"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-cream/70 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold leading-tight text-foreground">
              Central de notificações
            </p>
            <p className="text-[11px] text-muted-foreground">
              {hasUnread
                ? `${unreadNotificationsCount} ${
                    unreadNotificationsCount === 1 ? "aviso não lido" : "avisos não lidos"
                  }`
                : "Tudo lido por aqui"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            disabled={!hasUnread || markingAll}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5 text-[10.5px] font-semibold text-foreground/75 transition-colors hover:bg-muted disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCheck className="h-3 w-3" />
            )}
            Marcar todas
          </button>
        </div>

        <div className="max-h-[min(58vh,25rem)] overflow-y-auto px-3 py-3">
          {sections.length > 0 ? (
            <div className="space-y-3.5">
              {sections.map((section) => (
                <section key={section.kind}>
                  <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {section.meta.section}
                  </p>
                  <ul className="space-y-1.5">
                    {section.items.map((notification) => (
                      <li
                        key={notification.id}
                        className={cn(
                          "rounded-2xl border px-2.5 py-2 transition-colors",
                          notification.read_at
                            ? "border-border/50 bg-background/60"
                            : "border-primary/25 bg-primary/5",
                        )}
                      >
                        <div className="flex items-start gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenItem(notification)}
                            className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl",
                                section.meta.chip,
                              )}
                            >
                              <section.meta.icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "truncate text-xs leading-snug",
                                    notification.read_at
                                      ? "font-medium text-foreground/75"
                                      : "font-semibold text-foreground",
                                  )}
                                >
                                  {notification.title}
                                </span>
                                {!notification.read_at && (
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                )}
                              </span>
                              {notification.body && (
                                <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                                  {notification.body}
                                </span>
                              )}
                              <span className="mt-1 block text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                                {notificationWhen(notification)}
                              </span>
                            </span>
                          </button>

                          {!notification.read_at && (
                            <button
                              type="button"
                              aria-label={`Marcar “${notification.title}” como lida`}
                              onClick={() => void handleMarkOne(notification)}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              {markingId === notification.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <Sparkles className="h-6 w-6 text-primary" />
              <p className="mt-2 font-display text-sm font-semibold text-foreground">
                Nada por aqui agora
              </p>
              <p className="mt-1 max-w-[16rem] text-[11px] leading-relaxed text-muted-foreground">
                Consultas, exames, doses do dia e pendências aparecem aqui conforme as datas
                cadastradas se aproximam.
              </p>
            </div>
          )}
        </div>

        <p className="border-t border-border/60 bg-muted/40 px-4 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
          Central interna gerada a partir das datas cadastradas na família. Nada é enviado por push
          ou e-mail.
        </p>
      </PopoverContent>
    </Popover>
  );
}
