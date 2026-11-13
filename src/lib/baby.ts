import { differenceInCalendarDays, differenceInMonths, format, parseISO } from "date-fns";

import type { BabyProfile, Family } from "@/types/database";

/** Dias de calendário no formato do banco ("AAAA-MM-DD"), sem passar por UTC. */
export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Data de nascimento que libera os módulos do bebê.
 * O perfil do bebê é a fonte principal; `families.baby_birth_date` continua
 * valendo para as famílias que já preencheram a data nas configurações.
 */
export function babyBirthDate(profile: BabyProfile | null, family: Family | null) {
  return profile?.birth_date || family?.baby_birth_date || null;
}

/** Regra de negócio: sem data de nascimento, Rotina, Vacinas e Crescimento ficam bloqueados. */
export function areBabyModulesUnlocked(profile: BabyProfile | null, family: Family | null) {
  return Boolean(babyBirthDate(profile, family));
}

export type BabyAge = {
  days: number;
  weeks: number;
  months: number;
  label: string;
};

/** Idade do bebê em dias, semanas e meses, com rótulo pronto para a interface. */
export function babyAge(birthDate?: string | null): BabyAge | null {
  if (!birthDate) return null;

  const birth = parseISO(birthDate);
  const days = Math.max(0, differenceInCalendarDays(new Date(), birth));
  const weeks = Math.floor(days / 7);
  const months = Math.max(0, differenceInMonths(new Date(), birth));

  return { days, weeks, months, label: ageLabel(days, weeks, months) };
}

function ageLabel(days: number, weeks: number, months: number) {
  if (days === 0) return "nasceu hoje";
  if (days === 1) return "1 dia de vida";
  if (days < 14) return `${days} dias de vida`;

  if (days < 63) {
    const rest = days - weeks * 7;
    const weekLabel = `${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
    const restLabel = rest > 0 ? ` e ${rest} ${rest === 1 ? "dia" : "dias"}` : "";
    return `${weekLabel}${restLabel} de vida`;
  }

  if (months < 24) {
    return `${months} ${months === 1 ? "mês" : "meses"} de vida`;
  }

  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  const yearLabel = `${years} ${years === 1 ? "ano" : "anos"}`;
  const restLabel = restMonths > 0 ? ` e ${restMonths} ${restMonths === 1 ? "mês" : "meses"}` : "";
  return `${yearLabel}${restLabel} de vida`;
}

/** Horário do nascimento: "HH:MM:SS" no banco, "HH:MM" na interface. */
export function formatBirthTime(value?: string | null) {
  return value ? value.slice(0, 5) : null;
}

export function formatKilograms(value?: number | null) {
  if (value === null || value === undefined) return null;
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

export function formatCentimeters(value?: number | null) {
  if (value === null || value === undefined) return null;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm`;
}

/** Converte texto livre ("3,25" ou "3.25") em número; vazio vira `null`. */
export function parseMeasure(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Número vindo do banco no formato digitável ("3,25"). */
export function toMeasureInput(value?: number | null) {
  if (value === null || value === undefined) return "";
  return String(value).replace(".", ",");
}

export const birthWeightRange = { min: 0.3, max: 30 } as const;
export const birthHeightRange = { min: 20, max: 100 } as const;
export const headCircumferenceRange = { min: 20, max: 60 } as const;
