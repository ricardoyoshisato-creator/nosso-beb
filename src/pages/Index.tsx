import { Link } from "react-router-dom";
import {
  Baby,
  CalendarHeart,
  ChevronRight,
  Footprints,
  Heart,
  Loader2,
  MailPlus,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { InitialsAvatar, type AvatarTone } from "@/components/InitialsAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { actionLabels, babyStatus, formatDate, relativeTime, roleLabels } from "@/lib/family";
import type { BabyStatus } from "@/lib/family";
import { gestationSummary } from "@/lib/pregnancy";
import { cn } from "@/lib/utils";

const toneByRole: Record<string, AvatarTone> = {
  owner: "primary",
  admin: "lavender",
  caregiver: "mint",
  viewer: "sun",
};

const chipTones: Record<AvatarTone, string> = {
  primary: "bg-primary/12 text-[hsl(13,62%,38%)]",
  lavender: "bg-lavender/70 text-[hsl(266,30%,28%)]",
  mint: "bg-mint/70 text-[hsl(164,34%,22%)]",
  sun: "bg-sun/80 text-[hsl(32,50%,26%)]",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function todayLabel() {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const Index = () => {
  const { profile, user } = useAuth();
  const {
    family,
    membership,
    members,
    activity,
    pregnancy,
    loading,
    activeMembersCount,
    pendingInvitationsCount,
    can,
  } = useFamily();

  const firstName =
    profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "família";

  // A gestação registrada no painel é a fonte das semanas e da DPP.
  const gestation = gestationSummary(pregnancy);
  const status: BabyStatus =
    gestation && !family?.baby_birth_date
      ? {
          mode: "pregnancy",
          weeks: gestation.weeks,
          daysLeft: gestation.daysUntilDue,
          progress: gestation.progress,
        }
      : babyStatus(family);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Carregando o cantinho da família…</p>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="space-y-5">
        <div className="animate-rise">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {todayLabel()}
          </p>
          <h1 className="mt-1.5 font-display text-[27px] font-semibold leading-tight text-foreground sm:text-[32px]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Falta só um passo para começar a guardar os registros do bebê.
          </p>
        </div>
        <CreateFamilyCard />
      </div>
    );
  }

  const babyName = family.baby_name?.trim() || "Seu bebê";
  const heroTitle =
    status.mode === "pregnancy"
      ? `${babyName} está a caminho`
      : status.mode === "born"
        ? `${babyName} já está aqui`
        : "Conte para a gente sobre o bebê";
  const heroCaption =
    status.mode === "pregnancy"
      ? status.daysLeft > 0
        ? `Faltam ${status.daysLeft} ${status.daysLeft === 1 ? "dia" : "dias"} para o grande dia.`
        : "A data prevista chegou — cada bebê escolhe a sua hora."
      : status.mode === "born"
        ? `${status.ageLabel} · nascimento em ${formatDate(family.baby_birth_date)}`
        : "Registre a DUM no painel da gestação para acompanhar as semanas e a DPP.";
  const heroBadge =
    status.mode === "pregnancy"
      ? `Semana ${status.weeks} de 40`
      : status.mode === "born"
        ? "Bebê nascido"
        : "Sem data do bebê";
  const progress = status.mode === "empty" ? 0 : status.progress;

  const thirdStat =
    status.mode === "pregnancy"
      ? { label: "Dias restantes", value: `${Math.max(status.daysLeft, 0)}`, hint: "para o parto", icon: CalendarHeart, tone: "lavender" as AvatarTone }
      : status.mode === "born"
        ? { label: "Idade do bebê", value: status.ageLabel.split(" ").slice(0, 2).join(" "), hint: "desde o nascimento", icon: Footprints, tone: "lavender" as AvatarTone }
        : { label: "Data do bebê", value: "—", hint: "defina no painel da gestação", icon: CalendarHeart, tone: "lavender" as AvatarTone };

  return (
    <div className="space-y-5 pb-2">
      {/* Saudação */}
      <div className="animate-rise flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {todayLabel()}
          </p>
          <h1 className="mt-1.5 font-display text-[27px] font-semibold leading-tight text-foreground sm:text-[32px]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {family.name}
            {status.mode === "pregnancy" ? ` · semana ${status.weeks}` : ""}
          </p>
        </div>
        {can("members.invite") && (
          <Button
            asChild
            className="hidden rounded-2xl px-4 text-sm font-semibold shadow-soft sm:inline-flex"
          >
            <Link to="/familia/convites">
              <MailPlus className="h-4 w-4" />
              Convidar
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Destaque do bebê */}
        <div
          className="animate-rise relative overflow-hidden rounded-4xl bg-[hsl(20,32%,24%)] p-5 sm:p-7 lg:col-span-2"
          style={{ animationDelay: "60ms" }}
        >
          <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-primary/45" />
          <div className="pointer-events-none absolute -bottom-20 -left-14 h-56 w-56 rounded-full bg-lavender/25" />
          <div className="pointer-events-none absolute bottom-8 right-14 h-16 w-16 rounded-full bg-sun/25" />
          <div className="pointer-events-none absolute right-6 top-24 h-8 w-8 rounded-full bg-mint/30" />

          <div className="relative flex min-h-[248px] flex-col justify-between text-primary-foreground">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
                <Heart className="h-3.5 w-3.5" />
                {heroBadge}
              </span>
              <span className="rounded-full bg-card/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
                {roleLabels[membership?.role ?? "viewer"]}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
                Nosso bebê
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                {heroTitle}
              </h2>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-primary-foreground/85">
                {heroCaption}
              </p>

              <div className="mt-4 space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-card/30">
                  <div className="h-full rounded-full bg-sun" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/80">
                  <span>{status.mode === "pregnancy" ? `${status.weeks} semanas concluídas` : status.mode === "born" ? "Bebê nascido" : "Sem acompanhamento"}</span>
                  <Link to="/gestacao" className="underline-offset-4 hover:underline">
                    Painel da gestação
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card da família */}
        <div
          className="animate-rise flex flex-col justify-between rounded-4xl border border-border/70 bg-card p-5 shadow-soft"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Sua família
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Users className="h-[18px] w-[18px]" />
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <InitialsAvatar name={family.name} tone="lavender" size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold text-foreground">
                {family.name}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {family.city || "Cidade não informada"}
              </p>
              <Badge className="mt-1.5 rounded-full border-transparent bg-primary/15 px-2 py-0.5 text-[10px] text-[hsl(13,62%,38%)]">
                {roleLabels[membership?.role ?? "viewer"]}
              </Badge>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-muted px-2 py-2.5">
              <p className="font-display text-lg font-semibold text-foreground">{activeMembersCount}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Membros
              </p>
            </div>
            <div className="rounded-2xl bg-muted px-2 py-2.5">
              <p className="font-display text-lg font-semibold text-foreground">
                {pendingInvitationsCount}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Convites
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="mt-4 h-11 w-full rounded-2xl border-border bg-background text-sm font-semibold hover:bg-muted"
          >
            <Link to="/familia/configuracoes">
              Configurações
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Indicadores */}
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-3">
          {[
            {
              label: "Membros ativos",
              value: `${activeMembersCount}`,
              hint: "na sua família",
              icon: Users,
              tone: "mint" as AvatarTone,
            },
            {
              label: "Convites pendentes",
              value: `${pendingInvitationsCount}`,
              hint: "aguardando aceite",
              icon: MailPlus,
              tone: "primary" as AvatarTone,
            },
            thirdStat,
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="animate-rise flex items-center gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-soft"
              style={{ animationDelay: `${160 + index * 60}ms` }}
            >
              <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", chipTones[stat.tone])}>
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

        {/* Membros */}
        <div
          className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-2"
          style={{ animationDelay: "320ms" }}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">Quem acompanha</h2>
            <Link
              to="/familia/membros"
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-secondary"
            >
              Ver todos
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <ul className="mt-3 divide-y divide-border">
            {members.slice(0, 4).map((member) => {
              const name = member.profile?.full_name?.trim() || member.profile?.email || "Membro";
              return (
                <li key={member.id} className="flex items-center gap-3 py-3">
                  <InitialsAvatar name={name} tone={toneByRole[member.role] ?? "primary"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.profile?.email ?? "Convite em andamento"}
                    </p>
                  </div>
                  <Badge className="rounded-full border-transparent bg-muted px-2 py-0.5 text-[10px] text-foreground/70">
                    {roleLabels[member.role]}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Atividade e ações rápidas */}
        <div className="space-y-4 lg:col-span-1">
          <div
            className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft"
            style={{ animationDelay: "380ms" }}
          >
            <h2 className="font-display text-lg font-semibold text-foreground">
              Atividade da família
            </h2>

            {activity.length > 0 ? (
              <ul className="mt-4 space-y-3.5">
                {activity.slice(0, 4).map((entry) => {
                  const actorName = entry.actor?.full_name?.trim() || "Alguém da família";
                  return (
                    <li key={entry.id} className="flex items-start gap-3">
                      <InitialsAvatar name={actorName} tone="mint" size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {actorName.split(" ")[0]}
                          </span>{" "}
                          {actionLabels[entry.action] ?? entry.action.replace(/[._]/g, " ")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                          {relativeTime(entry.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-4 flex flex-col items-center rounded-2xl bg-muted/60 px-4 py-6 text-center">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Ainda não há atividades. Convide a família para começar a movimentar o cantinho do
                  bebê.
                </p>
              </div>
            )}
          </div>

          <div className="animate-rise grid grid-cols-2 gap-3" style={{ animationDelay: "440ms" }}>
            <Link
              to="/bebe/perfil"
              className="col-span-2 flex items-center gap-3 rounded-3xl border border-border/70 bg-primary/12 p-4 transition-transform hover:-translate-y-0.5"
            >
              <Baby className="h-5 w-5 shrink-0 text-[hsl(13,62%,38%)]" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold leading-tight text-[hsl(13,62%,38%)]">
                  Perfil do bebê
                </span>
                <span className="block text-[11px] text-[hsl(13,62%,38%)]/75">
                  Foto, nascimento e primeiras medidas
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(13,62%,38%)]" />
            </Link>
            <Link
              to="/familia/membros"
              className="flex flex-col gap-2 rounded-3xl border border-border/70 bg-lavender/50 p-4 transition-transform hover:-translate-y-0.5"
            >
              <Users className="h-5 w-5 text-lavender-foreground" />
              <span className="text-xs font-semibold leading-tight text-lavender-foreground">
                Ver membros
              </span>
            </Link>
            <Link
              to="/familia/permissoes"
              className="flex flex-col gap-2 rounded-3xl border border-border/70 bg-mint/60 p-4 transition-transform hover:-translate-y-0.5"
            >
              <ShieldCheck className="h-5 w-5 text-mint-foreground" />
              <span className="text-xs font-semibold leading-tight text-mint-foreground">
                Permissões
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
