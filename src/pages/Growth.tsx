import { useState } from "react";
import {
  Baby,
  Pencil,
  Plus,
  Ruler,
  Scale,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { BabyModuleGate } from "@/components/BabyModuleGate";
import { GrowthChart } from "@/components/GrowthChart";
import { GrowthForm } from "@/components/GrowthForm";
import type { GrowthFormValues } from "@/components/GrowthForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import { formatCentimeters, formatKilograms } from "@/lib/baby";
import { formatNumericDate } from "@/lib/family";
import {
  formatGrowthValue,
  growthDelta,
  growthMetricMeta,
  growthMetricMetaOf,
  sortGrowthRecords,
} from "@/lib/growth";
import type { GrowthMetric } from "@/lib/growth";
import { cn } from "@/lib/utils";
import type { GrowthRecord } from "@/types/database";

const metricChip: Record<GrowthMetric, string> = {
  weight: "bg-primary/15 text-[hsl(13,62%,38%)]",
  height: "bg-mint/70 text-mint-foreground",
  head: "bg-lavender/70 text-lavender-foreground",
};

const metricIcon: Record<GrowthMetric, LucideIcon> = {
  weight: Scale,
  height: Ruler,
  head: Baby,
};

const Growth = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { growthRecords, babyProfile, can, saveGrowthRecord, deleteGrowthRecord } = useFamily();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GrowthRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [recordToRemove, setRecordToRemove] = useState<GrowthRecord | null>(null);
  const [removing, setRemoving] = useState(false);

  const canCreate = can("records.create");
  const canEditRecords = can("records.edit");
  const canDeleteAny = can("records.delete");

  const chronological = sortGrowthRecords(growthRecords);
  const latestDescending = [...chronological].reverse();

  /** Última medição preenchida de cada métrica (as medidas podem vir em registros diferentes). */
  const latestValue = (metric: GrowthMetric) => {
    const field = growthMetricMetaOf(metric).field;
    const record = latestDescending.find((entry) => entry[field] !== null);
    return record ? record[field] : null;
  };

  const birthMeasures = [
    babyProfile?.birth_weight !== null && babyProfile?.birth_weight !== undefined
      ? `peso ${formatKilograms(babyProfile.birth_weight)}`
      : null,
    babyProfile?.birth_height !== null && babyProfile?.birth_height !== undefined
      ? `altura ${formatCentimeters(babyProfile.birth_height)}`
      : null,
    babyProfile?.head_circumference !== null && babyProfile?.head_circumference !== undefined
      ? `perímetro ${formatCentimeters(babyProfile.head_circumference)}`
      : null,
  ].filter(Boolean) as string[];

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (record: GrowthRecord) => {
    setEditing(record);
    setFormOpen(true);
  };

  const handleSave = async (values: GrowthFormValues) => {
    setSaving(true);
    const { error } = await saveGrowthRecord(
      {
        measurementDate: values.measurementDate,
        weight: values.weight,
        height: values.height,
        headCircumference: values.headCircumference,
      },
      editing?.id,
    );
    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    setFormOpen(false);
    setEditing(null);
    toast({
      title: editing ? "Medição atualizada" : "Medição registrada",
      description: "O gráfico e o histórico da família já foram atualizados.",
    });
  };

  const handleDelete = async () => {
    if (!recordToRemove) return;

    setRemoving(true);
    const { error } = await deleteGrowthRecord(recordToRemove.id);
    setRemoving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: error });
      return;
    }

    setRecordToRemove(null);
    toast({ title: "Medição removida", description: "O histórico do crescimento foi atualizado." });
  };

  return (
    <BabyModuleGate
      label="Crescimento"
      title="Crescimento do bebê"
      description="Peso, altura e perímetro cefálico acompanhados a cada medição."
      icon={TrendingUp}
    >
      <div className="space-y-4">
        {/* Últimas medidas */}
        <div className="grid grid-cols-3 gap-2.5">
          {growthMetricMeta.map((meta, index) => {
            const Icon = metricIcon[meta.key];
            const value = latestValue(meta.key);
            const delta = growthDelta(growthRecords, meta.key);

            return (
              <div
                key={meta.key}
                className="animate-rise rounded-3xl border border-border/70 bg-card p-3 shadow-soft sm:p-4"
                style={{ animationDelay: `${60 + index * 50}ms` }}
              >
                <span className={cn("grid h-9 w-9 place-items-center rounded-xl", metricChip[meta.key])}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-2 font-display text-[17px] font-semibold leading-tight text-foreground">
                  {value === null
                    ? "—"
                    : `${Number(value).toLocaleString("pt-BR", {
                        maximumFractionDigits: 2,
                      })} ${meta.unit}`}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {meta.shortLabel}
                </p>
                {delta !== null && (
                  <p className="mt-1 text-[10.5px] font-semibold text-[hsl(164,34%,30%)]">
                    {delta > 0 ? "+" : ""}
                    {formatGrowthValue(meta.key, delta)} desde a 1ª
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Gráfico */}
        <section className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Curva de crescimento
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {growthRecords.length === 0
                  ? "Nenhuma medição registrada ainda."
                  : `${growthRecords.length} ${growthRecords.length === 1 ? "medição" : "medições"} · peso em kg e medidas em cm.`}
              </p>
            </div>

            {canCreate && (
              <Button
                onClick={openNew}
                className="h-10 shrink-0 rounded-2xl px-3.5 text-xs font-semibold shadow-soft"
              >
                <Plus className="h-4 w-4" />
                Medição
              </Button>
            )}
          </div>

          {growthRecords.length > 0 ? (
            <div className="mt-3">
              <GrowthChart records={growthRecords} />
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center rounded-3xl bg-muted/60 px-4 py-8 text-center">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                A primeira medição pode vir da consulta de rotina. Registre o peso e a altura para
                começar a acompanhar a evolução.
              </p>

              {birthMeasures.length > 0 && (
                <p className="mt-3 rounded-2xl bg-card px-3.5 py-2 text-[11px] leading-relaxed text-foreground/80">
                  No nascimento: {birthMeasures.join(" · ")}
                </p>
              )}

              {canCreate && (
                <Button
                  onClick={openNew}
                  variant="outline"
                  className="mt-3 h-10 rounded-2xl border-border bg-background text-xs font-semibold hover:bg-card"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Registrar primeira medição
                </Button>
              )}
            </div>
          )}
        </section>

        {!canCreate && (
          <p className="rounded-2xl bg-secondary/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-secondary-foreground/85">
            Seu papel permite acompanhar as medidas. Peça a um cuidador ou administrador para
            registrar novas medições.
          </p>
        )}

        {/* Histórico */}
        {latestDescending.length > 0 && (
          <section className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Histórico de medições
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Da mais recente para a mais antiga.
                </p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lavender/60 text-lavender-foreground">
                <Sparkles className="h-[18px] w-[18px]" />
              </span>
            </div>

            <ul className="mt-3 divide-y divide-border">
              {latestDescending.map((record) => {
                const canRemove = canDeleteAny || record.created_by === user?.id;

                return (
                  <li key={record.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {formatNumericDate(record.measurement_date)}
                      </p>

                      <div className="flex items-center gap-1.5">
                        {canEditRecords && (
                          <button
                            type="button"
                            onClick={() => openEdit(record)}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </button>
                        )}
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => setRecordToRemove(record)}
                            aria-label={`Remover medição de ${formatNumericDate(record.measurement_date)}`}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remover
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {growthMetricMeta.map((meta) => {
                        const value = record[meta.field];
                        if (value === null) return null;

                        return (
                          <span
                            key={meta.key}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              metricChip[meta.key],
                            )}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: meta.color }}
                            />
                            {meta.shortLabel} {formatGrowthValue(meta.key, Number(value))}
                          </span>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing ? "Editar medição" : "Nova medição"}
            </DialogTitle>
            <DialogDescription>
              Preencha o que foi medido — peso, altura, perímetro ou as três medidas.
            </DialogDescription>
          </DialogHeader>

          <GrowthForm
            record={editing}
            submitting={saving}
            onSubmit={handleSave}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(recordToRemove)}
        onOpenChange={(open) => !open && setRecordToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Remover a medição de {formatNumericDate(recordToRemove?.measurement_date)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ela sai do gráfico e do histórico de toda a família. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter medição</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              onClick={handleDelete}
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BabyModuleGate>
  );
};

export default Growth;
