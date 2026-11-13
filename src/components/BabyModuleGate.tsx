import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { PageHeader } from "@/components/PageHeader";
import { StorageImage } from "@/components/StorageImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFamily } from "@/contexts/FamilyContext";
import { BABY_BUCKET } from "@/lib/attachments";
import { babyAge, babyBirthDate } from "@/lib/baby";
import { formatDate } from "@/lib/family";

type BabyModuleGateProps = {
  /** Nome do módulo, usado na navegação e nas mensagens. */
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** O que o módulo acompanha, exibido enquanto ele ainda não tem conteúdo próprio. */
  features?: string[];
  /** Conteúdo real do módulo, renderizado quando o perfil do bebê está liberado. */
  children?: ReactNode;
};

/**
 * Porta de entrada de Rotina, Vacinas e Crescimento.
 * Regra de negócio: sem `birth_date` no perfil do bebê, o módulo não abre —
 * a tela explica o motivo e leva direto ao perfil.
 */
export function BabyModuleGate({
  label,
  title,
  description,
  icon: Icon,
  features,
  children,
}: BabyModuleGateProps) {
  const { family, babyProfile, loading } = useFamily();

  if (loading) {
    return <div className="min-h-[40vh]" aria-hidden />;
  }

  if (!family) {
    return <CreateFamilyCard />;
  }

  const birthDate = babyBirthDate(babyProfile, family);
  const age = babyAge(birthDate);
  const unlocked = Boolean(birthDate);
  const babyName = babyProfile?.name?.trim() || family.baby_name?.trim() || "Seu bebê";

  return (
    <div className="space-y-5 pb-2">
      <PageHeader eyebrow={unlocked ? label : `${label} · bloqueado`} title={title} description={description} />

      {!unlocked ? (
        <section className="animate-rise relative overflow-hidden rounded-4xl bg-[hsl(20,32%,24%)] p-6 text-primary-foreground sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-primary/40" />
          <div className="pointer-events-none absolute -bottom-20 -left-14 h-56 w-56 rounded-full bg-lavender/20" />

          <div className="relative flex flex-col items-start gap-5">
            <span className="grid h-14 w-14 place-items-center rounded-3xl bg-card/20 text-primary-foreground backdrop-blur">
              <Lock className="h-6 w-6" />
            </span>

            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
                Módulo bloqueado
              </span>
              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight">
                Falta a data de nascimento
              </h2>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-primary-foreground/85">
                {label} usa a idade de {babyName} em cada registro. Cadastre a data de nascimento no
                perfil do bebê para liberar este e os outros módulos.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="h-11 rounded-2xl px-5 text-sm font-semibold shadow-soft">
                <Link to="/bebe/perfil">
                  Cadastrar data de nascimento
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-11 rounded-2xl px-4 text-sm font-semibold text-primary-foreground/85 hover:bg-card/15 hover:text-primary-foreground"
              >
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="animate-rise flex items-center gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-soft">
            {babyProfile?.avatar_url ? (
              <StorageImage
                bucket={BABY_BUCKET}
                path={babyProfile.avatar_url}
                alt={`Foto de ${babyName}`}
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
            ) : (
              <InitialsAvatar name={babyName} tone="primary" size="lg" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-semibold text-foreground">
                {babyName}
              </p>
              <p className="text-xs text-muted-foreground">
                {age ? `${age.label} · ` : ""}nascimento em {formatDate(birthDate)}
              </p>
            </div>
            <Badge className="shrink-0 rounded-full border-transparent bg-mint/70 px-2.5 py-1 text-[10px] font-semibold text-[hsl(164,34%,22%)]">
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" /> liberado
              </span>
            </Badge>
          </section>

          {children ?? (
            <section
              className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft"
              style={{ animationDelay: "80ms" }}
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-foreground">
                    O que vem por aqui
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {label} já está liberado para a família.
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {(features ?? []).map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 rounded-2xl bg-muted/60 px-3.5 py-2.5 text-xs leading-relaxed text-foreground/85"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-sun/40 px-3.5 py-3">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sun-foreground" />
                <p className="text-[11px] leading-relaxed text-sun-foreground">
                  Os registros de {label.toLowerCase()} entram nas próximas etapas do app. Enquanto
                  isso, o perfil do bebê já reúne as primeiras medidas da família.
                </p>
              </div>

              <Button
                asChild
                variant="outline"
                className="mt-4 h-11 w-full rounded-2xl border-border bg-background text-sm font-semibold hover:bg-muted"
              >
                <Link to="/bebe/perfil">Ver perfil do bebê</Link>
              </Button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
