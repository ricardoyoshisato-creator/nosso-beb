import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Camera, ImagePlus, Lock, Loader2, Sparkles, Trash2 } from "lucide-react";

import { InitialsAvatar } from "@/components/InitialsAvatar";
import { StorageImage } from "@/components/StorageImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BABY_BUCKET, MAX_ATTACHMENT_BYTES, formatFileSize } from "@/lib/attachments";
import {
  birthHeightRange,
  birthWeightRange,
  headCircumferenceRange,
  parseMeasure,
  toMeasureInput,
  todayISO,
} from "@/lib/baby";
import type { BabyProfile } from "@/types/database";

export type BabyProfileFormValues = {
  name: string;
  birthDate: string | null;
  birthTime: string | null;
  birthWeight: number | null;
  birthHeight: number | null;
  headCircumference: number | null;
  maternityHospital: string;
  pediatrician: string;
  importantInfo: string;
  avatarFile: File | null;
  removeAvatar: boolean;
};

type BabyProfileFormProps = {
  profile?: BabyProfile | null;
  /** Valores iniciais quando o perfil ainda não existe (ex.: nome já salvo na família). */
  defaults?: { name?: string; birthDate?: string };
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: BabyProfileFormValues) => void;
  onCancel?: () => void;
};

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

export function BabyProfileForm({
  profile,
  defaults,
  submitLabel,
  submitting = false,
  onSubmit,
  onCancel,
}: BabyProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name ?? defaults?.name ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? defaults?.birthDate ?? "");
  const [birthTime, setBirthTime] = useState(profile?.birth_time?.slice(0, 5) ?? "");
  const [birthWeight, setBirthWeight] = useState(toMeasureInput(profile?.birth_weight));
  const [birthHeight, setBirthHeight] = useState(toMeasureInput(profile?.birth_height));
  const [headCircumference, setHeadCircumference] = useState(
    toMeasureInput(profile?.head_circumference),
  );
  const [maternityHospital, setMaternityHospital] = useState(profile?.maternity_hospital ?? "");
  const [pediatrician, setPediatrician] = useState(profile?.pediatrician ?? "");
  const [importantInfo, setImportantInfo] = useState(profile?.important_info ?? "");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prévia da foto escolhida nesta edição (liberada ao trocar de arquivo).
  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(avatarFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      setError("Escolha uma foto em JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(`A foto tem ${formatFileSize(file.size)} — o limite é 10 MB.`);
      return;
    }

    setError(null);
    setAvatarFile(file);
    setRemoveAvatar(false);
  };

  const checkMeasure = (
    raw: string,
    range: { min: number; max: number },
    label: string,
    unit: string,
  ) => {
    const value = parseMeasure(raw);
    if (!raw.trim()) return { value: null, error: null };
    if (value === null) {
      return { value: null, error: `${label}: use apenas números (ex.: 3,25).` };
    }
    if (value < range.min || value > range.max) {
      return {
        value: null,
        error: `${label} deve ficar entre ${toMeasureInput(range.min)} e ${toMeasureInput(range.max)} ${unit}.`,
      };
    }
    return { value, error: null };
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Escreva o nome do bebê.");
      return;
    }

    if (birthDate && birthDate > todayISO()) {
      setError("A data de nascimento não pode estar no futuro.");
      return;
    }

    const weight = checkMeasure(birthWeight, birthWeightRange, "Peso ao nascer", "kg");
    const height = checkMeasure(birthHeight, birthHeightRange, "Comprimento ao nascer", "cm");
    const head = checkMeasure(headCircumference, headCircumferenceRange, "Perímetro cefálico", "cm");
    const measureError = weight.error ?? height.error ?? head.error;

    if (measureError) {
      setError(measureError);
      return;
    }

    setError(null);
    onSubmit({
      name: name.trim(),
      birthDate: birthDate || null,
      birthTime: birthTime || null,
      birthWeight: weight.value,
      birthHeight: height.value,
      headCircumference: head.value,
      maternityHospital,
      pediatrician,
      importantInfo,
      avatarFile,
      removeAvatar,
    });
  };

  const currentAvatar = profile?.avatar_url && !removeAvatar ? profile.avatar_url : null;
  const previewName = name.trim() || profile?.name || "Bebê";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Foto de perfil */}
      <div className="flex items-center gap-4 rounded-3xl border border-border/70 bg-muted/50 p-3.5">
        <div className="relative shrink-0">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Prévia da foto do bebê"
              className="h-20 w-20 rounded-full object-cover ring-2 ring-card"
            />
          ) : currentAvatar ? (
            <StorageImage
              bucket={BABY_BUCKET}
              path={currentAvatar}
              alt={`Foto de ${previewName}`}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-card"
            />
          ) : (
            <InitialsAvatar name={previewName} tone="primary" size="xl" ring />
          )}
          <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-card text-primary shadow-soft">
            <Camera className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">Foto do bebê</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            JPG, PNG ou WEBP até 10 MB. Só a família vê.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 rounded-2xl border-border bg-background px-3 text-xs font-semibold hover:bg-card"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {previewUrl || currentAvatar ? "Trocar foto" : "Escolher foto"}
            </Button>
            {(previewUrl || currentAvatar) && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null);
                  setRemoveAvatar(true);
                }}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Remover
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            onChange={handleFile}
            className="sr-only"
            aria-label="Escolher foto do bebê"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="baby-name" className="text-xs font-semibold text-foreground/80">
          Nome do bebê
        </Label>
        <Input
          id="baby-name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Como o bebê se chama?"
          className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="baby-birth-date" className="text-xs font-semibold text-foreground/80">
            Data de nascimento
          </Label>
          <Input
            id="baby-birth-date"
            type="date"
            max={todayISO()}
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="baby-birth-time" className="text-xs font-semibold text-foreground/80">
            Horário <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="baby-birth-time"
            type="time"
            value={birthTime}
            onChange={(event) => setBirthTime(event.target.value)}
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="baby-weight" className="text-xs font-semibold text-foreground/80">
            Peso (kg)
          </Label>
          <Input
            id="baby-weight"
            inputMode="decimal"
            value={birthWeight}
            onChange={(event) => setBirthWeight(event.target.value)}
            placeholder="3,25"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="baby-height" className="text-xs font-semibold text-foreground/80">
            Comprimento (cm)
          </Label>
          <Input
            id="baby-height"
            inputMode="decimal"
            value={birthHeight}
            onChange={(event) => setBirthHeight(event.target.value)}
            placeholder="49,5"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="baby-head" className="text-xs font-semibold text-foreground/80">
            Perímetro cefálico (cm)
          </Label>
          <Input
            id="baby-head"
            inputMode="decimal"
            value={headCircumference}
            onChange={(event) => setHeadCircumference(event.target.value)}
            placeholder="34,5"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="baby-hospital" className="text-xs font-semibold text-foreground/80">
            Maternidade / hospital
          </Label>
          <Input
            id="baby-hospital"
            value={maternityHospital}
            onChange={(event) => setMaternityHospital(event.target.value)}
            placeholder="Onde o bebê nasceu"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="baby-pediatrician" className="text-xs font-semibold text-foreground/80">
            Pediatra
          </Label>
          <Input
            id="baby-pediatrician"
            value={pediatrician}
            onChange={(event) => setPediatrician(event.target.value)}
            placeholder="Nome do pediatra"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="baby-important" className="text-xs font-semibold text-foreground/80">
          Informações importantes <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="baby-important"
          value={importantInfo}
          onChange={(event) => setImportantInfo(event.target.value)}
          rows={3}
          placeholder="Alergias, tipo sanguíneo, cuidados especiais, contato de emergência…"
          className="min-h-[84px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
      </div>

      {!birthDate && (
        <p className="flex items-start gap-2 rounded-2xl bg-sun/50 px-4 py-3 text-[11px] font-medium leading-relaxed text-sun-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Sem a data de nascimento, Rotina, Vacinas e Crescimento continuam bloqueados.
        </p>
      )}

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
          {submitLabel}
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
