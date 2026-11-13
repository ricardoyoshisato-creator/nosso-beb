import { useState } from "react";
import { CalendarClock, PackageMinus, Sparkles, Trash2 } from "lucide-react";

import { BabyLogDialog } from "@/components/BabyLogDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import {
  babyLogMeta,
  babyLogMetaOf,
  babyLogSummary,
  formatLogClock,
  formatLogDay,
  isLogFromToday,
  latestLogByType,
} from "@/lib/babyLogs";
import { formatStock } from "@/lib/inventory";
import { cn } from "@/lib/utils";
import type { BabyLogType } from "@/types/database";

/** Diário de cuidados: últimos acontecimentos, atalhos e registros do dia. */
export function RoutineDiary() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { babyLogs, members, inventoryItems, can, deleteBabyLog } = useFamily();

  const [activeType, setActiveType] = useState<BabyLogType | null>(null);
  const [logToDelete, setLogToDelete] = useState<{ id: string; label: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const canRecord = can("records.create");
  const canDeleteAny = can("records.delete");
  const todayLogs = babyLogs.filter((log) => isLogFromToday(log.logged_at));

  const registeredBy = (userId: string | null) => {
    if (!userId) return "família";
    const member = members.find((row) => row.user_id === userId);
    const fullName = member?.profile?.full_name?.trim();
    if (fullName) return fullName.split(" ")[0];
    const email = member?.profile?.email;
    if (email) return email.split("@")[0];
    return "alguém da família";
  };

  const handleDelete = async () => {
    if (!logToDelete) return;

    setRemoving(true);
    const { error } = await deleteBabyLog(logToDelete.id);
    setRemoving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: error });
      return;
    }

    setLogToDelete(null);
    toast({ title: "Registro removido", description: "O diário da família foi atualizado." });
  };

  return (
    <div className="space-y-5">
      {/* Últimos acontecimentos */}
      <section
        className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Últimos acontecimentos
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              O último registro de cada cuidado · {todayLogs.length}{" "}
              {todayLogs.length === 1 ? "registro hoje" : "registros hoje"}.
            </p>
          </div>
        </div>

        <div className="no-scrollbar -mx-1 mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 xl:grid-cols-5">
          {babyLogMeta.map((meta) => {
            const log = latestLogByType(babyLogs, meta.type);
            const summary = log ? babyLogSummary(log) : null;

            return (
              <div
                key={meta.type}
                className="min-w-[9.5rem] shrink-0 snap-start rounded-3xl border border-border/70 bg-muted/35 p-3.5 lg:min-w-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn("grid h-8 w-8 place-items-center rounded-xl", meta.chip)}
                    aria-hidden="true"
                  >
                    <meta.icon className="h-4 w-4" />
                  </span>
                  {log && (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {formatLogDay(log.logged_at)}
                    </span>
                  )}
                </div>

                <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {meta.lastLabel}
                </p>

                {log ? (
                  <>
                    <p className="font-display text-xl font-semibold leading-tight text-foreground">
                      {formatLogClock(log.logged_at)}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] leading-relaxed text-foreground/75">
                      {summary ?? meta.label}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      por {registeredBy(log.user_id)}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Sem registro ainda
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Atalhos de registro */}
      <section
        className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
        style={{ animationDelay: "140ms" }}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">Registrar agora</h2>
            <p className="text-[11px] text-muted-foreground">
              Um toque para abrir os campos do cuidado.
            </p>
          </div>
        </div>

        {!canRecord && (
          <p className="mt-3 rounded-2xl bg-secondary/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-secondary-foreground/85">
            Seu papel permite apenas acompanhar o diário. Peça a um cuidador ou administrador para
            registrar os cuidados.
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
          {babyLogMeta.map((meta) => (
            <button
              key={meta.type}
              type="button"
              disabled={!canRecord}
              onClick={() => setActiveType(meta.type)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-3xl border p-3 text-left transition-all active:scale-[0.98]",
                "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
                meta.button,
              )}
            >
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-card/75 shadow-soft">
                <meta.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[11px] font-semibold leading-tight">{meta.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Registros de hoje */}
      <section
        className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Hoje no diário</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Tudo o que a família registrou desde a meia-noite.
            </p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lavender/60 text-lavender-foreground">
            <CalendarClock className="h-[18px] w-[18px]" />
          </span>
        </div>

        {todayLogs.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-3xl bg-muted/60 px-4 py-8 text-center">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Nenhum cuidado registrado hoje. Toque em um dos atalhos acima para começar o diário do
              bebê.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {todayLogs.map((log) => {
              const meta = babyLogMetaOf(log.log_type);
              const summary = babyLogSummary(log);
              const canRemove = canDeleteAny || log.user_id === user?.id;
              const stockItem = log.inventory_item_id
                ? inventoryItems.find((item) => item.id === log.inventory_item_id) ?? null
                : null;
              const stockNote =
                stockItem && log.stock_quantity !== null
                  ? `Baixou ${formatStock(log.stock_quantity, stockItem.unit)} · ${stockItem.product_name}`
                  : null;

              return (
                <li key={log.id} className="flex items-start gap-3 py-3">
                  <span
                    className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl", meta.chip)}
                    aria-hidden="true"
                  >
                    <meta.icon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        {formatLogClock(log.logged_at)}
                      </span>
                    </div>

                    {summary && (
                      <p className="text-xs leading-relaxed text-foreground/80">{summary}</p>
                    )}

                    {log.notes && (
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        {log.notes}
                      </p>
                    )}

                    {stockNote && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-sun/60 px-2 py-0.5 text-[10.5px] font-semibold text-sun-foreground">
                        <PackageMinus className="h-3 w-3 shrink-0" />
                        {stockNote}
                      </p>
                    )}

                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      por {registeredBy(log.user_id)}
                    </p>
                  </div>

                  {canRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setLogToDelete({ id: log.id, label: meta.label })}
                      aria-label={`Remover registro de ${meta.label}`}
                      className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <BabyLogDialog type={activeType} onClose={() => setActiveType(null)} />

      <AlertDialog
        open={Boolean(logToDelete)}
        onOpenChange={(open) => !open && setLogToDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Remover este registro de {logToDelete?.label.toLowerCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ele sai do diário de toda a família. Se a troca deu baixa no estoque, a quantidade
              volta para o produto. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter registro</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              onClick={handleDelete}
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
