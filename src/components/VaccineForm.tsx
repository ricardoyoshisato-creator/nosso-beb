import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { FileText, Loader2, Sparkles, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCEPTED_ATTACHMENT_ACCEPT,
  ACCEPTED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  formatFileSize,
} from "@/lib/attachments";
import { todayISO } from "@/lib/baby";
import { vaccineProofFileName } from "@/lib/vaccines";
import { cn } from "@/lib/utils";
import type { Vaccine } from "@/types/database";

export type VaccineFormValues = {
  name: string;
  dose: string;
  expectedDate: string;
  appliedDate: string;
  location: string;
  batch: string;
  professional: string;
  notes: string;
  proof: File | null;
  removeProof: boolean;
};

type VaccineFormProps = {
  vaccine?: Vaccine | null;
  submitting?: boolean;
  onSubmit: (values: VaccineFormValues) => void;
  onCancel?: () => void;
};

const labelClass = "text-xs font-semibold text-foreground/80";
const fieldClass =
  "h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40";

export function VaccineForm({ vaccine, submitting = false, onSubmit, onCancel }: VaccineFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(vaccine?.name ?? "");
  const [dose, setDose] = useState(vaccine?.dose ?? "");
  const [expectedDate, setExpectedDate] = useState(vaccine?.expected_date ?? "");
  const [appliedDate, setAppliedDate] = useState(vaccine?.applied_date ?? "");
  const [location, setLocation] = useState(vaccine?.location ?? "");
  const [batch, setBatch] = useState(vaccine?.batch ?? "");
  const [professional, setProfessional] = useState(vaccine?.professional ?? "");
  const [notes, setNotes] = useState(vaccine?.notes ?? "");
  const [proof, setProof] = useState<File | null>(null);
  const [removeProof, setRemoveProof] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
      setError("O comprovante precisa ser imagem (JPG, PNG, WEBP) ou PDF.");
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(`“${file.name}” passa de 10 MB.`);
      return;
    }

    setError(null);
    setRemoveProof(false);
    setProof(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Informe o nome da vacina.");
      return;
    }

    if (!expectedDate && !appliedDate) {
      setError("Informe a data prevista ou a data de aplicação.");
      return;
    }

    if (appliedDate && appliedDate > todayISO()) {
      setError("A data de aplicação não pode estar no futuro.");
      return;
    }

    setError(null);
    onSubmit({
      name: name.trim(),
      dose: dose.trim(),
      expectedDate,
      appliedDate,
      location,
      batch,
      professional,
      notes,
      proof,
      removeProof,
    });
  };

  const existingProof = Boolean(vaccine?.proof_path) && !removeProof && !proof;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1.7fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="vaccine-name" className={labelClass}>
            Vacina *
          </Label>
          <Input
            id="vaccine-name"
            required
            autoFocus
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Pentavalente"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vaccine-dose" className={labelClass}>
            Dose
          </Label>
          <Input
            id="vaccine-dose"
            maxLength={40}
            value={dose}
            onChange={(event) => setDose(event.target.value)}
            placeholder="Ex.: 1ª dose"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="vaccine-expected" className={labelClass}>
            Data prevista
          </Label>
          <Input
            id="vaccine-expected"
            type="date"
            value={expectedDate}
            onChange={(event) => setExpectedDate(event.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vaccine-applied" className={labelClass}>
            Data de aplicação
          </Label>
          <Input
            id="vaccine-applied"
            type="date"
            max={todayISO()}
            value={appliedDate}
            onChange={(event) => setAppliedDate(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <p className="rounded-2xl bg-muted/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        Com a data de aplicação a vacina fica <strong>verde</strong>. Se a data prevista passar sem
        aplicação, ela aparece em <strong>vermelho</strong> como atrasada.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="vaccine-location" className={labelClass}>
            Local
          </Label>
          <Input
            id="vaccine-location"
            maxLength={160}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Ex.: UBS Jardim das Flores"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vaccine-professional" className={labelClass}>
            Profissional
          </Label>
          <Input
            id="vaccine-professional"
            maxLength={120}
            value={professional}
            onChange={(event) => setProfessional(event.target.value)}
            placeholder="Ex.: Enf. Camila"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vaccine-batch" className={labelClass}>
          Lote
        </Label>
        <Input
          id="vaccine-batch"
          maxLength={60}
          value={batch}
          onChange={(event) => setBatch(event.target.value)}
          placeholder="Ex.: 21A34B"
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <Label className={labelClass}>Comprovante</Label>

        {existingProof && vaccine?.proof_path ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 p-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {vaccineProofFileName(vaccine.proof_path)}
              </p>
              <p className="text-[10px] text-muted-foreground">Comprovante atual</p>
            </div>
            <button
              type="button"
              onClick={() => setRemoveProof(true)}
              aria-label="Remover comprovante"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : proof ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 p-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{proof.name}</p>
              <p className="text-[10px] text-muted-foreground">{formatFileSize(proof.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => setProof(null)}
              aria-label="Descartar comprovante"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background px-4 py-3 text-xs font-semibold text-foreground/70 transition-colors hover:bg-muted disabled:opacity-60",
            )}
          >
            <Upload className="h-4 w-4 text-primary" />
            {removeProof && vaccine?.proof_path ? "Escolher novo comprovante" : "Anexar comprovante"}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_ATTACHMENT_ACCEPT}
          onChange={(event) => handleFile(event.target.files)}
          className="sr-only"
          aria-label="Selecionar comprovante da vacina"
        />

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Opcional · imagem ou PDF até 10 MB, guardado no armazenamento privado da família.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vaccine-notes" className={labelClass}>
          Observações
        </Label>
        <Textarea
          id="vaccine-notes"
          value={notes}
          rows={2}
          maxLength={1000}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ex.: reação leve no local, febril à noite."
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
          {vaccine ? "Salvar alterações" : "Registrar vacina"}
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
