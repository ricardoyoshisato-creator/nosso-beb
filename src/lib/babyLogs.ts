import { format, isToday, isYesterday, parseISO } from "date-fns";
import {
  Bath,
  Droplets,
  Heart,
  Milk,
  Moon,
  NotebookPen,
  Pill,
  Thermometer,
  Toilet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { BabyLog, BabyLogType } from "@/types/database";

export type BabyLogMeta = {
  type: BabyLogType;
  label: string;
  /** Rótulo do card de último acontecimento ("Última fralda"). */
  lastLabel: string;
  icon: LucideIcon;
  /** Cores do ícone/badge do tipo. */
  chip: string;
  /** Cores do botão rápido. */
  button: string;
  /** Título do modal de registro. */
  dialogTitle: string;
};

/** Ordem exibida nos cards, nos botões rápidos e nos seletores. */
export const babyLogMeta: BabyLogMeta[] = [
  {
    type: "fralda",
    label: "Fralda",
    lastLabel: "Última fralda",
    icon: Droplets,
    chip: "bg-sun/80 text-sun-foreground",
    button: "border-sun/70 bg-sun/55 text-sun-foreground hover:bg-sun/75",
    dialogTitle: "Registrar fralda",
  },
  {
    type: "mamadeira",
    label: "Mamadeira",
    lastLabel: "Última mamadeira",
    icon: Milk,
    chip: "bg-sky/80 text-sky-foreground",
    button: "border-sky/70 bg-sky/55 text-sky-foreground hover:bg-sky/75",
    dialogTitle: "Registrar mamadeira",
  },
  {
    type: "amamentacao",
    label: "Amamentação",
    lastLabel: "Última amamentação",
    icon: Heart,
    chip: "bg-rose/80 text-rose-foreground",
    button: "border-rose/70 bg-rose/55 text-rose-foreground hover:bg-rose/75",
    dialogTitle: "Registrar amamentação",
  },
  {
    type: "sono",
    label: "Sono",
    lastLabel: "Último sono",
    icon: Moon,
    chip: "bg-lavender/80 text-lavender-foreground",
    button: "border-lavender/80 bg-lavender/55 text-lavender-foreground hover:bg-lavender/75",
    dialogTitle: "Registrar sono",
  },
  {
    type: "banho",
    label: "Banho",
    lastLabel: "Último banho",
    icon: Bath,
    chip: "bg-mint/80 text-mint-foreground",
    button: "border-mint/70 bg-mint/55 text-mint-foreground hover:bg-mint/75",
    dialogTitle: "Registrar banho",
  },
  {
    type: "medicamento",
    label: "Medicamento",
    lastLabel: "Último medicamento",
    icon: Pill,
    chip: "bg-primary/20 text-[hsl(13,62%,38%)]",
    button: "border-primary/40 bg-primary/12 text-[hsl(13,62%,38%)] hover:bg-primary/20",
    dialogTitle: "Registrar medicamento",
  },
  {
    type: "temperatura",
    label: "Temperatura",
    lastLabel: "Última temperatura",
    icon: Thermometer,
    chip: "bg-clay/80 text-clay-foreground",
    button: "border-clay/70 bg-clay/55 text-clay-foreground hover:bg-clay/75",
    dialogTitle: "Registrar temperatura",
  },
  {
    type: "evacuacao",
    label: "Evacuação",
    lastLabel: "Última evacuação",
    icon: Toilet,
    chip: "bg-sand/90 text-sand-foreground",
    button: "border-sand/80 bg-sand/60 text-sand-foreground hover:bg-sand/80",
    dialogTitle: "Registrar evacuação",
  },
  {
    type: "outro",
    label: "Outro",
    lastLabel: "Último registro",
    icon: NotebookPen,
    chip: "bg-muted text-foreground/70",
    button: "border-border bg-muted/70 text-foreground/80 hover:bg-muted",
    dialogTitle: "Registrar outro cuidado",
  },
];

export function babyLogMetaOf(type: BabyLogType) {
  return babyLogMeta.find((meta) => meta.type === type) ?? babyLogMeta[babyLogMeta.length - 1];
}

export const milkTypeLabels = {
  leite_materno: "Leite materno",
  formula: "Fórmula",
  misto: "Misto",
} as const;

export const breastfeedingSideLabels = {
  esquerdo: "Esquerdo",
  direito: "Direito",
  ambos: "Os dois",
} as const;

export const stoolConsistencyLabels = {
  pastosa: "Pastosa",
  liquida: "Líquida",
  dura: "Dura",
} as const;

/** Último registro de um tipo (a lista já chega ordenada do mais recente). */
export function latestLogByType(logs: BabyLog[], type: BabyLogType) {
  return logs.find((log) => log.log_type === type) ?? null;
}

export function formatLogClock(iso: string) {
  return format(parseISO(iso), "HH:mm");
}

export function formatLogDay(iso: string) {
  const date = parseISO(iso);
  if (isToday(date)) return "hoje";
  if (isYesterday(date)) return "ontem";
  return format(date, "dd/MM");
}

export function isLogFromToday(iso: string) {
  return isToday(parseISO(iso));
}

export function formatLogWhen(iso: string) {
  return `${formatLogDay(iso)} · ${formatLogClock(iso)}`;
}

export function formatLogDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
}

export function formatTemperature(celsius: number) {
  return `${celsius.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} °C`;
}

/** Resumo curto do que foi registrado, a partir do JSONB `details`. */
export function babyLogSummary(log: BabyLog): string | null {
  const details = log.details ?? {};

  switch (log.log_type) {
    case "fralda": {
      const parts: string[] = [];
      if (details.xixi) parts.push("xixi");
      if (details.coco) parts.push("cocô");
      return parts.length > 0 ? capitalize(parts.join(" e ")) : null;
    }
    case "mamadeira": {
      const volume = details.volume_ml ? `${details.volume_ml} ml` : null;
      const milk = details.milk_type ? milkTypeLabels[details.milk_type] : null;
      return [volume, milk].filter(Boolean).join(" · ") || null;
    }
    case "amamentacao": {
      const duration = details.duration_min ? formatLogDuration(details.duration_min) : null;
      const side = details.side ? breastfeedingSideLabels[details.side] : null;
      return [duration, side].filter(Boolean).join(" · ") || null;
    }
    case "sono": {
      if (!details.started_at || !details.ended_at) return null;
      const start = formatLogClock(details.started_at);
      const end = formatLogClock(details.ended_at);
      const minutes = Math.round(
        (parseISO(details.ended_at).getTime() - parseISO(details.started_at).getTime()) / 60000,
      );
      const duration = minutes > 0 ? formatLogDuration(minutes) : null;
      return [duration, `${start}–${end}`].filter(Boolean).join(" · ");
    }
    case "medicamento": {
      const name = details.name?.trim();
      const dosage = details.dosage?.trim();
      if (!name) return dosage ?? null;
      return dosage ? `${name} · ${dosage}` : name;
    }
    case "temperatura":
      return typeof details.celsius === "number" ? formatTemperature(details.celsius) : null;
    case "evacuacao":
      return details.consistency ? stoolConsistencyLabels[details.consistency] : null;
    case "outro":
      return log.notes?.trim() || null;
    default:
      return log.notes?.trim() || null;
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
