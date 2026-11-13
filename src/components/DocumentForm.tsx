import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { FileImage, FileText, Loader2, Sparkles, Trash2, Upload } from "lucide-react";

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
import {
  ACCEPTED_ATTACHMENT_ACCEPT,
  formatFileSize,
  validateAttachment,
} from "@/lib/attachments";
import { todayISO } from "@/lib/baby";
import {
  documentCategoryMeta,
  documentFileName,
  documentFileKind,
} from "@/lib/documents";
import { cn } from "@/lib/utils";
import type { DocumentCategory, DocumentRecord } from "@/types/database";

export type DocumentFormValues = {
  name: string;
  category: DocumentCategory;
  date: string;
  description: string;
  file: File | null;
};

type DocumentFormProps = {
  document?: DocumentRecord | null;
  submitting?: boolean;
  onSubmit: (values: DocumentFormValues) => void;
  onCancel?: () => void;
};

const labelClass = "text-xs font-semibold text-foreground/80";
const fieldClass =
  "h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40";

/** Nome do documento a partir do arquivo, sem extensão. */
function nameFromFile(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 120);
}

export function DocumentForm({
  document,
  submitting = false,
  onSubmit,
  onCancel,
}: DocumentFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(document?.name ?? "");
  const [category, setCategory] = useState<DocumentCategory>(document?.category ?? "outros");
  const [date, setDate] = useState(document?.date ?? todayISO());
  const [description, setDescription] = useState(document?.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (fileList: FileList | null) => {
    const selected = fileList?.[0];
    if (!selected) return;

    const validation = validateAttachment(selected);
    if (validation) {
      setError(validation);
      return;
    }

    setError(null);
    setFile(selected);
    // No cadastro o nome do arquivo vira o nome do documento (se ainda estiver vazio).
    if (!document && !name.trim()) setName(nameFromFile(selected.name));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!file && !document) {
      setError("Selecione o arquivo do documento (PDF ou imagem).");
      return;
    }

    if (!name.trim()) {
      setError("Informe o nome do documento.");
      return;
    }

    if (!date) {
      setError("Informe a data do documento.");
      return;
    }

    setError(null);
    onSubmit({
      name: name.trim(),
      category,
      date,
      description: description.trim(),
      file,
    });
  };

  const shownFile = file ?? null;
  const currentFileName = document?.file_path ? documentFileName(document.file_path) : null;
  const CurrentFileIcon = documentFileKind(document?.file_path) === "image" ? FileImage : FileText;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className={labelClass}>
          Arquivo <span className="font-normal text-muted-foreground">(PDF ou imagem)</span>
        </Label>

        {shownFile ? (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/8 p-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{shownFile.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatFileSize(shownFile.size)} · será enviado ao salvar
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label="Descartar arquivo selecionado"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : currentFileName ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 p-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-primary">
              <CurrentFileIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{currentFileName}</p>
              <p className="text-[10px] text-muted-foreground">Arquivo atual</p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              Trocar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
            className="flex w-full flex-col items-center gap-1.5 rounded-3xl border border-dashed border-border bg-background px-4 py-5 text-center transition-colors hover:bg-muted disabled:opacity-60"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/12 text-primary">
              <Upload className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-foreground">Escolher arquivo</span>
            <span className="text-[10px] text-muted-foreground">
              PDF, JPG, PNG ou WEBP até 10 MB
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_ATTACHMENT_ACCEPT}
          onChange={(event) => handleFile(event.target.files)}
          className="sr-only"
          aria-label="Selecionar arquivo do documento"
        />

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          O arquivo fica no armazenamento privado da família e só é aberto por uma URL assinada
          temporária.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="document-name" className={labelClass}>
          Nome do documento *
        </Label>
        <Input
          id="document-name"
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Carteirinha de vacinas"
          className={fieldClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="document-category" className={labelClass}>
            Categoria *
          </Label>
          <Select
            value={category}
            onValueChange={(value) => setCategory(value as DocumentCategory)}
          >
            <SelectTrigger id="document-category" className={cn(fieldClass, "w-full")}>
              <SelectValue placeholder="Escolha a categoria" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {documentCategoryMeta.map((meta) => (
                <SelectItem key={meta.key} value={meta.key}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="document-date" className={labelClass}>
            Data do documento *
          </Label>
          <Input
            id="document-date"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="document-description" className={labelClass}>
          Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="document-description"
          value={description}
          rows={2}
          maxLength={1000}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex.: carteira emitida na maternidade, com as primeiras doses."
          className="min-h-[72px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
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
            <Sparkles className="h-4 w-4" />
          )}
          {document ? "Salvar alterações" : "Enviar documento"}
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
