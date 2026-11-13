import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Baby,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Hospital,
  Info,
  Loader2,
  Lock,
  Pencil,
  Ruler,
  Scale,
  Sparkles,
  Stethoscope,
  Syringe,
  TrendingUp,
  Unlock,
} from "lucide-react";

import { BabyProfileForm } from "@/components/BabyProfileForm";
import type { BabyProfileFormValues } from "@/components/BabyProfileForm";
import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { PageHeader } from "@/components/PageHeader";
import { StorageImage } from "@/components/StorageImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import { BABY_BUCKET } from "@/lib/attachments";
import {
  babyAge,
  babyBirthDate,
  formatBirthTime,
  formatCentimeters,
  formatKilograms,
} from "@/lib/baby";
import { formatDate, formatNumericDate, roleLabels } from "@/lib/family";
import { cn } from "@/lib/utils";

const babyModules = [
  {
    to: "/rotina",
    label: "Rotina",
    description: "Sono, mamadas, fraldas e o dia a dia do bebê.",
    icon: Clock,
  },
  {
    to: "/vacinas",
    label: "Vacinas",
    description: "Calendário vacinal e as próximas doses.",
    icon: Syringe,
  },
  {
    to: "/crescimento",
    label: "Crescimento",
    description: "Peso, comprimento e perímetro cefálico ao longo do tempo.",
    icon: TrendingUp,
  },
] as const;

