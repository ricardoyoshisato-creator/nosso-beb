import { useState } from "react";
import { Check, Clock3, Copy, Link2, Loader2, Mail, MailPlus, Send, Sparkles, X } from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { PageHeader } from "@/components/PageHeader";
import { InitialsAvatar, type AvatarTone } from "@/components/InitialsAvatar";
import { FamilyEmptyArt } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import { assignableRoles, formatDate, relativeTime, roleLabels } from "@/lib/family";
import type { FamilyInvitation, FamilyRole } from "@/types/database";

const roleStyles: Record<FamilyRole, string> = {
  owner: "bg-primary/15 text-[hsl(13,62%,38%)]",
  admin: "bg-lavender/70 text-lavender-foreground",
  caregiver: "bg-mint/70 text-mint-foreground",
  viewer: "bg-sun/80 text-sun-foreground",
};

const toneByRole: Record<FamilyRole, AvatarTone> = {
  owner: "primary",
  admin: "lavender",
  caregiver: "mint",
  viewer: "sun",
};

function inviteUrl(token: string) {
  return `${window.location.origin}/convite/${token}`;
}

const Invites = () => {
  const { toast } = useToast();
  const {
    family,
    invitations,
    loading,
    can,
    inviteMember,
    resendInvitation,
    cancelInvitation,
  } = useFamily();

  const canInvite = can("members.invite");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FamilyRole>("caregiver");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const now = Date.now();
  const pending = invitations.filter(
    (invite) => invite.status === "pending" && new Date(invite.expires_at).getTime() > now,
  );
  const accepted = invitations.filter((invite) => invite.status === "accepted");
  const expired = invitations.filter(
    (invite) =>
      invite.status === "expired" ||
      (invite.status === "pending" && new Date(invite.expires_at).getTime() <= now),
  );

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    setFormError(null);
    const { error } = await inviteMember(email, role);
    setSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }

    const sentTo = email.trim();
    setEmail("");
    toast({
      title: "Convite criado",
      description: `Copie o link do convite de ${sentTo} e envie para a pessoa.`,
    });
  };

  const copyInvite = async (invite: FamilyInvitation) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(invite.token));
      toast({ title: "Link copiado", description: `Envie para ${invite.email}.` });
    } catch {
      toast({ variant: "destructive", title: "Não foi possível copiar", description: inviteUrl(invite.token) });
    }
  };

  const handleResend = async (invite: FamilyInvitation) => {
    setBusyId(invite.id);
    const { error } = await resendInvitation(invite.id);
    setBusyId(null);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível renovar", description: error });
      return;
    }

    toast({ title: "Convite renovado", description: "O link voltou a valer por 7 dias." });
  };

  const handleCancel = async (invite: FamilyInvitation) => {
    setBusyId(invite.id);
    const { error } = await cancelInvitation(invite.id);
    setBusyId(null);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível cancelar", description: error });
      return;
    }

    toast({ title: "Convite cancelado", description: `${invite.email} não pode mais usar o link.` });
  };

  const firstPending = pending[0];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Família"
        title="Convites"
        description="Convide avós, padrinhos e cuidadores. Cada pessoa entra com o papel que você definir."
        action={
          <Button
            variant="outline"
            disabled={!firstPending}
            onClick={() => firstPending && copyInvite(firstPending)}
            className="rounded-2xl border-border bg-card text-sm font-semibold shadow-soft hover:bg-muted"
          >
            <Copy className="h-4 w-4" />
            Copiar último link
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Formulário de convite */}
        <section className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-[hsl(13,62%,38%)]">
              <MailPlus className="h-[18px] w-[18px]" />
            </span>
            <h2 className="font-display text-lg font-semibold text-foreground">Novo convite</h2>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            O convite cria um link exclusivo para o e-mail informado. A pessoa entra na família ao
            aceitar, com o papel escolhido.
          </p>

          {canInvite ? (
            <form onSubmit={handleInvite} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-xs font-semibold text-foreground/80">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="pessoa@email.com"
                    className="h-11 rounded-2xl border-border bg-background pl-11 text-sm focus-visible:ring-primary/40"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/80">Papel na família</Label>
                  <Select value={role} onValueChange={(value) => setRole(value as FamilyRole)}>
                    <SelectTrigger className="h-11 w-full rounded-2xl border-border bg-background text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {assignableRoles.map((option) => (
                        <SelectItem key={option} value={option}>
                          {roleLabels[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-11 w-full rounded-2xl text-sm font-semibold shadow-soft"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Criar convite
                  </Button>
                </div>
              </div>

              {formError && (
                <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-medium leading-relaxed text-destructive">
                  {formError}
                </p>
              )}
            </form>
          ) : (
            <div className="mt-4 rounded-2xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
              Seu papel atual não permite criar convites. Fale com um administrador da família.
            </div>
          )}
        </section>

        {/* Como funciona */}
        <section
          className="animate-rise flex flex-col justify-between rounded-4xl border border-border/70 bg-secondary/40 p-5 lg:col-span-2"
          style={{ animationDelay: "80ms" }}
        >
          <div>
            <div className="flex items-center gap-2 text-secondary-foreground">
              <Sparkles className="h-[18px] w-[18px]" />
              <h2 className="font-display text-lg font-semibold">Como o convite chega</h2>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-secondary-foreground/80">
              Cada convite pendente tem um link exclusivo, válido por 7 dias. Copie e envie para a
              pessoa: ao abrir e entrar com o e-mail convidado, ela passa a fazer parte da família.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-3">
              <Link2 className="h-4 w-4 shrink-0 text-secondary-foreground/70" />
              <code className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground/80">
                {firstPending ? inviteUrl(firstPending.token) : "Sem convites pendentes"}
              </code>
              {firstPending && (
                <button
                  type="button"
                  onClick={() => copyInvite(firstPending)}
                  aria-label="Copiar link do convite"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground transition-colors hover:bg-lavender"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-foreground/70">
            <Clock3 className="h-3.5 w-3.5" />
            {pending.length} {pending.length === 1 ? "link ativo" : "links ativos"}
          </div>
        </section>
      </div>

      {/* Listas */}
      <section
        className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
        style={{ animationDelay: "140ms" }}
      >
        <Tabs defaultValue="pendentes">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-2xl bg-muted p-1">
            <TabsTrigger
              value="pendentes"
              className="rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-soft"
            >
              Pendentes · {pending.length}
            </TabsTrigger>
            <TabsTrigger
              value="aceitos"
              className="rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-soft"
            >
              Aceitos · {accepted.length}
            </TabsTrigger>
            <TabsTrigger
              value="expirados"
              className="rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-soft"
            >
              Expirados · {expired.length}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="mt-4">
            {pending.length > 0 ? (
              <ul className="divide-y divide-border">
                {pending.map((invite) => (
                  <li key={invite.id} className="flex flex-wrap items-center gap-3 py-3.5">
                    <InitialsAvatar name={invite.email} tone={toneByRole[invite.role]} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Enviado {relativeTime(invite.created_at)} · expira em{" "}
                        {formatDate(invite.expires_at.slice(0, 10))}
                      </p>
                    </div>
                    <Badge
                      className={`rounded-full border-transparent px-2 py-0.5 text-[10px] ${roleStyles[invite.role]}`}
                    >
                      {roleLabels[invite.role]}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl border-border bg-background px-2.5 text-[11px] font-semibold hover:bg-muted"
                        onClick={() => copyInvite(invite)}
                      >
                        <Copy className="h-3 w-3" />
                        Link
                      </Button>
                      {canInvite && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === invite.id}
                            className="h-8 rounded-xl border-border bg-background px-2.5 text-[11px] font-semibold hover:bg-muted"
                            onClick={() => handleResend(invite)}
                          >
                            {busyId === invite.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Renovar
                          </Button>
                          <button
                            type="button"
                            aria-label={`Cancelar convite de ${invite.email}`}
                            disabled={busyId === invite.id}
                            onClick={() => handleCancel(invite)}
                            className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center px-2 py-8 text-center">
                <FamilyEmptyArt className="h-auto w-full max-w-[240px]" />
                <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
                  Nenhum convite pendente
                </h3>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Todos os convites foram aceitos. Que tal chamar os padrinhos?
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="aceitos" className="mt-4">
            {accepted.length > 0 ? (
              <ul className="divide-y divide-border">
                {accepted.map((invite) => (
                  <li key={invite.id} className="flex items-center gap-3 py-3.5">
                    <InitialsAvatar name={invite.email} tone="mint" size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{invite.email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Aceito em {formatDate(invite.accepted_at?.slice(0, 10) ?? invite.updated_at.slice(0, 10))}
                      </p>
                    </div>
                    <span className="hidden items-center gap-1 text-[11px] font-semibold text-mint-foreground sm:flex">
                      <Check className="h-3.5 w-3.5" />
                      Ativo
                    </span>
                    <Badge
                      className={`rounded-full border-transparent px-2 py-0.5 text-[10px] ${roleStyles[invite.role]}`}
                    >
                      {roleLabels[invite.role]}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center px-2 py-8 text-center">
                <FamilyEmptyArt className="h-auto w-full max-w-[240px]" />
                <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
                  Nenhum convite aceito ainda
                </h3>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Quando alguém aceitar, aparece aqui com a data de entrada.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="expirados" className="mt-4">
            {expired.length > 0 ? (
              <ul className="divide-y divide-border">
                {expired.map((invite) => (
                  <li key={invite.id} className="flex flex-wrap items-center gap-3 py-3.5">
                    <InitialsAvatar name={invite.email} tone="sun" size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expirou em {formatDate(invite.expires_at.slice(0, 10))}
                      </p>
                    </div>
                    {canInvite && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === invite.id}
                        className="h-8 rounded-xl border-border bg-background px-2.5 text-[11px] font-semibold hover:bg-muted"
                        onClick={() => handleResend(invite)}
                      >
                        {busyId === invite.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Reativar
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center px-2 py-8 text-center">
                <FamilyEmptyArt className="h-auto w-full max-w-[240px]" />
                <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
                  Nada expirou por aqui
                </h3>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Convites com mais de 7 dias aparecem aqui para você renovar.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default Invites;
