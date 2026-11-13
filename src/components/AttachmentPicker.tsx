import { useRef } from "react";
import { Loader2, Paperclip, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ACCEPTED_ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  formatFileSize,
  validateAttachment,
} from "@/lib/attachments";

export type PickerAttachment = {
  id: string;
  file_name: string;
  size_bytes: number | null;
};

type AttachmentPickerProps<T extends PickerAttachment = PickerAttachment> = {
  existing?: T[];
  files: File[];
  onFilesChange: (files: File[]) => void;
  onRemoveExisting?: (attachment: T) => void;
  removingId?: string | null;
  onError?: (message: string | null) => void;
  disabled?: boolean;
  hint?: string;
};

export function AttachmentPicker<T extends PickerAttachment = PickerAttachment>({
  existing = [],
  files,
  onFilesChange,
  onRemoveExisting,
  removingId = null,
  onError,
  disabled = false,
  hint,
}: AttachmentPickerProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = MAX_ATTACHMENTS - existing.length - files.length;

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;

    const list = Array.from(incoming);
    const available = MAX_ATTACHMENTS - existing.length - files.length;

    if (available <= 0) {
      onError?.(`Cada registro aceita até ${MAX_ATTACHMENTS} anexos.`);
      return;
    }

    const accepted: File[] = [];
    let fileError: string | null = null;

    for (const file of list.slice(0, available)) {
      const validation = validateAttachment(file);
      if (validation) {
        fileError = validation;
        continue;
      }
      accepted.push(file);
    }

    if (list.length > available) {
      fileError = `Só cabem mais ${available} ${available === 1 ? "arquivo" : "arquivos"} aqui.`;
    }

    onError?.(fileError);
    if (accepted.length > 0) onFilesChange([...files, ...accepted]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2.5 rounded-3xl border border-border/70 bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">Anexos</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            PDF ou imagens até 10 MB ·{" "}
            {remaining > 0 ? `cabem mais ${remaining}` : `limite de ${MAX_ATTACHMENTS} atingido`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || remaining <= 0}
          onClick={() => inputRef.current?.click()}
          className="h-9 shrink-0 rounded-xl border-border bg-card px-3 text-xs font-semibold hover:bg-muted"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Anexar arquivo
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_ATTACHMENT_ACCEPT}
        onChange={(event) => handleFiles(event.target.files)}
        className="sr-only"
        aria-label="Selecionar anexos"
      />

      {(existing.length > 0 || files.length > 0) && (
        <ul className="space-y-2">
          {existing.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2">
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                {attachment.file_name}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatFileSize(attachment.size_bytes)}
              </span>
              {onRemoveExisting && (
                <button
                  type="button"
                  aria-label={`Remover ${attachment.file_name}`}
                  disabled={removingId === attachment.id}
                  onClick={() => onRemoveExisting(attachment)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  {removingId === attachment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </li>
          ))}

          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                {file.name}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                aria-label={`Descartar ${file.name}`}
                onClick={() => onFilesChange(files.filter((item) => item !== file))}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {hint ?? "Os arquivos ficam no armazenamento privado da família e só abrem com link temporário."}
      </p>
    </div>
  );
}
