import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, Lock, RotateCcw, Save, ShieldCheck, Sparkles } from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { PageHeader } from "@/components/PageHeader";
import { InitialsAvatar, type AvatarTone } from "@/components/InitialsAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import { permissionMeta, roleDescriptions, roleLabels } from "@/lib/family";
import type { FamilyRole, PermissionKey } from "@/types/database";
import { cn } from "@/lib/utils";

const roleTabs: { id: FamilyRole; tone: string; hint: string }[] = [
  {
    id: "admin",
    tone: "bg-primary/15 text-[hsl(13,62%,38%)]",
    hint: "Administradores mantêm acesso total para nunca deixar a família sem gestão.",
  },
  {
    id: "caregiver",
    tone: "bg-lavender/70 text-lavender-foreground",
    hint: "Ideal para avós, babás e padrinhos presentes no dia a dia.",
  },
  {
    id: "viewer",
    tone: "bg-mint/70 text-mint-foreground",
    hint: "Perfeito para familiares e amigos que só acompanham as novidades.",
  },
];

const toneByRole: Record<FamilyRole, AvatarTone> = {
  owner: "primary",
  admin: "lavender",
  caregiver: "mint",
  viewer: "sun",
};

const rolePlural: Record<FamilyRole, string> = {
  owner: "proprietários",
  admin: "administradores",
  caregiver: "cuidadores",
  viewer: "visualizadores",
};

const matrixKey = (role: FamilyRole, permission: PermissionKey) => `${role}:${permission}`;

