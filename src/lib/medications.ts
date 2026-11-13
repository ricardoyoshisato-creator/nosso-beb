import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { DoseStatus, Medication, MedicationDose, MedicationFrequency } from "@/types/database";

export const frequencyMeta: Record<MedicationFrequency, { label: string; hint: string }> = {
  daily: { label: "Todos os dias", hint: "entra no checklist diariamente" },
  every_other_day: { label: "Dias alternados", hint: "um dia sim, um dia não" },
  weekly: { label: "Uma vez por semana", hint: "no mesmo dia da semana da data de início" },
  as_needed: { label: "Se necessário", hint: "fora do checklist diário" },
};

export const frequencyOptions = Object.keys(frequencyMeta) as MedicationFrequency[];

/** Sugestões de unidade — texto livre continua permitido. */
export const dosageUnitOptions = [
  "mg",
  "mcg",
  "g",
  "ml",
  "gotas",
  "comprimido(s)",
  "cápsula(s)",
  "UI",
  "sachê(s)",
  "aplicação(ões)",
];

export const doseStatusMeta: Record<DoseStatus, { label: string; chip: string }> = {
  taken: { label: "Tomada", chip: "bg-mint/80 text-mint-foreground" },
  late: { label: "Atrasada", chip: "bg-sun/90 text-sun-foreground" },
  missed: { label: "Não tomada", chip: "bg-destructive/10 text-destructive" },
  pending: { label: "A registrar", chip: "bg-muted text-muted-foreground" },
};

/** Horários salvos como "HH:MM:SS"; a interface trabalha com "HH:MM". */
export function normalizeTime(value: string) {
  return value.slice(0, 5);
}

export function formatTimeLabel(time: string) {
  return normalizeTime(time);
}

export function todayString(now = new Date()) {
  return format(now, "yyyy-MM-dd");
}

export function dayLabel(date: string, now = new Date()) {
  const today = todayString(now);
  if (date === today) return "Hoje";
  if (date === format(addDays(parseISO(today), -1), "yyyy-MM-dd")) return "Ontem";
  if (date === format(addDays(parseISO(today), 1), "yyyy-MM-dd")) return "Amanhã";
  const label = format(parseISO(date), "EEE, dd 'de' MMM", { locale: ptBR }).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shiftedDay(date: string, days: number) {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

/**
 * O medicamento está previsto neste dia?
 * A regra vem apenas do que a família cadastrou (frequência + período).
 */
export function medicationOccursOn(medication: Medication, date: string) {
  if (medication.frequency === "as_needed") return false;
  if (date < medication.start_date) return false;
  if (medication.end_date && date > medication.end_date) return false;

  const distance = differenceInCalendarDays(parseISO(date), parseISO(medication.start_date));
  if (medication.frequency === "daily") return true;
  if (medication.frequency === "every_other_day") return distance % 2 === 0;
  return distance % 7 === 0;
}

export function medicationIsCurrent(medication: Medication, today = todayString()) {
  return medication.start_date <= today && (!medication.end_date || medication.end_date >= today);
}

export type DoseSlot = {
  key: string;
  medication: Medication;
  date: string;
  time: string;
  scheduledAt: Date;
  /** Status registrado ou derivado do relógio (dose não marcada que já passou). */
  status: DoseStatus;
  recorded: boolean;
  dose: MedicationDose | null;
};

function slotKey(medicationId: string, date: string, time: string) {
  return `${medicationId}|${date}|${normalizeTime(time)}`;
}

/** Checklist de um dia: um item por horário previsto do medicamento. */
export function buildDayChecklist(
  medications: readonly Medication[],
  doses: readonly MedicationDose[],
  date: string,
  now: Date = new Date(),
): DoseSlot[] {
  const recorded = new Map<string, MedicationDose>();
  for (const dose of doses) {
    if (dose.dose_date !== date) continue;
    recorded.set(slotKey(dose.medication_id, dose.dose_date, dose.dose_time), dose);
  }

  const slots: DoseSlot[] = [];

  for (const medication of medications) {
    if (!medicationOccursOn(medication, date)) continue;

    for (const raw of medication.times ?? []) {
      const time = normalizeTime(raw);
      const scheduledAt = parseISO(`${date}T${time}:00`);
      const dose = recorded.get(slotKey(medication.id, date, time)) ?? null;
      const overdue = !dose && scheduledAt.getTime() < now.getTime();

      slots.push({
        key: `${medication.id}|${date}|${time}`,
        medication,
        date,
        time,
        scheduledAt,
        status: dose ? dose.status : overdue ? "late" : "pending",
        recorded: Boolean(dose),
        dose,
      });
    }
  }

  return slots.sort(
    (a, b) => a.time.localeCompare(b.time) || a.medication.name.localeCompare(b.medication.name, "pt-BR"),
  );
}

export type AdherenceStats = {
  scheduled: number;
  taken: number;
  late: number;
  missed: number;
  unregistered: number;
  rate: number;
};

/**
 * Adesão dos últimos `days` dias considerando apenas doses cujo horário já passou.
 * Doses sem registro contam como não tomadas no denominador.
 */
export function adherenceStats(
  medications: readonly Medication[],
  doses: readonly MedicationDose[],
  days = 7,
  now: Date = new Date(),
): AdherenceStats {
  const recorded = new Map<string, MedicationDose>();
  for (const dose of doses) {
    recorded.set(slotKey(dose.medication_id, dose.dose_date, dose.dose_time), dose);
  }

  const today = todayString(now);
  const stats: AdherenceStats = {
    scheduled: 0,
    taken: 0,
    late: 0,
    missed: 0,
    unregistered: 0,
    rate: 0,
  };

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = format(addDays(parseISO(today), -index), "yyyy-MM-dd");

    for (const medication of medications) {
      if (!medicationOccursOn(medication, date)) continue;

      for (const raw of medication.times ?? []) {
        const time = normalizeTime(raw);
        if (parseISO(`${date}T${time}:00`).getTime() > now.getTime()) continue;

        stats.scheduled += 1;
        const dose = recorded.get(slotKey(medication.id, date, time));

        if (!dose) stats.unregistered += 1;
        else if (dose.status === "taken") stats.taken += 1;
        else if (dose.status === "late") stats.late += 1;
        else if (dose.status === "missed") stats.missed += 1;
      }
    }
  }

  stats.rate = stats.scheduled > 0 ? Math.round((stats.taken / stats.scheduled) * 100) : 0;
  return stats;
}

/** Registros de adesão agrupados por dia (mais recente primeiro). */
export function groupDosesByDate(doses: readonly MedicationDose[]) {
  const groups = new Map<string, MedicationDose[]>();

  for (const dose of doses) {
    const current = groups.get(dose.dose_date);
    if (current) current.push(dose);
    else groups.set(dose.dose_date, [dose]);
  }

  return [...groups.entries()]
    .map(([date, list]) => ({
      date,
      doses: [...list].sort((a, b) => a.dose_time.localeCompare(b.dose_time)),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
