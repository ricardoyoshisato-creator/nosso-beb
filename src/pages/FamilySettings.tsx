import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Loader2,
  MailPlus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import { formatDate, roleLabels, timezones } from "@/lib/family";
import type { NotificationSettings } from "@/types/database";
import { cn } from "@/lib/utils";

const preferenceItems: { key: keyof NotificationSettings; title: string; description: string }[] = [
  {
    key: "push",
    title: "Notificações no celular",
    description: "Lembretes de consultas, vacinas e atualizações da família.",
  },
  {
    key: "weekly",
    title: "Resumo semanal por e-mail",
    description: "Toda segunda-feira com os registros e fotos da semana.",
  },
  {
    key: "photos",
    title: "Cuidadores podem enviar fotos",
    description: "Membros com permissão de cuidador podem publicar no álbum.",
  },
  {
    key: "history",
    title: "Compartilhar histórico com visitantes",
    description: "Permite que convidados vejam registros antigos do bebê.",
  },
];

const FamilySettings = () => {
  const { toast } = useToast();
  const { family, membership, pregnancy, loading, can, updateFamily, deleteFamily } = useFamily();

  const canEdit = can("family.edit");
  const canDelete = can("family.delete");

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [babyName, setBabyName] = useState("");
  const [babyDueDate, setBabyDueDate] = useState("");
  const [babyBirthDate, setBabyBirthDate] = useState("");
  const [babyGender, setBabyGender] = useState("surpresa");
  const [preferences, setPreferences] = useState<NotificationSettings>({
    push: true,
    weekly: true,
    photos: true,
    history: false,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!family) return;
    setName(family.name);
    setCity(family.city ?? "");
    setTimezone(family.timezone);
    setBabyName(family.baby_name ?? "");
    setBabyDueDate(family.baby_due_date ?? "");
    setBabyBirthDate(family.baby_birth_date ?? "");
    setBabyGender(family.baby_gender ?? "surpresa");
    setPreferences({
      push: family.notification_settings?.push ?? true,
      weekly: family.notification_settings?.weekly ?? true,
      photos: family.notification_settings?.photos ?? true,
      history: family.notification_settings?.history ?? false,
    });
  }, [family]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!family) {
    return <CreateFamilyCard />;
  }

  const stage: "gestacao" | "nascido" = babyBirthDate ? "nascido" : "gestacao";

  const selectStage = (nextStage: "gestacao" | "nascido") => {
    if (nextStage === "gestacao") {
      setBabyBirthDate("");
    } else {
      setBabyDueDate("");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Informe o nome da família para salvar.",
      });
      return;
    }

    setSaving(true);
    const { error } = await updateFamily({
      name: name.trim(),
      city: city.trim() || null,
      timezone,
      baby_name: babyName.trim() || null,
      baby_due_date:
        stage === "gestacao" ? (pregnancy?.due_date ?? babyDueDate) || null : null,
      baby_birth_date: stage === "nascido" ? babyBirthDate || null : null,
      baby_gender: babyGender as "menina" | "menino" | "surpresa",
      notification_settings: preferences,
    });
    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    toast({ title: "Configurações salvas", description: "As informações da família foram atualizadas." });
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await deleteFamily();
    setDeleting(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível excluir", description: error });
      return;
    }

    toast({ title: "Família excluída", description: "Você pode criar uma nova família quando quiser." });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Configurações"
        title={family.name}
        description="Ajuste as informações da família, do bebê e as preferências de compartilhamento."
        action={
          <Button
            asChild
            variant="outline"
            className="rounded-2xl border-border bg-card text-sm font-semibold shadow-soft hover:bg-muted"
          >
            <Link to="/familia/membros">
              <Users className="h-4 w-4" />
              Ver membros
            </Link>
          </Button>
        }
      />

      <div className="no-scrollbar animate-rise flex gap-2 overflow-x-auto pb-1">
        <Link
          to="/familia/membros"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 py-2 text-xs font-semibold text-foreground/80 shadow-soft transition-colors hover:bg-muted"
        >
          <Users className="h-3.5 w-3.5" />
          Membros
        </Link>
        <Link
          to="/familia/convites"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 py-2 text-xs font-semibold text-foreground/80 shadow-soft transition-colors hover:bg-muted"
        >
          <MailPlus className="h-3.5 w-3.5" />
          Convites
        </Link>
        <Link
          to="/familia/permissoes"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 py-2 text-xs font-semibold text-foreground/80 shadow-soft transition-colors hover:bg-muted"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Permissões
        </Link>
      </div>

      {!canEdit && (
        <div className="animate-rise rounded-3xl border border-border/70 bg-secondary/40 p-4 text-xs leading-relaxed text-secondary-foreground/85">
          Seu papel ({roleLabels[membership?.role ?? "viewer"]}) permite apenas visualizar as
          configurações. Fale com um administrador para alterar os dados.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Identidade */}
        <section className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-3">
          <div className="flex items-center gap-4">
            <span
              className="grid h-16 w-16 place-items-center rounded-3xl bg-lavender/70 font-display text-xl font-semibold text-lavender-foreground"
              aria-hidden="true"
            >
              {family.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("")}
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Identidade da família
              </h2>
              <p className="text-xs text-muted-foreground">
                Criada em {formatDate(family.created_at.slice(0, 10))} ·{" "}
                {roleLabels[membership?.role ?? "viewer"]}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="family-name" className="text-xs font-semibold text-foreground/80">
                Nome da família
              </Label>
              <Input
                id="family-name"
                value={name}
                disabled={!canEdit}
                onChange={(event) => setName(event.target.value)}
                className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="family-city" className="text-xs font-semibold text-foreground/80">
                Cidade
              </Label>
              <Input
                id="family-city"
                value={city}
                disabled={!canEdit}
                onChange={(event) => setCity(event.target.value)}
                placeholder="São Paulo, SP"
                className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">Fuso horário</Label>
              <Select value={timezone} onValueChange={setTimezone} disabled={!canEdit}>
                <SelectTrigger className="h-11 rounded-2xl border-border bg-background text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {timezones.map((zone) => (
                    <SelectItem key={zone.value} value={zone.value}>
                      {zone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">Idioma</Label>
              <Select defaultValue="pt" disabled>
                <SelectTrigger className="h-11 rounded-2xl border-border bg-background text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="pt">Português (Brasil)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Bebê */}
        <section
          className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-2"
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sun/80 text-sun-foreground">
              <Sparkles className="h-[18px] w-[18px]" />
            </span>
            <h2 className="font-display text-lg font-semibold text-foreground">Sobre o bebê</h2>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
            {(
              [
                { id: "gestacao", label: "Na barriga" },
                { id: "nascido", label: "Já nasceu" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={!canEdit}
                onClick={() => selectStage(option.id)}
                className={cn(
                  "rounded-xl py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
                  stage === option.id
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="baby-name" className="text-xs font-semibold text-foreground/80">
                Nome do bebê
              </Label>
              <Input
                id="baby-name"
                value={babyName}
                disabled={!canEdit}
                onChange={(event) => setBabyName(event.target.value)}
                placeholder="Clara"
                className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="baby-date" className="text-xs font-semibold text-foreground/80">
                {stage === "gestacao" ? "Data prevista do parto" : "Data de nascimento"}
              </Label>
              {stage === "gestacao" && pregnancy ? (
                <>
                  <div className="flex h-11 items-center justify-between gap-2 rounded-2xl border border-border bg-muted/60 px-3.5">
                    <span className="text-sm font-semibold text-foreground">
                      {formatDate(pregnancy.due_date)}
                    </span>
                    <Link
                      to="/gestacao"
                      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      Editar no painel
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Calculada a partir da DUM no Painel da Gestação.
                  </p>
                </>
              ) : (
                <Input
                  id="baby-date"
                  type="date"
                  disabled={!canEdit}
                  value={stage === "gestacao" ? babyDueDate : babyBirthDate}
                  onChange={(event) =>
                    stage === "gestacao"
                      ? setBabyDueDate(event.target.value)
                      : setBabyBirthDate(event.target.value)
                  }
                  className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">Sexo</Label>
              <Select value={babyGender} onValueChange={setBabyGender} disabled={!canEdit}>
                <SelectTrigger className="h-11 rounded-2xl border-border bg-background text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="menina">Menina</SelectItem>
                  <SelectItem value="menino">Menino</SelectItem>
                  <SelectItem value="surpresa">Surpresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Preferências */}
        <section
          className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-3"
          style={{ animationDelay: "140ms" }}
        >
          <h2 className="font-display text-lg font-semibold text-foreground">
            Preferências de compartilhamento
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Escolha como a família recebe novidades e o que os convidados podem ver.
          </p>

          <ul className="mt-4 divide-y divide-border">
            {preferenceItems.map((preference) => (
              <li key={preference.key} className="flex items-start justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{preference.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {preference.description}
                  </p>
                </div>
                <Switch
                  checked={preferences[preference.key]}
                  disabled={!canEdit}
                  onCheckedChange={(checked) =>
                    setPreferences((current) => ({ ...current, [preference.key]: checked }))
                  }
                  aria-label={preference.title}
                  className="mt-0.5"
                />
              </li>
            ))}
          </ul>
        </section>

        {/* Zona de risco + salvar */}
        <div className="space-y-4 lg:col-span-2">
          <section
            className="animate-rise rounded-4xl border border-destructive/25 bg-destructive/5 p-5"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-[18px] w-[18px]" />
              <h2 className="font-display text-base font-semibold">Zona de risco</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Excluir a família remove membros, convites e registros permanentemente.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!canDelete}
                  className="mt-4 h-11 w-full rounded-2xl border-destructive/40 bg-card text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir família
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">
                    Excluir {family.name}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os membros perderão o acesso aos
                    registros, fotos e consultas da família.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-2xl">Manter família</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleting}
                    className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    {deleting ? "Excluindo…" : "Excluir"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>

          <section
            className="animate-rise rounded-4xl border border-border/70 bg-secondary/40 p-5"
            style={{ animationDelay: "240ms" }}
          >
            <p className="text-xs leading-relaxed text-secondary-foreground/80">
              As alterações são salvas direto no seu espaço privado no Supabase.
            </p>
            <Button
              onClick={handleSave}
              disabled={!canEdit || saving}
              className="mt-4 h-11 w-full rounded-2xl text-sm font-semibold shadow-soft"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FamilySettings;
