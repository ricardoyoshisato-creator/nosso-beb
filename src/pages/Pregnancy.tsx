import { useState } from "react";
import {
  Baby,
  CalendarDays,
  CalendarHeart,
  Check,
  Heart,
  Info,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Timer,
  Trash2,
} from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { MilestoneForm } from "@/components/MilestoneForm";
import type { MilestoneFormValues } from "@/components/MilestoneForm";
import { PageHeader } from "@/components/PageHeader";
import { PregnancyForm } from "@/components/PregnancyForm";
import type { PregnancyFormValues } from "@/components/PregnancyForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDayMonth, formatNumericDate, roleLabels } from "@/lib/family";
import {
  buildTimeline,
  daysBetween,
  gestationMilestones,
  gestationSummary,
  nextMilestone,
  referenceTypeLabels,
  todayISO,
} from "@/lib/pregnancy";
import type { MilestoneState } from "@/lib/pregnancy";
import { cn } from "@/lib/utils";

const dotStyles: Record<MilestoneState["state"], string> = {
  done: "bg-mint text-mint-foreground",
  current: "bg-primary text-primary-foreground ring-4 ring-primary/20",
  upcoming: "bg-muted text-muted-foreground",
};

const Pregnancy = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    family,
    membership,
    pregnancy,
    milestones,
    loading,
    can,
    savePregnancy,
    deletePregnancy,
    addMilestone,
    removeMilestone,
  } = useFamily();

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [milestoneToRemove, setMilestoneToRemove] = useState<{ id: string; title: string } | null>(
    null,
  );

  const canEdit = can("family.edit");
  const canAddMilestone = can("records.create");
  const canDeleteAnyMilestone = can("records.delete");
  const summary = gestationSummary(pregnancy);
  const timeline = buildTimeline(pregnancy, milestones);
  const upcoming = nextMilestone(timeline);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Preparando o painel da gestação…</p>
      </div>
    );
  }

  if (!family) {
    return <CreateFamilyCard />;
  }

  const babyName = family.baby_name?.trim() || "Seu bebê";

  const handleSave = async (values: PregnancyFormValues) => {
    setSaving(true);
    const { error } = await savePregnancy({
      referenceDate: values.referenceDate,
      referenceType: values.referenceType,
      cycleLength: values.cycleLength,
      dueDate: values.dueDate,
      notes: values.notes,
    });
    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    setFormOpen(false);
    toast({
      title: pregnancy ? "Gestação atualizada" : "Gestação registrada",
      description: "As semanas e a DPP já foram recalculadas.",
    });
  };

  const handleDelete = async () => {
    setRemoving(true);
    const { error } = await deletePregnancy();
    setRemoving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: error });
      return;
    }

    toast({ title: "Dados da gestação removidos", description: "Você pode registrar novamente quando quiser." });
  };

  const handleAddMilestone = async (values: MilestoneFormValues) => {
    setSavingMilestone(true);
    const { error } = await addMilestone(values);
    setSavingMilestone(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar o marco", description: error });
      return;
    }

    setMilestoneOpen(false);
    toast({ title: "Marco adicionado", description: "Ele já aparece na linha do tempo da família." });
  };

  const handleRemoveMilestone = async () => {
    if (!milestoneToRemove) return;
    const { error } = await removeMilestone(milestoneToRemove.id);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: error });
      return;
    }

    setMilestoneToRemove(null);
    toast({ title: "Marco removido", description: "A linha do tempo foi atualizada." });
  };

  /* ---------------------------- Primeiro registro --------------------------- */
  if (!pregnancy || !summary) {
    return (
      <div className="space-y-5 pb-2">
        <PageHeader
          eyebrow="Gestação"
          title="Painel da Gestação"
          description="Informe a data da última menstruação ou uma data de referência para acompanhar as semanas, a DPP e os marcos do pré-natal."
        />

        {!canEdit ? (
          <div className="animate-rise rounded-3xl border border-border/70 bg-secondary/40 p-5 text-sm leading-relaxed text-secondary-foreground/85">
            Seu papel ({roleLabels[membership?.role ?? "viewer"]}) permite apenas visualizar. Peça a
            um administrador para registrar a gestação.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-5">
            <section className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft sm:p-6 lg:col-span-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <CalendarHeart className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Vamos começar a contar
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Leva menos de um minuto — dá para ajustar depois.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <PregnancyForm submitLabel="Salvar e acompanhar" submitting={saving} onSubmit={handleSave} />
              </div>
            </section>

            <aside className="animate-rise space-y-4 lg:col-span-2" style={{ animationDelay: "80ms" }}>
              <div className="relative overflow-hidden rounded-4xl bg-[hsl(20,32%,24%)] p-5 text-primary-foreground">
                <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/40" />
                <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-lavender/20" />
                <div className="relative">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
                    <Heart className="h-3.5 w-3.5" />
                    {babyName}
                  </span>
                  <p className="mt-4 font-display text-xl font-semibold leading-snug">
                    Cada semana vira memória.
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/85">
                    Ao registrar a DUM, o app calcula a idade gestacional, a data provável do parto e
                    os principais marcos do pré-natal.
                  </p>
                </div>
              </div>

              <div className="rounded-4xl border border-border/70 bg-card p-5 shadow-soft">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-base font-semibold text-foreground">
                    Como calculamos
                  </h3>
                </div>
                <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-muted-foreground">
                  <li>
                    <span className="font-semibold text-foreground">Idade gestacional:</span> dias
                    desde a data de referência, em semanas e dias.
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">DPP:</span> 40 semanas a partir
                    da referência, com ajuste pela duração do ciclo.
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">Linha do tempo:</span> marcos do
                    pré-natal posicionados na semana correspondente.
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------ Painel ativo ------------------------------ */
  const remainingLabel =
    summary.remainingDays === 0 && summary.remainingWeeks === 0
      ? "chegando"
      : `${summary.remainingWeeks} sem e ${summary.remainingDays} d`;

  const milestoneCountdown = upcoming ? daysBetween(todayISO(), upcoming.date) : 0;

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Gestação"
        title="Painel da Gestação"
        description={`Acompanhe ${babyName} semana a semana, com a idade gestacional e a data provável do parto.`}
        action={
          canEdit ? (
            <Button
              onClick={() => setFormOpen(true)}
              className="rounded-2xl px-4 text-sm font-semibold shadow-soft"
            >
              <Pencil className="h-4 w-4" />
              Atualizar dados
            </Button>
          ) : undefined
        }
      />

      {!canEdit && (
        <div className="animate-rise rounded-3xl border border-border/70 bg-secondary/40 p-4 text-xs leading-relaxed text-secondary-foreground/85">
          Seu papel ({roleLabels[membership?.role ?? "viewer"]}) permite apenas acompanhar o painel.
          Fale com um administrador para alterar a DUM ou a DPP.
        </div>
      )}

      {/* Destaque principal */}
      <section className="animate-rise relative overflow-hidden rounded-4xl bg-[hsl(20,32%,24%)] p-5 text-primary-foreground sm:p-7">
        <div className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-primary/45" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-lavender/25" />
        <div className="pointer-events-none absolute bottom-10 right-16 h-14 w-14 rounded-full bg-sun/25" />

        <div className="relative flex min-h-[232px] flex-col justify-between gap-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
              <Heart className="h-3.5 w-3.5" />
              {summary.trimesterLabel}
            </span>
            <span className="rounded-full bg-card/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
              {summary.overdue
                ? "DPP chegou"
                : `faltam ${summary.daysUntilDue} ${summary.daysUntilDue === 1 ? "dia" : "dias"}`}
            </span>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
              Idade gestacional
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
              <span className="font-display text-[46px] font-semibold leading-none sm:text-[58px]">
                {summary.weeks}
              </span>
              <span className="font-display text-lg font-semibold sm:text-xl">
                {summary.weeks === 1 ? "semana" : "semanas"}
              </span>
              <span className="font-display text-lg font-semibold text-primary-foreground/85 sm:text-xl">
                e {summary.days} {summary.days === 1 ? "dia" : "dias"}
              </span>
            </div>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-primary-foreground/85">
              {summary.overdue
                ? "A data prevista chegou — cada bebê escolhe a sua hora."
                : summary.notStarted
                  ? "A contagem começa na data de referência informada."
                  : `Data provável do parto em ${formatDate(summary.dueDate)}.`}
            </p>

            <div className="mt-4 space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-card/30">
                <div
                  className="h-full rounded-full bg-sun transition-[width] duration-700"
                  style={{ width: `${summary.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/80">
                <span>{summary.progress}% das 40 semanas</span>
                <span>{summary.weeks} de 40</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Data provável do parto",
            value: formatNumericDate(summary.dueDate),
            hint: summary.overdue ? "data já passou" : `em ${summary.daysUntilDue} dias`,
            icon: CalendarDays,
            chip: "bg-lavender/70 text-lavender-foreground",
          },
          {
            label: "Tempo restante",
            value: remainingLabel,
            hint: "até a DPP",
            icon: Timer,
            chip: "bg-sun/80 text-sun-foreground",
          },
          {
            label: "Etapa atual",
            value: `${summary.trimester}º trimestre`,
            hint:
              summary.trimester === 3
                ? "reta final da gestação"
                : summary.trimester === 2
                  ? "fase de descobertas"
                  : "início da jornada",
            icon: Baby,
            chip: "bg-mint/70 text-mint-foreground",
          },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className="animate-rise flex items-center gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-soft"
            style={{ animationDelay: `${80 + index * 60}ms` }}
          >
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", stat.chip)}>
              <stat.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="font-display text-lg font-semibold leading-tight text-foreground">
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{stat.hint}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Linha do tempo */}
        <section
          className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-3"
          style={{ animationDelay: "160ms" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Linha do tempo
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {gestationMilestones.length} etapas do pré-natal
                {milestones.length > 0 ? ` · ${milestones.length} marcos da família` : ""} ·
                ordenados por data.
              </p>
            </div>
            {canAddMilestone && (
              <Button
                onClick={() => setMilestoneOpen(true)}
                variant="outline"
                className="h-10 shrink-0 rounded-2xl border-primary/30 bg-primary/10 px-3.5 text-xs font-semibold text-[hsl(13,62%,38%)] hover:bg-primary/20 hover:text-[hsl(13,62%,38%)]"
              >
                <Plus className="h-4 w-4" />
                Adicionar Marco
              </Button>
            )}
          </div>

          <ol className="mt-5">
            {timeline.map((item, index) => {
              const isCustom = item.source === "custom";
              const canRemove =
                isCustom && (canDeleteAnyMilestone || item.createdBy === user?.id);

              return (
                <li key={item.key} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < timeline.length - 1 && (
                    <span
                      className="absolute left-[15px] top-8 h-full w-px bg-border"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                      isCustom && item.state !== "done"
                        ? "bg-lavender text-lavender-foreground"
                        : dotStyles[item.state],
                    )}
                  >
                    {item.state === "done" ? (
                      <Check className="h-4 w-4" />
                    ) : isCustom ? (
                      <Star className="h-3.5 w-3.5" />
                    ) : (
                      item.week
                    )}
                  </span>

                  <div className={cn("min-w-0 flex-1", item.state === "upcoming" && "opacity-80")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold leading-tight text-foreground">
                        {item.title}
                      </p>
                      {isCustom ? (
                        <Badge className="rounded-full border-transparent bg-lavender/70 px-2 py-0 text-[10px] font-semibold text-lavender-foreground">
                          Personalizado
                        </Badge>
                      ) : (
                        <Badge className="rounded-full border-transparent bg-muted px-2 py-0 text-[10px] font-semibold text-foreground/70">
                          {item.week} semanas
                        </Badge>
                      )}
                      {isCustom && item.week !== null && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                          semana {item.week}
                        </span>
                      )}
                      {item.state === "current" && (
                        <Badge className="rounded-full border-transparent bg-primary/15 px-2 py-0 text-[10px] font-semibold text-[hsl(13,62%,38%)]">
                          agora
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                      {formatDayMonth(item.date)}
                    </p>
                  </div>

                  {canRemove && (
                    <button
                      type="button"
                      aria-label={`Remover marco ${item.title}`}
                      onClick={() =>
                        item.milestoneId &&
                        setMilestoneToRemove({ id: item.milestoneId, title: item.title })
                      }
                      className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          {milestones.length > 0 && (
            <p className="mt-4 flex items-center gap-1.5 rounded-2xl bg-muted/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <Star className="h-3 w-3 shrink-0 text-lavender-foreground" />
              Marcos com estrela foram criados pela família.
            </p>
          )}
        </section>

        {/* Próximo marco + dados */}
        <div className="space-y-4 lg:col-span-2">
          {upcoming && (
            <section
              className="animate-rise relative overflow-hidden rounded-4xl border border-border/70 bg-lavender/50 p-5"
              style={{ animationDelay: "200ms" }}
            >
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-card/40" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-card/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-lavender-foreground">
                  <Sparkles className="h-3 w-3" />
                  Próximo marco
                </span>
                <h2 className="mt-3 font-display text-xl font-semibold leading-tight text-lavender-foreground">
                  {upcoming.title}
                </h2>
                {upcoming.description && (
                  <p className="mt-1 text-xs leading-relaxed text-lavender-foreground/80">
                    {upcoming.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-card/70 px-3.5 py-2.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lavender-foreground/70">
                      {upcoming.week !== null ? `Semana ${upcoming.week}` : "Marco da família"}
                    </p>
                    <p className="font-display text-sm font-semibold text-lavender-foreground">
                      {formatNumericDate(upcoming.date)}
                    </p>
                  </div>
                  <span className="rounded-full bg-lavender px-2.5 py-1 text-[10px] font-semibold text-lavender-foreground">
                    {milestoneCountdown > 0 ? `em ${milestoneCountdown} dias` : "chegou"}
                  </span>
                </div>
              </div>
            </section>
          )}

          <section
            className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft"
            style={{ animationDelay: "240ms" }}
          >
            <h2 className="font-display text-lg font-semibold text-foreground">Dados da gestação</h2>

            <dl className="mt-3 divide-y divide-border text-sm">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {pregnancy.reference_type === "dum" ? "DUM" : "Referência"}
                </dt>
                <dd className="text-right font-display text-sm font-semibold text-foreground">
                  {formatNumericDate(pregnancy.reference_date)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {referenceTypeLabels[pregnancy.reference_type]}
                </dt>
                <dd className="text-right text-xs font-medium text-foreground/80">
                  {pregnancy.reference_type === "dum"
                    ? `ciclo de ${pregnancy.cycle_length} dias`
                    : "contagem direta"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  DPP
                </dt>
                <dd className="text-right font-display text-sm font-semibold text-foreground">
                  {formatNumericDate(pregnancy.due_date)}
                </dd>
              </div>
            </dl>

            {pregnancy.notes && (
              <p className="mt-3 rounded-2xl bg-muted/70 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                {pregnancy.notes}
              </p>
            )}

            {canEdit && (
              <div className="mt-4 space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setFormOpen(true)}
                  className="h-11 w-full rounded-2xl border-border bg-background text-sm font-semibold hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                  Editar DUM e DPP
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-10 w-full rounded-2xl text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover dados da gestação
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display">
                        Remover os dados da gestação?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        As semanas, a DPP e a linha do tempo deixarão de aparecer para toda a
                        família. Você pode registrar novamente depois.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-2xl">Manter dados</AlertDialogCancel>
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
            )}
          </section>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Atualizar gestação</DialogTitle>
            <DialogDescription>
              Mudou a DUM ou o médico ajustou a DPP? Atualize aqui — a família toda vê na hora.
            </DialogDescription>
          </DialogHeader>

          <PregnancyForm
            initialValues={{
              referenceDate: pregnancy.reference_date,
              referenceType: pregnancy.reference_type,
              cycleLength: pregnancy.cycle_length,
              dueDate: pregnancy.due_date,
              notes: pregnancy.notes ?? "",
            }}
            submitLabel="Salvar alterações"
            submitting={saving}
            onSubmit={handleSave}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Adicionar marco</DialogTitle>
            <DialogDescription>
              Registre um momento especial da gestação: um ultrassom, a escolha do nome, o primeiro
              chute. Ele entra na linha do tempo junto das etapas do pré-natal.
            </DialogDescription>
          </DialogHeader>

          <MilestoneForm
            referenceDate={pregnancy.reference_date}
            submitting={savingMilestone}
            onSubmit={handleAddMilestone}
            onCancel={() => setMilestoneOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(milestoneToRemove)}
        onOpenChange={(open) => !open && setMilestoneToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Remover “{milestoneToRemove?.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esse marco personalizado será apagado da linha do tempo da família. Essa ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter marco</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMilestone}
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Pregnancy;