const Permissions = () => {
  const { toast } = useToast();
  const {
    family,
    membership,
    members,
    permissions,
    loading,
    can,
    savePermissions,
  } = useFamily();

  const canManage = can("permissions.manage");

  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [activeRole, setActiveRole] = useState<FamilyRole>("caregiver");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const role of ["owner", "admin", "caregiver", "viewer"] as FamilyRole[]) {
      for (const permission of permissionMeta) {
        const row = permissions.find(
          (item) => item.role === role && item.permission === permission.key,
        );
        next[matrixKey(role, permission.key)] =
          row?.allowed ?? (role === "owner" || role === "admin");
      }
    }
    setDraft(next);
  }, [permissions]);

  const dirtyRows = useMemo(() => {
    const rows: { role: FamilyRole; permission: PermissionKey; allowed: boolean }[] = [];
    for (const role of ["caregiver", "viewer"] as FamilyRole[]) {
      for (const permission of permissionMeta) {
        const current = permissions.find(
          (item) => item.role === role && item.permission === permission.key,
        );
        const value = draft[matrixKey(role, permission.key)] ?? false;
        if (value !== (current?.allowed ?? false)) {
          rows.push({ role, permission: permission.key, allowed: value });
        }
      }
    }
    return rows;
  }, [draft, permissions]);

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

  const togglePermission = (role: FamilyRole, permission: PermissionKey, checked: boolean) => {
    if (!canManage) return;
    setDraft((current) => ({ ...current, [matrixKey(role, permission)]: checked }));
  };

  const handleSave = async () => {
    if (dirtyRows.length === 0) {
      toast({ title: "Tudo em dia", description: "Nenhuma permissão foi alterada." });
      return;
    }

    setSaving(true);
    const { error } = await savePermissions(dirtyRows);
    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    toast({
      title: "Permissões salvas",
      description: `${dirtyRows.length} ${dirtyRows.length === 1 ? "regra atualizada" : "regras atualizadas"}.`,
    });
  };

  const restoreRole = (role: FamilyRole) => {
    const defaults: Record<FamilyRole, boolean> = {
      owner: true,
      admin: true,
      caregiver: false,
      viewer: false,
    };
    setDraft((current) => {
      const next = { ...current };
      for (const permission of permissionMeta) {
        next[matrixKey(role, permission.key)] =
          role === "caregiver"
            ? ["records.view", "records.create", "calendar.manage"].includes(permission.key)
            : role === "viewer"
              ? permission.key === "records.view"
              : defaults[role];
      }
      return next;
    });
    toast({ title: "Padrão aplicado", description: `Permissões de ${roleLabels[role]} restauradas.` });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Família"
        title="Gerenciamento de permissões"
        description="Defina o que cada papel pode ver e fazer. As regras valem para todos os membros com aquele papel."
        action={
          <Button
            onClick={handleSave}
            disabled={!canManage || saving || dirtyRows.length === 0}
            className="rounded-2xl text-sm font-semibold shadow-soft"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar{dirtyRows.length > 0 ? ` (${dirtyRows.length})` : ""}
          </Button>
        }
      />

      <div className="animate-rise flex items-start gap-3 rounded-3xl border border-border/70 bg-secondary/40 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-secondary-foreground shadow-soft">
          <ShieldCheck className="h-[18px] w-[18px]" />
        </span>
        <p className="text-xs leading-relaxed text-secondary-foreground/85">
          {canManage
            ? "Administradores e proprietários sempre têm acesso total — assim ninguém fica sem conseguir gerenciar a família. Cuidadores e visualizadores podem ser ajustados por aqui."
            : `Seu papel (${roleLabels[membership?.role ?? "viewer"]}) permite apenas consultar a matriz de permissões.`}
        </p>
      </div>

      <section className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <Tabs value={activeRole} onValueChange={(value) => setActiveRole(value as FamilyRole)}>
          <TabsList className="h-auto w-full flex-col gap-1 rounded-2xl bg-muted p-1 sm:flex-row">
            {roleTabs.map((role) => (
              <TabsTrigger
                key={role.id}
                value={role.id}
                className="w-full rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-soft"
              >
                {roleLabels[role.id]}
              </TabsTrigger>
            ))}
          </TabsList>

          {roleTabs.map((role) => {
            const fixed = role.id === "admin" || role.id === "owner";
            return (
              <TabsContent key={role.id} value={role.id} className="mt-4">
                <div className="flex flex-col gap-2 rounded-3xl border border-border/70 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("rounded-full px-2.5 py-0.5 text-[10px]", role.tone)}>
                        {roleLabels[role.id]}
                      </Badge>
                      {fixed && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          acesso total
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                      {roleDescriptions[role.id]}
                    </p>
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground sm:max-w-[200px] sm:text-right">
                    {role.hint}
                  </p>
                </div>

                <ul className="mt-3 divide-y divide-border">
                  {permissionMeta.map((permission) => {
                    const checked = fixed
                      ? true
                      : draft[matrixKey(role.id, permission.key)] ?? false;
                    const disabled = fixed || !canManage;

                    return (
                      <li
                        key={permission.key}
                        className="flex items-start justify-between gap-4 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{permission.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                        <Switch
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(value) =>
                            togglePermission(role.id, permission.key, value)
                          }
                          aria-label={`${permission.title} para ${roleLabels[role.id]}`}
                          className="mt-0.5"
                        />
                      </li>
                    );
                  })}
                </ul>

                {!fixed && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Alterações valem para todos os {rolePlural[role.id]} da família.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canManage}
                      className="h-9 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                      onClick={() => restoreRole(role.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar padrão
                    </Button>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </section>

      <div
        className="animate-rise rounded-4xl border border-border/70 bg-card p-5 shadow-soft"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Papéis dos membros
          </h2>
          <Link
            to="/familia/membros"
            className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            Gerenciar membros
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {members.map((member) => {
            const displayName = member.profile?.full_name?.trim() || member.profile?.email || "Membro";
            return (
              <li key={member.id} className="flex items-center gap-3 py-3">
                <InitialsAvatar name={displayName} tone={toneByRole[member.role]} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.profile?.email ?? "—"}
                  </p>
                </div>
                <Badge className="rounded-full border-transparent bg-muted px-2 py-0.5 text-[10px] text-foreground/70">
                  {roleLabels[member.role]}
                </Badge>
                {member.user_id === membership?.user_id && (
                  <span className="hidden items-center gap-1 text-[11px] font-semibold text-muted-foreground sm:flex">
                    <Check className="h-3.5 w-3.5" />
                    você
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Permissions;