const BabyProfilePage = () => {
  const { toast } = useToast();
  const {
    family,
    membership,
    babyProfile,
    loading,
    can,
    saveBabyProfile,
    uploadBabyAvatar,
    removeBabyAvatar,
  } = useFamily();

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = can("family.edit");
  const birthDate = babyBirthDate(babyProfile, family);
  const age = babyAge(birthDate);
  const unlocked = Boolean(birthDate);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Abrindo o perfil do bebê…</p>
      </div>
    );
  }

  if (!family) {
    return <CreateFamilyCard />;
  }

  const handleSave = async (values: BabyProfileFormValues) => {
    setSaving(true);
    const previousAvatar = babyProfile?.avatar_url ?? null;
    const { error, id } = await saveBabyProfile(values);

    if (error) {
      setSaving(false);
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    if (id && values.avatarFile) {
      const { error: uploadError } = await uploadBabyAvatar(id, values.avatarFile, previousAvatar);
      if (uploadError) {
        setSaving(false);
        setFormOpen(false);
        toast({
          variant: "destructive",
          title: "Perfil salvo, mas a foto não subiu",
          description: uploadError,
        });
        return;
      }
    } else if (babyProfile && values.removeAvatar) {
      const { error: removeError } = await removeBabyAvatar(babyProfile);
      if (removeError) {
        setSaving(false);
        toast({
          variant: "destructive",
          title: "Não foi possível remover a foto",
          description: removeError,
        });
        return;
      }
    }

    setSaving(false);
    setFormOpen(false);
    toast({
      title: babyProfile ? "Perfil do bebê atualizado" : "Perfil do bebê criado",
      description: values.birthDate
        ? "Rotina, Vacinas e Crescimento estão liberados."
        : "Cadastre a data de nascimento quando quiser liberar os módulos.",
    });
  };

  /* ---------------------------- Primeiro cadastro --------------------------- */
  if (!babyProfile) {
    return (
      <div className="space-y-5 pb-2">
        <PageHeader
          eyebrow="Perfil do Bebê"
          title="Vamos conhecer o bebê"
          description="Nome, nascimento e as primeiras medidas. Com a data de nascimento, os módulos de Rotina, Vacinas e Crescimento são liberados."
        />

        {!canEdit ? (
          <div className="animate-rise rounded-3xl border border-border/70 bg-secondary/40 p-5 text-sm leading-relaxed text-secondary-foreground/85">
            Seu papel ({roleLabels[membership?.role ?? "viewer"]}) permite apenas visualizar. Peça a
            um administrador para preencher o perfil do bebê.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-5">
            <section className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft sm:p-6 lg:col-span-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Baby className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    O cantinho do bebê
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Dá para completar depois — os campos são opcionais.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <BabyProfileForm
                  defaults={{
                    name: family.baby_name ?? "",
                    birthDate: birthDate ?? "",
                  }}
                  submitLabel="Salvar perfil"
                  submitting={saving}
                  onSubmit={handleSave}
                />
              </div>
            </section>

            <aside className="animate-rise space-y-4 lg:col-span-2" style={{ animationDelay: "80ms" }}>
              <div className="relative overflow-hidden rounded-4xl bg-[hsl(20,32%,24%)] p-5 text-primary-foreground">
                <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/40" />
                <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-lavender/20" />
                <div className="relative">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
                    <Sparkles className="h-3.5 w-3.5" />
                    Tudo começa aqui
                  </span>
                  <p className="mt-4 font-display text-xl font-semibold leading-snug">
                    Uma data libera a rotina inteira.
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/85">
                    Enquanto a data de nascimento estiver vazia, Rotina, Vacinas e Crescimento ficam
                    bloqueados para a família.
                  </p>
                </div>
              </div>

              <div className="rounded-4xl border border-border/70 bg-card p-5 shadow-soft">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-base font-semibold text-foreground">
                    Módulos do bebê
                  </h3>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {babyModules.map((module) => (
                    <li
                      key={module.to}
                      className="flex items-center gap-2.5 rounded-2xl bg-muted/70 px-3 py-2.5"
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{module.label}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {module.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------- Perfil ativo ---------------------------- */
  const measures = [
    {
      label: "Peso ao nascer",
      value: formatKilograms(babyProfile.birth_weight),
      hint: "no nascimento",
      icon: Scale,
      chip: "bg-primary/15 text-[hsl(13,62%,38%)]",
    },
    {
      label: "Comprimento",
      value: formatCentimeters(babyProfile.birth_height),
      hint: "no nascimento",
      icon: Ruler,
      chip: "bg-mint/70 text-[hsl(164,34%,22%)]",
    },
    {
      label: "Perímetro cefálico",
      value: formatCentimeters(babyProfile.head_circumference),
      hint: "no nascimento",
      icon: Baby,
      chip: "bg-lavender/70 text-[hsl(266,30%,28%)]",
    },
  ];

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Perfil do Bebê"
        title={babyProfile.name}
        description={
          age
            ? `${age.label} · nascimento em ${formatDate(birthDate)}`
            : "Falta a data de nascimento para liberar Rotina, Vacinas e Crescimento."
        }
        action={
          canEdit ? (
            <Button
              onClick={() => setFormOpen(true)}
              className="rounded-2xl px-4 text-sm font-semibold shadow-soft"
            >
              <Pencil className="h-4 w-4" />
              Editar Perfil
            </Button>
          ) : undefined
        }
      />

      {!canEdit && (
        <div className="animate-rise rounded-3xl border border-border/70 bg-secondary/40 p-4 text-xs leading-relaxed text-secondary-foreground/85">
          Seu papel ({roleLabels[membership?.role ?? "viewer"]}) permite apenas visualizar o perfil.
          Fale com um administrador para alterar as informações do bebê.
        </div>
      )}

      {!unlocked && (
        <section className="animate-rise relative overflow-hidden rounded-4xl border border-sun/60 bg-sun/40 p-5">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-card/40" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-card text-sun-foreground shadow-soft">
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-sun-foreground">
                  Rotina, Vacinas e Crescimento bloqueados
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-sun-foreground/80">
                  Cadastre a data de nascimento do bebê para liberar esses módulos.
                </p>
              </div>
            </div>
            {canEdit && (
              <Button
                onClick={() => setFormOpen(true)}
                className="h-10 shrink-0 rounded-2xl px-4 text-xs font-semibold shadow-soft"
              >
                <CalendarDays className="h-4 w-4" />
                Cadastrar data
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Destaque do bebê */}
      <section className="animate-rise relative overflow-hidden rounded-4xl bg-[hsl(20,32%,24%)] p-5 text-primary-foreground sm:p-7">
        <div className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-primary/45" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-lavender/25" />
        <div className="pointer-events-none absolute bottom-8 right-16 h-14 w-14 rounded-full bg-sun/25" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          {babyProfile.avatar_url ? (
            <StorageImage
              bucket={BABY_BUCKET}
              path={babyProfile.avatar_url}
              alt={`Foto de ${babyProfile.name}`}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-card/30 sm:h-28 sm:w-28"
            />
          ) : (
            <InitialsAvatar
              name={babyProfile.name}
              tone="primary"
              size="xl"
              className="h-24 w-24 text-xl ring-4 ring-card/30 sm:h-28 sm:w-28"
            />
          )}

          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
              {unlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {unlocked ? "Módulos liberados" : "Módulos bloqueados"}
            </span>

            <h2 className="mt-2.5 font-display text-2xl font-semibold leading-tight sm:text-3xl">
              {babyProfile.name}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-foreground/85">
              {age && (
                <span className="rounded-full bg-card/20 px-2.5 py-1 backdrop-blur">{age.label}</span>
              )}
              {birthDate && (
                <span className="rounded-full bg-card/20 px-2.5 py-1 backdrop-blur">
                  {formatNumericDate(birthDate)}
                </span>
              )}
              {formatBirthTime(babyProfile.birth_time) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-card/20 px-2.5 py-1 backdrop-blur">
                  <Clock className="h-3 w-3" />
                  {formatBirthTime(babyProfile.birth_time)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Primeiras medidas */}
      <div className="grid gap-4 sm:grid-cols-3">
        {measures.map((measure, index) => (
          <div
            key={measure.label}
            className="animate-rise flex items-center gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-soft"
            style={{ animationDelay: `${80 + index * 60}ms` }}
          >
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", measure.chip)}>
              <measure.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {measure.label}
              </p>
              <p className="font-display text-lg font-semibold leading-tight text-foreground">
                {measure.value ?? "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {measure.value ? measure.hint : "não informado"}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Dados do nascimento */}
        <section
          className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-2"
          style={{ animationDelay: "160ms" }}
        >
          <h2 className="font-display text-lg font-semibold text-foreground">
            Dados do nascimento
          </h2>

          <dl className="mt-3 divide-y divide-border text-sm">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Data
              </dt>
              <dd className="text-right font-display text-sm font-semibold text-foreground">
                {formatNumericDate(birthDate)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Horário
              </dt>
              <dd className="text-right font-display text-sm font-semibold text-foreground">
                {formatBirthTime(babyProfile.birth_time) ?? "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3 py-2.5">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Hospital className="h-3.5 w-3.5" />
                Local
              </dt>
              <dd className="text-right text-xs font-medium leading-relaxed text-foreground/80">
                {babyProfile.maternity_hospital || "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3 py-2.5">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Stethoscope className="h-3.5 w-3.5" />
                Pediatra
              </dt>
              <dd className="text-right text-xs font-medium leading-relaxed text-foreground/80">
                {babyProfile.pediatrician || "—"}
              </dd>
            </div>
          </dl>

          {babyProfile.important_info && (
            <div className="mt-3 rounded-2xl bg-cream px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Info className="h-3 w-3" />
                Informações importantes
              </p>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-foreground/85">
                {babyProfile.important_info}
              </p>
            </div>
          )}

          {canEdit && (
            <Button
              variant="outline"
              onClick={() => setFormOpen(true)}
              className="mt-4 h-11 w-full rounded-2xl border-border bg-background text-sm font-semibold hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
              Editar Perfil
            </Button>
          )}
        </section>

        {/* Módulos do bebê */}
        <section
          className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-3"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Módulos do bebê
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Rotina, Vacinas e Crescimento usam a data de nascimento para acompanhar cada fase.
              </p>
            </div>
            <Badge
              className={cn(
                "shrink-0 rounded-full border-transparent px-2.5 py-1 text-[10px] font-semibold",
                unlocked
                  ? "bg-mint/70 text-[hsl(164,34%,22%)]"
                  : "bg-sun/70 text-[hsl(32,50%,26%)]",
              )}
            >
              {unlocked ? (
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3 w-3" /> liberados
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" /> bloqueados
                </span>
              )}
            </Badge>
          </div>

          <ul className="mt-4 space-y-2">
            {babyModules.map((module) => (
              <li key={module.to}>
                <Link
                  to={module.to}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors",
                    unlocked
                      ? "border-border bg-muted/50 hover:bg-secondary"
                      : "border-dashed border-border bg-muted/30",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                      unlocked
                        ? "bg-primary/15 text-[hsl(13,62%,38%)]"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <module.icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{module.label}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {unlocked ? module.description : "Liberado após cadastrar a data de nascimento."}
                    </p>
                  </div>
                  {unlocked ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Editar perfil do bebê</DialogTitle>
            <DialogDescription>
              Atualize a foto, as medidas do nascimento e as informações importantes. A família toda
              vê na hora.
            </DialogDescription>
          </DialogHeader>

          <BabyProfileForm
            // O formulário abre com a data efetiva (inclui a data já registrada
            // nas configurações da família) e a salva no perfil.
            profile={{ ...babyProfile, birth_date: birthDate }}
            submitLabel="Salvar alterações"
            submitting={saving}
            onSubmit={handleSave}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BabyProfilePage;
