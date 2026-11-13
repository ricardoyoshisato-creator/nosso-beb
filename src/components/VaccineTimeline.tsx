import { useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  Check,
  FileText,
  Pencil,
  Plus,
  Syringe,
  Trash2,
} from "lucide-react";

import { StorageImage } from "@/components/StorageImage";
import { VaccineForm } from "@/components/VaccineForm";
import type { VaccineFormValues } from "@/components/VaccineForm";
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
import { Badge } from "@/components/ui/badge";
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
import { VACCINE_BUCKET, downloadStoredFile } from "@/lib/attachments";
import { formatNumericDate } from "@/lib/family";
import {
  nextVaccine,
  sortVaccines,
  vaccineDaysLate,
  vaccineProofFileName,
  vaccineProofIsImage,
  vaccineStatus,
  vaccineStatusMeta,
  vaccineSummary,
} from "@/lib/vaccines";
import { cn } from "@/lib/utils";
import type { Vaccine } from "@/types/database";

/** Linha do tempo das vacinas + formulário com comprovante. */
export function VaccineTimeline() {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    vaccines,
    can,
    saveVaccine,
    uploadVaccineProof,
    removeVaccineProof,
    deleteVaccine,
  } = useFamily();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vaccine | null>(null);
  const [saving, setSaving] = useState(false);
  const [vaccineToRemove, setVaccineToRemove] = useState<Vaccine | null>(null);
  const [removing, setRemoving] = useState(false);

  const canCreate = can("records.create");
  const canEditRecords = can("records.edit");
  const canDeleteAny = can("records.delete");

  const timeline = sortVaccines(vaccines);
  const summary = vaccineSummary(vaccines);
  const upcoming = nextVaccine(vaccines);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (vaccine: Vaccine) => {
    setEditing(vaccine);
    setFormOpen(true);
  };

  const handleSave = async (values: VaccineFormValues) => {
    setSaving(true);
    const previousProof = editing?.proof_path ?? null;

    const { error, id } = await saveVaccine(
      {
        name: values.name,
        dose: values.dose,
        expectedDate: values.expectedDate,
        appliedDate: values.appliedDate,
        location: values.location,
        batch: values.batch,
        professional: values.professional,
        notes: values.notes,
      },
      editing?.id,
    );

    if (error) {
      setSaving(false);
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    if (id && values.proof) {
      const { error: uploadError } = await uploadVaccineProof(id, values.proof, previousProof);
      if (uploadError) {
        setSaving(false);
        setFormOpen(false);
        toast({
          variant: "destructive",
          title: "Vacina salva, mas o comprovante não subiu",
          description: uploadError,
        });
        return;
      }
    } else if (editing && values.removeProof) {
      const { error: proofError } = await removeVaccineProof(editing);
      if (proofError) {
        setSaving(false);
        toast({
          variant: "destructive",
          title: "Não foi possível remover o comprovante",
          description: proofError,
        });
        return;
      }
    }

    setSaving(false);
    setFormOpen(false);
    setEditing(null);
    toast({
      title: editing ? "Vacina atualizada" : "Vacina registrada",
      description: "A linha do tempo da família já foi atualizada.",
    });
  };

  const handleDelete = async () => {
    if (!vaccineToRemove) return;

    setRemoving(true);
    const { error } = await deleteVaccine(vaccineToRemove.id);
    setRemoving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: error });
      return;
    }

    setVaccineToRemove(null);
    toast({ title: "Vacina removida", description: "O calendário da família foi atualizado." });
  };

  const openProof = async (vaccine: Vaccine) => {
    if (!vaccine.proof_path) return;

    const { error } = await downloadStoredFile(
      VACCINE_BUCKET,
      vaccine.proof_path,
      vaccineProofFileName(vaccine.proof_path) || "comprovante",
    );

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível abrir", description: error });
    }
  };

  const counters = [
    {
      label: "Aplicadas",
      value: summary.applied,
      icon: CalendarCheck,
      chip: "bg-mint/70 text-[hsl(164,34%,22%)]",
    },
    {
      label: "Atrasadas",
      value: summary.late,
      icon: AlertTriangle,
      chip: "bg-destructive/15 text-destructive",
    },
    {
      label: "Previstas",
      value: summary.upcoming,
      icon: CalendarClock,
      chip: "bg-lavender/70 text-lavender-foreground",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Indicadores */}
      <div className="grid grid-cols-3 gap-2.5">
        {counters.map((counter, index) => (
          <div
            key={counter.label}
            className="animate-rise flex items-center gap-2.5 rounded-3xl border border-border/70 bg-card p-3 shadow-soft sm:p-4"
            style={{ animationDelay: `${60 + index * 50}ms` }}
          >
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", counter.chip)}>
              <counter.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold leading-none text-foreground">
                {counter.value}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {counter.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {upcoming && (
        <div className="animate-rise flex items-center gap-3 rounded-3xl border border-lavender/70 bg-lavender/40 p-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-card/70 text-lavender-foreground">
            <Syringe className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lavender-foreground/80">
              Próxima vacina
            </p>
            <p className="truncate text-sm font-semibold text-lavender-foreground">
              {upcoming.name}
              {upcoming.dose ? ` · ${upcoming.dose}` : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-card/70 px-2.5 py-1 text-[11px] font-semibold text-lavender-foreground">
            {formatNumericDate(upcoming.expected_date)}
          </span>
        </div>
      )}

      {/* Linha do tempo */}
      <section className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Linha do tempo das vacinas
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {timeline.length === 0
                ? "Nenhuma vacina registrada ainda."
                : `${timeline.length} ${timeline.length === 1 ? "vacina registrada" : "vacinas registradas"} · mais antigas primeiro.`}
            </p>
          </div>

          {canCreate && (
            <Button
              onClick={openNew}
              className="h-10 shrink-0 rounded-2xl px-3.5 text-xs font-semibold shadow-soft"
            >
              <Plus className="h-4 w-4" />
              Vacina
            </Button>
          )}
        </div>

        {!canCreate && (
          <p className="mt-3 rounded-2xl bg-secondary/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-secondary-foreground/85">
            Seu papel permite apenas acompanhar o calendário. Peça a um cuidador ou administrador
            para registrar vacinas.
          </p>
        )}

        {timeline.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-3xl bg-muted/60 px-4 py-8 text-center">
            <Syringe className="h-5 w-5 text-primary" />
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Cadastre a primeira vacina para acompanhar as doses aplicadas e as que estão por vir.
            </p>
            {canCreate && (
              <Button
                onClick={openNew}
                variant="outline"
                className="mt-3 h-10 rounded-2xl border-border bg-background text-xs font-semibold hover:bg-card"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar vacina
              </Button>
            )}
          </div>
        ) : (
          <ol className="mt-4">
            {timeline.map((vaccine, index) => {
              const status = vaccineStatus(vaccine);
              const meta = vaccineStatusMeta[status];
              const lateDays = vaccineDaysLate(vaccine);
              const canRemove = canDeleteAny || vaccine.created_by === user?.id;
              const isImageProof = vaccineProofIsImage(vaccine.proof_path);

              return (
                <li key={vaccine.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < timeline.length - 1 && (
                    <span
                      className="absolute left-[13px] top-7 h-full w-px bg-border"
                      aria-hidden="true"
                    />
                  )}

                  <span
                    className={cn(
                      "relative z-10 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full",
                      meta.dot,
                    )}
                    aria-hidden="true"
                  >
                    {status === "applied" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : status === "late" ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <CalendarClock className="h-3.5 w-3.5" />
                    )}
                  </span>

                  <div
                    className={cn(
                      "min-w-0 flex-1 rounded-3xl border p-3.5",
                      meta.card,
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold leading-tight text-foreground">
                        {vaccine.name}
                      </p>
                      {vaccine.dose && (
                        <Badge className="rounded-full border-transparent bg-card/80 px-2 py-0 text-[10px] font-semibold text-foreground/70">
                          {vaccine.dose}
                        </Badge>
                      )}
                      <Badge
                        className={cn(
                          "ml-auto rounded-full border-transparent px-2 py-0 text-[10px] font-semibold",
                          meta.badge,
                        )}
                      >
                        {meta.label}
                      </Badge>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
                      {vaccine.applied_date && (
                        <span className="text-foreground/80">
                          Aplicada em {formatNumericDate(vaccine.applied_date)}
                        </span>
                      )}
                      {vaccine.expected_date && (
                        <span>Prevista para {formatNumericDate(vaccine.expected_date)}</span>
                      )}
                      {lateDays > 0 && (
                        <span className="font-semibold text-destructive">
                          atrasada há {lateDays} {lateDays === 1 ? "dia" : "dias"}
                        </span>
                      )}
                    </div>

                    {(vaccine.location || vaccine.batch || vaccine.professional) && (
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {[vaccine.location, vaccine.batch ? `lote ${vaccine.batch}` : null, vaccine.professional]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}

                    {vaccine.notes && (
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {vaccine.notes}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {vaccine.proof_path && (
                        <button
                          type="button"
                          onClick={() => void openProof(vaccine)}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-card/80 py-1 pl-1 pr-2.5 text-[11px] font-semibold text-foreground/80 transition-colors hover:bg-card"
                        >
                          {isImageProof ? (
                            <StorageImage
                              bucket={VACCINE_BUCKET}
                              path={vaccine.proof_path}
                              alt="Comprovante da vacina"
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-primary">
                              <FileText className="h-3 w-3" />
                            </span>
                          )}
                          <span className="truncate">Comprovante</span>
                        </button>
                      )}

                      {canEditRecords && (
                        <button
                          type="button"
                          onClick={() => openEdit(vaccine)}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>
                      )}

                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => setVaccineToRemove(vaccine)}
                          aria-label={`Remover ${vaccine.name}`}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

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
              {editing ? "Editar vacina" : "Registrar vacina"}
            </DialogTitle>
            <DialogDescription>
              Guarde a data prevista para acompanhar os prazos e a data de aplicação quando a dose
              chegar.
            </DialogDescription>
          </DialogHeader>

          <VaccineForm
            vaccine={editing}
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
        open={Boolean(vaccineToRemove)}
        onOpenChange={(open) => !open && setVaccineToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Remover “{vaccineToRemove?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O registro e o comprovante saem do calendário de toda a família. Essa ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter vacina</AlertDialogCancel>
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
    </div>
  );
}
