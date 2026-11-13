import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { Memory, MemoryCategory } from "@/types/database";

export type MemoryCategoryMeta = {
  key: MemoryCategory;
  label: string;
  /** Cores do badge da categoria. */
  chip: string;
};

export const memoryCategories: MemoryCategoryMeta[] = [
  {
    key: "primeiro_ultrassom",
    label: "Primeiro ultrassom",
    chip: "bg-lavender/70 text-lavender-foreground",
  },
  { key: "nascimento", label: "Nascimento", chip: "bg-rose/80 text-rose-foreground" },
  { key: "primeiro_banho", label: "Primeiro banho", chip: "bg-sky/70 text-sky-foreground" },
  { key: "primeiro_sorriso", label: "Primeiro sorriso", chip: "bg-sun/80 text-sun-foreground" },
  { key: "primeira_palavra", label: "Primeira palavra", chip: "bg-mint/70 text-mint-foreground" },
  { key: "primeiros_passos", label: "Primeiros passos", chip: "bg-clay/70 text-clay-foreground" },
  { key: "primeira_comida", label: "Primeira comidinha", chip: "bg-sand/80 text-sand-foreground" },
  { key: "primeira_viagem", label: "Primeira viagem", chip: "bg-sky/60 text-sky-foreground" },
  { key: "aniversario", label: "Aniversário", chip: "bg-primary/20 text-primary" },
  { key: "outros", label: "Outro momento", chip: "bg-muted text-foreground/70" },
];

export function memoryCategoryMetaOf(category: MemoryCategory) {
  return memoryCategories.find((meta) => meta.key === category) ?? memoryCategories[9];
}

/** Limites do bucket `memories`: fotos até 10 MB e vídeos até 50 MB. */
export const MAX_MEMORY_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_MEMORY_VIDEO_BYTES = 50 * 1024 * 1024;
export const MEMORY_MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm";

export type MemoryMediaKind = "image" | "video" | "none";

/** Tipo da mídia a partir do caminho no storage (extensão ou prefixo do arquivo). */
export function memoryMediaKind(path?: string | null): MemoryMediaKind {
  if (!path) return "none";
  if (/\.(jpe?g|png|webp)$/i.test(path)) return "image";
  if (/\.(mp4|mov|m4v|webm)$/i.test(path)) return "video";
  return "none";
}

/** Nome original do arquivo (o caminho guarda um prefixo uuid para evitar colisões). */
export function memoryMediaFileName(path?: string | null) {
  if (!path) return "";
  const base = path.split("/").pop() ?? path;
  return base.replace(/^[0-9a-f-]{36}-/i, "");
}

/** Valida a foto/vídeo escolhido no formulário. */
export function validateMemoryMedia(file: File) {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    return "Envie uma foto (JPG, PNG, WEBP) ou um vídeo (MP4, MOV, WEBM).";
  }

  if (isImage && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "A foto precisa estar em JPG, PNG ou WEBP.";
  }

  if (isVideo && !["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) {
    return "O vídeo precisa estar em MP4, MOV ou WEBM.";
  }

  const limit = isVideo ? MAX_MEMORY_VIDEO_BYTES : MAX_MEMORY_IMAGE_BYTES;
  if (file.size > limit) {
    return isVideo ? `“${file.name}” passa de 50 MB.` : `“${file.name}” passa de 10 MB.`;
  }

  return null;
}

/** Da mais recente para a mais antiga (data do acontecimento e, em empate, o cadastro). */
export function sortMemories<T extends Memory>(memories: readonly T[]): T[] {
  return [...memories].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.created_at.localeCompare(a.created_at);
  });
}

export type MemoryFilter = "all" | "favorites";

/** Filtro do topo da linha do tempo: todas as memórias ou só as favoritas. */
export function filterMemories<T extends Memory>(memories: readonly T[], filter: MemoryFilter): T[] {
  return filter === "favorites" ? memories.filter((memory) => memory.is_favorite) : [...memories];
}

export function favoriteMemoriesCount(memories: readonly Memory[]) {
  return memories.filter((memory) => memory.is_favorite).length;
}

export type MemoryGroup<T extends Memory> = {
  key: string;
  /** Rótulo do mês usado como marcador da linha do tempo. */
  label: string;
  items: T[];
};

/** Agrupa por mês (já ordenado) para os marcadores da linha do tempo vertical. */
export function groupMemoriesByMonth<T extends Memory>(memories: readonly T[]): MemoryGroup<T>[] {
  const groups: MemoryGroup<T>[] = [];

  for (const memory of memories) {
    const key = memory.date.slice(0, 7);
    const last = groups[groups.length - 1];

    if (last && last.key === key) {
      last.items.push(memory);
      continue;
    }

    groups.push({
      key,
      label: format(parseISO(`${key}-01`), "MMMM 'de' yyyy", { locale: ptBR }),
      items: [memory],
    });
  }

  return groups;
}
