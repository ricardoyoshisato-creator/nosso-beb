import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Pill,
  Plus,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { DoseChecklist } from "@/components/DoseChecklist";
import { MedicationCard } from "@/components/MedicationCard";
import { MedicationForm } from "@/components/MedicationForm";
import type { MedicationFormValues } from "@/components/MedicationForm";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import type { MedicationWithAttachments } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import { PRESCRIPTION_BUCKET, downloadStoredFile } from "@/lib/attachments";
import { formatCents } from "@/lib/expenses";
import {
  adherenceStats,
  buildDayChecklist,
  dayLabel,
  doseStatusMeta,
  groupDosesByDate,
  medicationIsCurrent,
  shiftedDay,
  todayString,
} from "@/lib/medications";
import type { DoseSlot } from "@/lib/medications";
import type { DoseStatus, MedicationAttachment } from "@/types/database";
import { cn } from "@/lib/utils";

type MarkableStatus = Exclude<DoseStatus, "pending">;

const markLabels: Record<MarkableStatus, string> = {
  taken: "Dose marcada como tomada",
  late: "Dose marcada como atrasada",
  missed: "Dose marcada como não tomada",
};

const Medications = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const {
    family,
    loading,
    medications,
    doses,
    members,
    can,
    saveMedication,
    deleteMedication,
    uploadMedicationFiles,
    removeMedicationAttachment,
    markDose,
  } = useFamily();

  const today = todayString();

  const [selectedDate, setSelectedDate] = useState(today);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationWithAttachments | null>(null);
  const [saving, setSaving] = useState(false);
  const [markingKey, setMarkingKey] = useState<string | null>(null);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<string | null>(null);
  const [medicationToRemove, setMedicationToRemove] = useState<MedicationWithAttachments | null>(
    null,
  );
  const [showAllHistory, setShowAllHistory] = useState(false);

  const canCreate = can("records.create");
  const canEditAny = can("records.edit");
  const canDeleteAny = can("records.delete");

  const editingLive = editing ? medications.find((item) => item.id === editing.id) ?? editing : null;

  const nameByUser = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      map.set(
        member.user_id,
        member.profile?.full_name?.trim() || member.profile?.email || "Um membro da família",
      );
    }
    return map;
  }, [members]);

  const nameFor = (userId: string | null) => {
    if (!userId) return "alguém da família";
    if (userId === user?.id) return "você";
    return nameByUser.get(userId) ?? "um membro da família";
  };

  const daySlots = useMemo(
    () => buildDayChecklist(medications, doses, selectedDate),
    [medications, doses, selectedDate],
  );
  const todaySlots = useMemo(() => buildDayChecklist(medications, doses, today), [medications, doses, today]);

  const dayTaken = daySlots.filter((slot) => slot.status === "taken").length;
  const dayDone = daySlots.filter((slot) => slot.recorded).length;
  const todayTaken = todaySlots.filter((slot) => slot.status === "taken").length;
  const weekStats = useMemo(() => adherenceStats(medications, doses, 7), [medications, doses]);
  const currentMedications = medications.filter((medication) => medicationIsCurrent(medication));

  const recordedDoses = doses.filter((dose) => dose.status !== "pending");
  const historyGroups = groupDosesByDate(recordedDoses);
  const visibleGroups = showAllHistory ? historyGroups : historyGroups.slice(0, 5);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Organizando as doses da família…</p>
      </div>
    );
  }

  if (!family) {
    return <CreateFamilyCard />;
  }

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (medication: MedicationWithAttachments) => {
    setEditing(medication);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: MedicationFormValues) => {
    setSaving(true);
    const { error, id } = await saveMedication(values, editing?.id);

    if (error) {
      setSaving(false);
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    let uploadError: string | null = null;
    if (id && values.files.length > 0) {
      const upload = await uploadMedicationFiles(id, values.files);
      uploadError = upload.error;
    }

    setSaving(false);
    setDialogOpen(false);

    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Cadastro salvo, mas a receita não subiu",
        description: uploadError,
      });
      setEditing(null);
      return;
    }

    toast({
      title: editing ? "Cadastro atualizado" : "Medicamento adicionado",
      description: values.costCents
        ? `${formatCents(values.costCents)} já estão no Financeiro como Saúde.`
        : "O checklist diário já considera os horários informados.",
    });
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!medicationToRemove) return;
    const { error } = await deleteMedication(medicationToRemove.id);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível excluir", description: error });
      return;
    }

    setMedicationToRemove(null);
    toast({
      title: "Cadastro excluído",
      description: "A receita e o histórico de doses também foram removidos.",
    });
  };

  const handleMark = async (slot: DoseSlot, status: MarkableStatus) => {
    setMarkingKey(slot.key);
    const { error } = await markDose({
      medicationId: slot.medication.id,
      date: slot.date,
      time: slot.time,
      status,
    });
    setMarkingKey(null);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível registrar", description: error });
      return;
    }

    toast({
      title: markLabels[status],
      description: `${slot.medication.name} · ${slot.time} · confirmado por ${
        profile?.full_name?.trim() || user?.email || "você"
      }`,
    });
  };

  const handleRemoveAttachment = async (attachment: MedicationAttachment) => {
    setRemovingAttachmentId(attachment.id);
    const { error } = await removeMedicationAttachment(attachment);
    setRemovingAttachmentId(null);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: error });
      return;
    }

    toast({ title: "Anexo removido", description: attachment.file_name });
  };

  const handleDownload = async (attachment: MedicationAttachment) => {
    const { error } = await downloadStoredFile(
      PRESCRIPTION_BUCKET,
      attachment.storage_path,
      attachment.file_name,
    );
    if (error) {
      toast({ variant: "destructive", title: "Não foi possível abrir a receita", description: error });
    }
  };

  const stats = [
    {
      label: "Doses hoje",
      value: `${todayTaken}/${todaySlots.length}`,
      hint: "registradas como tomadas",
      icon: ClipboardList,
      chip: "bg-lavender/70 text-lavender-foreground",
    },
    {
      label: "Adesão em 7 dias",
      value: `${weekStats.rate}%`,
      hint: `${weekStats.taken} de ${weekStats.scheduled} doses`,
      icon: TrendingUp,
      chip: "bg-mint/70 text-mint-foreground",
    },
    {
      label: "Em uso",
      value: `${currentMedications.length}`,
      hint: "medicamentos e vitaminas",
      icon: Pill,
      chip: "bg-sun/80 text-sun-foreground",
    },
  ];

  const dayRate = daySlots.length > 0 ? Math.round((dayTaken / daySlots.length) * 100) : 0;

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Rotina"
        title="Vitaminas e medicamentos"
        description="Cadastre o que foi indicado e marque cada dose no checklist diário, com registro de quem confirmou."
        action={
          canCreate ? (
            <Button
              onClick={openCreate}
              className="rounded-2xl px-4 text-sm font-semibold shadow-soft"
            >
              <Plus className="h-4 w-4" />
              Novo registro
            </Button>
          ) : undefined
        }
      />

      <div className="animate-rise flex gap-2.5 rounded-3xl border border-sun/70 bg-sun/40 p-3.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sun-foreground" />
        <p className="text-[11px] leading-relaxed text-sun-foreground">
          O Nosso Bebê apenas registra o que a família cadastrar. O app não recomenda, ajusta nem
          prescreve medicamentos, doses ou horários — siga sempre a orientação do profissional que
          acompanha a gestação.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="animate-rise flex items-center gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-soft"
            style={{ animationDelay: `${60 + index * 60}ms` }}
          >
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", stat.chip)}>
              <stat.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="font-display text-lg font-semibold leading-tight text-foreground">
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{stat.hint}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Checklist diário */}
      <section className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Checklist diário
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold leading-tight text-foreground">
              {dayLabel(selectedDate)}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {dayDone} de {daySlots.length}{" "}
              {daySlots.length === 1 ? "dose registrada" : "doses registradas"}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {selectedDate !== today && (
              <button
                type="button"
                onClick={() => setSelectedDate(today)}
                className="h-9 rounded-xl border border-border bg-background px-2.5 text-[11px] font-semibold text-foreground/70 transition-colors hover:bg-muted"
              >
                Hoje
              </button>
            )}
            <div className="flex items-center gap-0.5 rounded-2xl border border-border/70 bg-background p-1">
              <button
                type="button"
                aria-label="Dia anterior"
                onClick={() => setSelectedDate(shiftedDay(selectedDate, -1))}
                className="grid h-7 w-7 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Próximo dia"
                onClick={() => setSelectedDate(shiftedDay(selectedDate, 1))}
                className="grid h-7 w-7 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span>
              {dayTaken} {dayTaken === 1 ? "tomada" : "tomadas"} de {daySlots.length}
            </span>
            <span>{dayRate}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${dayRate}%` }}
            />
          </div>
        </div>

        <div className="mt-4">
          {daySlots.length > 0 ? (
            <DoseChecklist
              slots={daySlots}
              canMark={canCreate}
              markingKey={markingKey}
              nameFor={nameFor}
              onMark={(slot, status) => void handleMark(slot, status)}
            />
          ) : (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-background/60 px-5 py-8 text-center">
              <ClipboardList className="h-6 w-6 text-primary" />
              <p className="mt-2 font-display text-sm font-semibold text-foreground">
                Nenhuma dose prevista para este dia
              </p>
              <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                {medications.length === 0
                  ? "Cadastre um medicamento ou vitamina para montar o checklist diário."
                  : "Os horários cadastrados não se aplicam a esta data, ou o tratamento não é diário."}
              </p>
              {medications.length === 0 && canCreate && (
                <Button
                  onClick={openCreate}
                  variant="outline"
                  className="mt-3 h-9 rounded-2xl border-border bg-card px-3 text-xs font-semibold hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar medicamento
                </Button>
              )}
            </div>
          )}
        </div>

        {!canCreate && (
          <p className="mt-3 rounded-2xl bg-secondary/50 px-3 py-2.5 text-[11px] leading-relaxed text-secondary-foreground/85">
            Seu papel permite acompanhar o checklist, mas não registrar doses. Fale com um
            administrador para liberar a permissão de adicionar registros.
          </p>
        )}

        {weekStats.unregistered > 0 && (
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Nos últimos 7 dias, {weekStats.unregistered}{" "}
            {weekStats.unregistered === 1 ? "dose ficou" : "doses ficaram"} sem registro.
          </p>
        )}
      </section>

      {/* Cadastros */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight text-foreground">
              Medicamentos e vitaminas
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {medications.length}{" "}
              {medications.length === 1 ? "cadastro na família" : "cadastros na família"}
            </p>
          </div>
          {canCreate && medications.length > 0 && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-9 items-center gap-1 rounded-2xl border border-border bg-card px-3 text-[11px] font-semibold text-foreground/75 transition-colors hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </button>
          )}
        </div>

        {medications.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {medications.map((medication) => {
              const todaySlotsForMedication = todaySlots.filter(
                (slot) => slot.medication.id === medication.id,
              );
              return (
                <MedicationCard
                  key={medication.id}
                  medication={medication}
                  todayTotal={todaySlotsForMedication.length}
                  todayTaken={todaySlotsForMedication.filter((slot) => slot.status === "taken").length}
                  canEdit={canEditAny}
                  canDelete={canDeleteAny || medication.created_by === user?.id}
                  onEdit={() => openEdit(medication)}
                  onDelete={() => setMedicationToRemove(medication)}
                  onDownload={(attachment) => void handleDownload(attachment)}
                />
              );
            })}
          </div>
        ) : (
          <div className="animate-rise flex flex-col items-center rounded-4xl border border-dashed border-border bg-card/60 px-5 py-10 text-center">
            <Pill className="h-7 w-7 text-primary" />
            <p className="mt-2 font-display text-base font-semibold text-foreground">
              Nenhum medicamento cadastrado
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Registre o nome, a dosagem, os horários e a receita para acompanhar as doses do dia a
              dia.
            </p>
            {canCreate && (
              <Button
                onClick={openCreate}
                variant="outline"
                className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar medicamento
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Histórico de adesão */}
      <section className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight text-foreground">
              Histórico de adesão
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Cada registro guarda o status, quem confirmou e a hora.
            </p>
          </div>
          {historyGroups.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllHistory((current) => !current)}
              className="h-8 rounded-xl border border-border bg-background px-2.5 text-[11px] font-semibold text-foreground/70 transition-colors hover:bg-muted"
            >
              {showAllHistory ? "Ver menos" : `Ver tudo (${recordedDoses.length})`}
            </button>
          )}
        </div>

        {visibleGroups.length > 0 ? (
          <div className="mt-3 space-y-3">
            {visibleGroups.map((group) => (
              <div key={group.date}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {dayLabel(group.date)}
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {group.doses.map((dose) => {
                    const medication = medications.find(
                      (item) => item.id === dose.medication_id,
                    );
                    return (
                      <li
                        key={dose.id}
                        className="flex items-start gap-2.5 rounded-2xl bg-background/70 px-3 py-2"
                      >
                        <span className="pt-0.5 font-display text-[11px] font-semibold text-muted-foreground">
                          {dose.dose_time.slice(0, 5)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {medication?.name ?? "Medicamento removido"}
                          </p>
                          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                            {medication
                              ? `${medication.dosage} ${medication.dosage_unit} · `
                              : ""}
                            por {nameFor(dose.confirmed_by)}
                            {dose.confirmed_at
                              ? ` às ${format(parseISO(dose.confirmed_at), "HH:mm")}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            doseStatusMeta[dose.status].chip,
                          )}
                        >
                          {doseStatusMeta[dose.status].label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center rounded-3xl bg-muted/50 px-4 py-7 text-center">
            <ClipboardList className="h-5 w-5 text-primary" />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Nenhuma dose registrada ainda. Marque as doses no checklist para começar o histórico.
            </p>
          </div>
        )}
      </section>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing ? "Editar cadastro" : "Novo medicamento ou vitamina"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize dosagem, horários, período e receita."
                : "Copie exatamente as informações da receita ou da orientação recebida."}
            </DialogDescription>
          </DialogHeader>

          <MedicationForm
            medication={editingLive}
            attachments={editingLive?.attachments ?? []}
            submitting={saving}
            removingAttachmentId={removingAttachmentId}
            onSubmit={handleSubmit}
            onRemoveAttachment={(attachment) => {
              if (canDeleteAny || attachment.uploaded_by === user?.id) {
                void handleRemoveAttachment(attachment);
                return;
              }
              toast({
                variant: "destructive",
                title: "Sem permissão para remover",
                description: "Peça a um administrador para excluir este anexo.",
              });
            }}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(medicationToRemove)}
        onOpenChange={(open) => !open && setMedicationToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Excluir “{medicationToRemove?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O cadastro, a receita anexada e todo o histórico de doses deste medicamento serão
              apagados para a família. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
            {medicationToRemove?.cost_cents ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                A despesa de {formatCents(medicationToRemove.cost_cents)} lançada no Financeiro será
                removida junto.
              </p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter cadastro</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Medications;
