import type { DocumentCategory, DocumentRecord } from "@/types/database";

export type DocumentCategoryMeta = {
  key: DocumentCategory;
  label: string;
  /** Cores do badge/filtro da categoria. */
  chip: string;
};

export const documentCategoryMeta: DocumentCategoryMeta[] = [
  { key: "exames", label: "Exames", chip: "bg-sky/70 text-sky-foreground" },
  { key: "vacinas", label: "Vacinas", chip: "bg-mint/70 text-mint-foreground" },
  { key: "gestacao", label: "Gestação", chip: "bg-lavender/70 text-lavender-foreground" },
  { key: "identidade", label: "Documentos pessoais", chip: "bg-sun/80 text-sun-foreground" },
  { key: "financeiro", label: "Financeiro", chip: "bg-clay/70 text-clay-foreground" },
  { key: "outros", label: "Outros", chip: "bg-muted text-foreground/70" },
];

export function documentCategoryMetaOf(category: DocumentCategory) {
  return documentCategoryMeta.find((meta) => meta.key === category) ?? documentCategoryMeta[5];
}

export type DocumentFileKind = "pdf" | "image" | "other";

/** Tipo do arquivo a partir da extensão do caminho no storage. */
export function documentFileKind(path?: string | null): DocumentFileKind {
  if (!path) return "other";
  if (/\.pdf$/i.test(path)) return "pdf";
  if (/\.(jpe?g|png|webp)$/i.test(path)) return "image";
  return "other";
}

/** Nome original do arquivo (o caminho guarda um prefixo uuid para evitar colisões). */
export function documentFileName(path?: string | null) {
  if (!path) return "";
  const base = path.split("/").pop() ?? path;
  return base.replace(/^[0-9a-f-]{36}-/i, "");
}

/** Extensão em maiúsculas para o rótulo do card ("PDF", "JPG"). */
export function documentFileExtension(path?: string | null) {
  const name = documentFileName(path);
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toUpperCase() : "ARQ";
}

/** Mais recentes primeiro (data do documento e, em empate, o envio). */
export function sortDocuments<T extends DocumentRecord>(documents: readonly T[]): T[] {
  return [...documents].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.created_at.localeCompare(a.created_at);
  });
}

export type DocumentCategoryFilter = DocumentCategory | "all";

/** Busca pelo nome (sem diferenciar maiúsculas/acentos) + filtro por categoria. */
export function filterDocuments<T extends DocumentRecord>(
  documents: readonly T[],
  query: string,
  category: DocumentCategoryFilter,
): T[] {
  const term = normalize(query.trim());

  return documents.filter((document) => {
    if (category !== "all" && document.category !== category) return false;
    if (!term) return true;
    return normalize(document.name).includes(term);
  });
}

/** Minúsculas e sem acentos, para comparação amigável. */
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Quantos documentos existem em cada categoria (para os filtros). */
export function documentCategoryCounts(documents: readonly DocumentRecord[]) {
  return documents.reduce<Record<string, number>>((totals, document) => {
    totals[document.category] = (totals[document.category] ?? 0) + 1;
    return totals;
  }, {});
}
