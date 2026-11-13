import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock3,
  Crown,
  Loader2,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { PageHeader } from "@/components/PageHeader";
import { InitialsAvatar, type AvatarTone } from "@/components/InitialsAvatar";
import { FamilyEmptyArt } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useAuth } from "@/contexts/AuthContext";
import { useFamily, type FamilyMemberWithProfile } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import { assignableRoles, roleLabels } from "@/lib/family";
import type { FamilyRole } from "@/types/database";
import { cn } from "@/lib/utils";

const toneByRole: Record<FamilyRole, AvatarTone> = {
  owner: "primary",
  admin: "lavender",
  caregiver: "mint",
  viewer: "sun",
};

const roleBadgeStyles: Record<FamilyRole, string> = {
  owner: "bg-primary/15 text-[hsl(13,62%,38%)]",
  admin: "bg-lavender/70 text-lavender-foreground",
  caregiver: "bg-mint/70 text-mint-foreground",
  viewer: "bg-sun/80 text-sun-foreground",
};

const Members = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    family,
    members,
    loading,
    activeMembersCount,
    pendingInvitationsCount,
    can,
    updateMemberRole,
    removeMember,
  } = useFamily();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("todos");
  const [memberToRemove, setMemberToRemove] = useState<FamilyMemberWithProfile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = can("members.manage");
  const canInvite = can("members.invite");

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

  const filtered = members.filter((member) => {
    const name = member.profile?.full_name?.toLowerCase() ?? "";
    const email = member.profile?.email?.toLowerCase() ?? "";
    const term = query.trim().toLowerCase();
    const matchesQuery = !term || name.includes(term) || email.includes(term);
    const matchesRole = roleFilter === "todos" || member.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  const handleRoleChange = async (member: FamilyMemberWithProfile, role: FamilyRole) => {
    setBusyId(member.id);
    const { error } = await updateMemberRole(member.id, role);
    setBusyId(null);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível alterar o papel", description: error });
      return;
    }

    toast({ title: "Papel atualizado", description: `${roleLabels[role]} definido.` });
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    const isSelf = memberToRemove.user_id === user?.id;
    setBusyId(memberToRemove.id);
    const { error } = await removeMember(memberToRemove.id);
    setBusyId(null);
    setMemberToRemove(null);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: error });
      return;
    }

    toast({
      title: isSelf ? "Você saiu da família" : "Membro removido",
      description: isSelf
        ? "Você pode entrar novamente com um novo convite."
        : "A pessoa perdeu o acesso aos registros da família.",
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Família"
        title="Gerenciamento de membros"
        description="Quem participa da rotina do bebê, com qual papel e desde quando."
        action={
          canInvite ? (
            <Button asChild className="rounded-2xl text-sm font-semibold shadow-soft">
              <Link to="/familia/convites">
                <UserPlus className="h-4 w-4" />
                Convidar membro
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="animate-rise flex items-center gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-soft">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint/70 text-mint-foreground">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Membros ativos
            </p>
            <p className="font-display text-xl font-semibold text-foreground">{activeMembersCount}</p>
          </div>
        </div>
        <div
          className="animate-rise flex items-center gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-soft"
          style={{ animationDelay: "60ms" }}
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sun/80 text-sun-foreground">
            <Clock3 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Convites pendentes
            </p>
            <p className="font-display text-xl font-semibold text-foreground">
              {pendingInvitationsCount}
            </p>
          </div>
        </div>
        <div
          className="animate-rise flex items-center gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-soft"
          style={{ animationDelay: "120ms" }}
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender/70 text-lavender-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <Link
            to="/familia/permissoes"
            className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Revisar permissões
          </Link>
        </div>
      </div>

      <section className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome ou e-mail"
              aria-label="Buscar membros"
              className="h-11 rounded-2xl border-border bg-background pl-11 text-sm focus-visible:ring-primary/40"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger
              aria-label="Filtrar por papel"
              className="h-11 w-full rounded-2xl border-border bg-background text-sm sm:w-48"
            >
              <SelectValue placeholder="Todos os papéis" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="todos">Todos os papéis</SelectItem>
              {assignableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleLabels[role]}
                </SelectItem>
              ))}
              <SelectItem value="owner">{roleLabels.owner}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length > 0 ? (
          <ul className="mt-4 divide-y divide-border">
            {filtered.map((member) => {
              const displayName =
                member.profile?.full_name?.trim() || member.profile?.email || "Membro";
              const isSelf = member.user_id === user?.id;
              const canChangeRole = canManage && member.role !== "owner" && !isSelf;

              return (
                <li key={member.id} className="flex items-center gap-3 py-3.5">
                  <InitialsAvatar name={displayName} tone={toneByRole[member.role]} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {displayName}
                        {isSelf && <span className="ml-1 text-xs font-normal text-muted-foreground">(você)</span>}
                      </p>
                      {member.role === "owner" && (
                        <Crown className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.profile?.email ?? "Convite em andamento"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge
                        className={cn(
                          "rounded-full border-transparent px-2 py-0.5 text-[10px]",
                          roleBadgeStyles[member.role],
                        )}
                      >
                        {roleLabels[member.role]}
                      </Badge>
                      {member.status !== "active" && (
                        <Badge
                          variant="outline"
                          className="rounded-full border-border px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {member.status === "invited" ? "Convite pendente" : "Suspenso"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {(canManage || (isSelf && member.role !== "owner")) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Ações de ${displayName}`}
                          disabled={busyId === member.id}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          {busyId === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {displayName.split(" ")[0]}
                        </DropdownMenuLabel>

                        {canChangeRole ? (
                          <>
                            <DropdownMenuLabel className="pb-1 pt-2 text-[11px] font-semibold text-muted-foreground">
                              Papel na família
                            </DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={member.role}
                              onValueChange={(value) =>
                                handleRoleChange(member, value as FamilyRole)
                              }
                            >
                              {assignableRoles.map((role) => (
                                <DropdownMenuRadioItem
                                  key={role}
                                  value={role}
                                  className="rounded-xl"
                                >
                                  {roleLabels[role]}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                          </>
                        ) : (
                          <DropdownMenuSeparator />
                        )}

                        {canManage || isSelf ? (
                          <DropdownMenuItem
                            className="rounded-xl text-destructive focus:text-destructive"
                            onClick={() => setMemberToRemove(member)}
                          >
                            {isSelf ? "Sair da família" : "Remover da família"}
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center px-2 py-8 text-center">
            <FamilyEmptyArt className="h-auto w-full max-w-[260px]" />
            <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
              Nenhum membro encontrado
            </h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Tente outro nome ou convide alguém novo para acompanhar o bebê.
            </p>
            {canInvite && (
              <Button asChild className="mt-4 rounded-2xl text-sm font-semibold shadow-soft">
                <Link to="/familia/convites">
                  <UserPlus className="h-4 w-4" />
                  Convidar membro
                </Link>
              </Button>
            )}
          </div>
        )}
      </section>

      <AlertDialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {memberToRemove?.user_id === user?.id
                ? "Sair da família?"
                : `Remover ${memberToRemove?.profile?.full_name ?? "este membro"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa perde o acesso aos registros e ao álbum da família. Você pode convidá-la
              novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Members;
