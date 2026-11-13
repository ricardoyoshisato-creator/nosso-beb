import { useState } from "react";
import { Camera, Heart, Maximize2, Pencil, Trash2, Video } from "lucide-react";

import { MemoryMedia } from "@/components/MemoryMedia";
import { MEMORY_BUCKET, createSignedFileUrl } from "@/lib/attachments";
import { formatShortDate } from "@/lib/family";
import { memoryCategoryMetaOf, memoryMediaKind } from "@/lib/memories";
import { cn } from "@/lib/utils";
import type { Memory } from "@/types/database";

type MemoryCardProps = {
  memory: Memory;
  canEdit: boolean;
  canDelete: boolean;
  favoriteBusy?: boolean;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** Card de uma memória na linha do tempo vertical (mídia, título, data e coração). */
export function MemoryCard({
  memory,
  canEdit,
  canDelete,
  favoriteBusy = false,
  onToggleFavorite,
  onEdit,
  onDelete,
}: MemoryCardProps) {
  const [opening, setOpening] = useState(false);
  const meta = memoryCategoryMetaOf(memory.category);
  const kind = memoryMediaKind(memory.media_path);
  const { day, month } = formatShortDate(memory.date);

  /** Abre a foto em tamanho maior por uma URL assinada gerada na hora. */
  const handleOpenPhoto = async () => {
    if (!memory.media_path) return;

    setOpening(true);
    const { url } = await createSignedFileUrl(MEMORY_BUCKET, memory.media_path);
    setOpening(false);

    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <article className="animate-rise overflow-hidden rounded-4xl border border-border/70 bg-card shadow-soft">
      <div className="relative">
        <div className="relative w-full overflow-hidden">
          {memory.media_path && kind !== "none" ? (
            <MemoryMedia
              path={memory.media_path}
              alt={`Mídia da memória ${memory.title}`}
              className={cn(
                "w-full object-cover",
                kind === "video" ? "max-h-72 bg-black" : "aspect-[4/3]",
              )}
            />
          ) : (
            <div className={cn("grid aspect-[4/3] w-full place-items-center", meta.chip)}>
              <Camera className="h-8 w-8 opacity-60" aria-hidden />
            </div>
          )}
        </div>

        {kind === "video" && (
          <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-foreground/70 px-2.5 py-1 text-[10px] font-semibold text-background backdrop-blur">
            <Video className="h-3 w-3" />
            vídeo
          </span>
        )}

        {kind === "image" && (
          <button
            type="button"
            onClick={() => void handleOpenPhoto()}
            disabled={opening}
            aria-label={`Ver a foto de ${memory.title} em tamanho maior`}
            className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 text-foreground/70 shadow-soft backdrop-blur transition-colors hover:text-foreground disabled:opacity-60"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={favoriteBusy}
          aria-pressed={memory.is_favorite}
          aria-label={memory.is_favorite ? "Remover dos favoritos" : "Favoritar memória"}
          className={cn(
            "absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-card/90 text-rose-foreground shadow-soft backdrop-blur transition-transform active:scale-90 disabled:opacity-70",
            memory.is_favorite && "bg-rose text-rose-foreground",
          )}
        >
          <Heart
            className={cn("h-5 w-5 transition-colors", memory.is_favorite && "fill-current")}
          />
        </button>

        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <span className="inline-flex flex-col rounded-2xl bg-card/90 px-2.5 py-1 text-center leading-none shadow-soft backdrop-blur">
            <span className="font-display text-sm font-semibold text-foreground">{day}</span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {month}
            </span>
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-soft backdrop-blur",
              meta.chip,
            )}
          >
            {meta.label}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 px-4 pb-4 pt-3.5">
        <h3 className="text-balance font-display text-base font-semibold leading-snug text-foreground">
          {memory.title}
        </h3>

        {memory.description && (
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {memory.description}
          </p>
        )}

        {(canEdit || canDelete) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                aria-label={`Excluir ${memory.title}`}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Excluir
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
