import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { Family, FamilyRole, PermissionKey } from "@/types/database";

export const roleLabels: Record<FamilyRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  caregiver: "Cuidador",
  viewer: "Visualizador",
};

/** Papéis que podem ser atribuídos pela interface (o dono é definido na criação). */
export const assignableRoles: FamilyRole[] = ["admin", "caregiver", "viewer"];

export const roleDescriptions: Record<FamilyRole, string> = {
  owner: "Controle total da família, dos membros e das configurações.",
  admin: "Gerencia membros, convites e permissões da família.",
  caregiver: "Ajuda na rotina: registra o dia a dia e acompanha a agenda.",
  viewer: "Acompanha as novidades do bebê sem alterar nada.",
};

export const permissionMeta: { key: PermissionKey; title: string; description: string }[] = [
  { key: "family.edit", title: "Editar configurações da família", description: "Alterar nome, cidade, fuso e dados do bebê." },
  { key: "family.delete", title: "Excluir a família", description: "Remover a família e todos os registros ligados a ela." },
  { key: "members.invite", title: "Convidar membros", description: "Enviar e reenviar convites para novas pessoas." },
  { key: "members.manage", title: "Gerenciar membros", description: "Alterar o papel e remover membros da família." },
  { key: "permissions.manage", title: "Gerenciar permissões", description: "Definir o que cada papel pode fazer no app." },
  { key: "records.view", title: "Ver registros e álbum", description: "Acessar fotos, medidas e anotações do bebê." },
  { key: "records.create", title: "Adicionar registros", description: "Criar novas anotações, medidas e fotos." },
  { key: "records.edit", title: "Editar registros", description: "Alterar informações já publicadas." },
  { key: "records.delete", title: "Excluir registros", description: "Remover registros e fotos do bebê." },
  { key: "calendar.manage", title: "Gerenciar a agenda", description: "Criar e editar consultas, vacinas e lembretes." },
  { key: "data.export", title: "Exportar dados", description: "Baixar um arquivo com todo o histórico do bebê." },
];

export const timezones = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)" },
];

/**
 * Datas do app são dias de calendário ("AAAA-MM-DD"), sem fuso.
 * `parseISO` + `format` mantêm o mesmo dia local, sem deslocamento de timezone,
 * e `differenceInCalendarDays` já considera horário de verão.
 */
export function formatDate(value?: string | null) {
  if (!value) return "—";
  return format(parseISO(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatNumericDate(value?: string | null) {
  if (!value) return "—";
  return format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDayMonth(value?: string | null) {
  if (!value) return "—";
  return format(parseISO(value), "dd MMM", { locale: ptBR }).replace(".", "");
}

export function formatShortDate(value?: string | null) {
  if (!value) return { day: "--", month: "---" };
  const date = parseISO(value);
  return {
    day: format(date, "dd", { locale: ptBR }),
    month: format(date, "MMM", { locale: ptBR }).replace(".", ""),
  };
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);

  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;

  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;

  const months = Math.round(days / 30);
  return `há ${months} ${months === 1 ? "mês" : "meses"}`;
}

/** Dias de calendário entre hoje e a data informada (negativo = passado). */
export function daysUntil(value: string) {
  return differenceInCalendarDays(parseISO(value), new Date());
}

export type BabyStatus =
  | { mode: "empty" }
  | { mode: "pregnancy"; weeks: number; daysLeft: number; progress: number }
  | { mode: "born"; ageDays: number; ageLabel: string; progress: number };

export function babyStatus(family: Family | null): BabyStatus {
  if (!family) return { mode: "empty" };

  if (family.baby_birth_date) {
    const ageDays = Math.max(0, -daysUntil(family.baby_birth_date));
    const weeks = Math.floor(ageDays / 7);
    const ageLabel =
      ageDays < 7
        ? `${ageDays} ${ageDays === 1 ? "dia" : "dias"} de vida`
        : weeks < 12
          ? `${weeks} ${weeks === 1 ? "semana" : "semanas"} de vida`
          : `${Math.floor(ageDays / 30)} meses de vida`;
    return { mode: "born", ageDays, ageLabel, progress: 100 };
  }

  if (family.baby_due_date) {
    const daysLeft = daysUntil(family.baby_due_date);
    const weeks = Math.min(40, Math.max(0, 40 - Math.ceil(Math.max(daysLeft, 0) / 7)));
    return {
      mode: "pregnancy",
      weeks,
      daysLeft,
      progress: Math.round((weeks / 40) * 100),
    };
  }

  return { mode: "empty" };
}

export const actionLabels: Record<string, string> = {
  "family.created": "criou a família",
  "member.joined": "entrou na família",
};
