import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { format } from "date-fns";
import { CalendarHeart, Camera, ImagePlus, Loader2, Trash2, Video } from "lucide-react";

import { MemoryMedia } from "@/components/MemoryMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatFileSize } from "@/lib/attachments";
import {
  MEMORY_MEDIA_ACCEPT,
  memoryCategories,
  memoryMediaFileName,
  memoryMediaKind,
  validateMemoryMedia,
} from "@/lib/memories";
import { cn } from "@/lib/utils";
import type { Memory, MemoryCategory } from "@/types/database";

export type MemoryFormValues = {
  title: string;
  date: string;
  category: MemoryCategory;
  description: string;
  media: File | null;
  removeMedia: boolean;
};

type MemoryFormProps = {
  memory?: Memory | null;
  submitting?: boolean;
  onSubmit: (values: MemoryFormValues) => void;
  onCancel?: () => void;
};

const labelClass = "text-xs font-semibold text-foreground/80";
const fieldClass =
  "h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40";

export function MemoryForm({ memory, submitting = false, onSubmit, onCancel }: MemoryFormProps) {
  const [title, setTitle] = useState(memory?.title ?? "");
  const [date, setDate] = useState(memory?.date ?? format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState<MemoryCategory>(memory?.category ?? "outros");
  const [description, setDescription] = useState(memory?.description ?? "");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!media) {
      setMediaPreview(null);
      return;
    }

    const url = URL.createObjectURL(media);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [media]);

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    const mediaError = validateMemoryMedia(file);
    if (mediaError) {
      setError(mediaError);
      return;
    }

    setError(null);
    setRemoveMedia(false);
    setMedia(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Dê um título para a memória. Ex.: “Primeiro sorriso”.");
      return;
    }

    if (!date) {
      setError("Informe a data do acontecimento.");
      return;
    }

    setError(null);
    onSubmit({
      title: title.trim(),
      date,
      category,
      description,
      media,
      removeMedia,
    });
  };

  const hasExistingMedia = Boolean(memory?.media_path) && !removeMedia && !media;
  const selectedKind = media ? (media.type.startsWith("video/") ? "video" : "image") : "none";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="memory-title" className={labelClass}>
          Título *
        </Label>
        <Input
          id="memory-title"
          value={title}
          maxLength={120}
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Primeiro sorriso do Theo"
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="memory-date" className={labelClass}>
            Data do acontecimento *
          </Label>
          <Input
            id="memory-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Momento</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as MemoryCategory)}>
            <SelectTrigger
              className={cn(fieldClass, "w-full bg-background")}
              aria-label="Categoria da memória"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {memoryCategories.map((meta) => (
                <SelectItem key={meta.key} value={meta.key}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="memory-description" className={labelClass}>
          Descrição
        </Label>
        <Textarea
          id="memory-description"
          value={description}
          rows={3}
          maxLength={1000}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Como foi esse momento? Quem estava por perto?"
          className="min-h-[88px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
      </div>

      <div className="space-y-2">
        <Label className={labelClass}>Foto ou vídeo</Label>

        {hasExistingMedia && memory?.media_path ? (
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-muted/40">
            <MemoryMedia
              path={memory.media_path}
              alt={`Mídia de ${memory.title}`}
              className={cn(
                "w-full object-cover",
                memoryMediaKind(memory.media_path) === "video"
                  ? "max-h-56 bg-black"
                  : "h-40",
              )}
            />
            <div className="flex items-center gap-2 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {memoryMediaFileName(memory.media_path)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Mídia atual · toque para reproduzir o vídeo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRemoveMedia(true)}
                aria-label="Remover mídia"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : media && mediaPreview ? (
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-muted/40">
            {selectedKind === "video" ? (
              <video
                src={mediaPreview}
                className="max-h-56 w-full bg-black object-cover"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <img src={mediaPreview} alt="Prévia da mídia" className="h-40 w-full object-cover" />
            )}
            <div className="flex items-center gap-2 p-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                {selectedKind === "video" ? (
                  <Video className="h-3.5 w-3.5" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{media.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(media.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => setMedia(null)}
                aria-label="Descartar mídia"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
            className="flex w-full flex-col items-center gap-1 rounded-3xl border border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:bg-muted disabled:opacity-60"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="text-xs font-semibold text-foreground/80">
              {removeMedia && memory?.media_path ? "Escolher nova mídia" : "Adicionar foto ou vídeo"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              JPG, PNG, WEBP até 10 MB · MP4, MOV, WEBM até 50 MB
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={MEMORY_MEDIA_ACCEPT}
          onChange={(event) => handleFile(event.target.files)}
          className="sr-only"
          aria-label="Selecionar foto ou vídeo da memória"
        />

        <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <CalendarHeart className="h-3 w-3 shrink-0" />
          Opcional · a mídia fica no armazenamento privado da família e só abre por link assinado.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-2xl text-sm font-semibold shadow-soft sm:w-auto sm:px-6"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarHeart className="h-4 w-4" />
          )}
          {memory ? "Salvar memória" : "Guardar memória"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-11 w-full rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted sm:w-auto"
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
