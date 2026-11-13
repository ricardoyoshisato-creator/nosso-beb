import { useState } from "react";
import {
  ArrowLeftRight,
  FileCheck2,
  FlaskConical,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { ExamForm } from "@/components/ExamForm";
import type { ExamFormValues } from "@/components/ExamForm";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { ExamWithAttachments } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import { EXAM_BUCKET, downloadStoredFile, formatFileSize } from "@/lib/attachments";
import { formatCents } from "@/lib/expenses";
import { formatNumericDate } from "@/lib/family";
import { examSortDate, examStage, examStageMeta, groupExams } from "@/lib/exams";
import type { ExamAttachment } from "@/types/database";
import { cn } from "@/lib/utils";

const Exams = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    family,
    loading,
    exams,
    can,
    saveExam,
    deleteExam,
    uploadExamFiles,
    removeExamAttachment,
  } = useFamily();

  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExamWithAttachments | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<string | null>(null);
  const [examToRemove, setExamToRemove] = useState<ExamWithAttachments | null>(null);

  const canCreate = can("records.create");
  const canEditAny = can("records.edit");
  const canDeleteAny = can("records.delete");

  const editingLive = editing ? exams.find((exam) => exam.id === editing.id) ?? editing : null;

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? exams.filter(
        (exam) =>
          exam.name.toLowerCase().includes(normalizedQuery) ||
          (exam.lab ?? "").toLowerCase().includes(normalizedQuery) ||
          (exam.doctor_name ?? "").toLowerCase().includes(normalizedQuery),
      )
    : exams;

  const groups = groupExams(filtered);
  const withResult = exams.filter((exam) => Boolean(exam.result?.trim())).length;
  const attachmentsCount = exams.reduce(
    (total, exam) => total + (exam.attachments?.length ?? 0),
    0,
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Buscando os exames da família…</p>
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

  const openEdit = (exam: ExamWithAttachments) => {
    setEditing(exam);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: ExamFormValues) => {
    setSaving(true);
    const { error, id } = await saveExam(values, editing?.id);

    if (error) {
      setSaving(false);
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    let uploadError: string | null = null;
    if (id && values.files.length > 0) {
      const upload = await uploadExamFiles(id, values.files);
      uploadError = upload.error;
    }

    setSaving(false);
    setDialogOpen(false);

    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Exame salvo, mas os anexos falharam",
        description: uploadError,
      });
      setEditing(null);
      return;
    }

    toast({
      title: editing ? "Exame atualizado" : "Exame adicionado",
      description:
        values.isPrivate && values.costCents
          ? `${formatCents(values.costCents)} já estão no Financeiro como Consultas e exames.`
          : "O histórico da família já está atualizado.",
    });
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!examToRemove) return;
    const { error } = await deleteExam(examToRemove.id);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível excluir", description: error });
      return;
    }

    setExamToRemove(null);
    toast({ title: "Exame excluído", description: "Os anexos também foram removidos." });
  };

  const handleRemoveAttachment = async (attachment: ExamAttachment) => {
    setRemovingAttachmentId(attachment.id);
    const { error } = await removeExamAttachment(attachment);
    setRemovingAttachmentId(null);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: error });
      return;
    }

    toast({ title: "Anexo removido", description: attachment.file_name });
  };

  const handleDownload = async (attachment: ExamAttachment) => {
    const { error } = await downloadStoredFile(
      EXAM_BUCKET,
      attachment.storage_path,
      attachment.file_name,
    );
    if (error) {
      toast({ variant: "destructive", title: "Não foi possível abrir o anexo", description: error });
    }
  };

  const stats = [
    {
      label: "Exames",
      value: `${exams.length}`,
      hint: "no histórico",
      icon: FlaskConical,
      chip: "bg-lavender/70 text-lavender-foreground",
    },
    {
      label: "Com resultado",
      value: `${withResult}`,
      hint: "prontos para consultar",
      icon: FileCheck2,
      chip: "bg-mint/70 text-mint-foreground",
    },
    {
      label: "Anexos",
      value: `${attachmentsCount}`,
      hint: "laudos e imagens",
      icon: Paperclip,
      chip: "bg-sun/80 text-sun-foreground",
    },
  ];

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Exames"
        title="Exames da gestação"
        description="Guarde laudos, acompanhe as datas e compare os resultados do mesmo exame ao longo da gestação."
        action={
          canCreate ? (
            <Button
              onClick={openCreate}
              className="rounded-2xl px-4 text-sm font-semibold shadow-soft"
            >
              <Plus className="h-4 w-4" />
              Novo exame
            </Button>
          ) : undefined
        }
      />

      {!canCreate && (
        <div className="animate-rise rounded-3xl border border-border/70 bg-secondary/40 p-4 text-xs leading-relaxed text-secondary-foreground/85">
          Seu papel permite apenas acompanhar os exames. Fale com um administrador para adicionar ou
          editar registros.
        </div>
      )}

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

      <div className="relative animate-rise">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por exame, laboratório ou médico"
          className="h-11 rounded-2xl border-border bg-card pl-10 text-sm shadow-soft focus-visible:ring-primary/40"
          aria-label="Buscar exames"
        />
      </div>

      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group) => (
            <article
              key={group.key}
              className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
            >
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-base font-semibold leading-tight text-foreground">
                    {group.name}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {group.exams.length} {group.exams.length === 1 ? "registro" : "registros"} ·{" "}
                    {group.withResult} com resultado
                  </p>
                </div>
                {group.comparable && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lavender/70 px-2.5 py-1 text-[10px] font-semibold text-lavender-foreground">
                    <ArrowLeftRight className="h-3 w-3" />
                    comparar
                  </span>
                )}
              </header>

              <ul className="mt-3 space-y-2.5">
                {group.exams.map((exam) => {
                  const stage = examStage(exam);
                  const canEditExam = canEditAny;
                  const canDeleteExam = canDeleteAny || exam.created_by === user?.id;
                  const dates = [
                    { label: "Solicitado", value: exam.requested_date },
                    { label: "Agendado", value: exam.scheduled_date },
                    { label: "Realizado", value: exam.performed_date },
                  ].filter((item) => Boolean(item.value));

                  return (
                    <li
                      key={exam.id}
                      className="rounded-3xl border border-border/60 bg-background/70 p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              examStageMeta[stage].chip,
                            )}
                          >
                            {examStageMeta[stage].label}
                          </span>
                          <span className="text-[11px] font-semibold text-foreground/70">
                            {formatNumericDate(examSortDate(exam))}
                          </span>
                          {exam.is_private && (
                            <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-foreground/75">
                              Particular
                              {exam.cost_cents ? ` · ${formatCents(exam.cost_cents)}` : ""}
                            </span>
                          )}
                        </div>

                        {(canEditExam || canDeleteExam) && (
                          <div className="flex shrink-0 items-center gap-1">
                            {canEditExam && (
                              <button
                                type="button"
                                aria-label={`Editar ${exam.name}`}
                                onClick={() => openEdit(exam)}
                                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canDeleteExam && (
                              <button
                                type="button"
                                aria-label={`Excluir ${exam.name}`}
                                onClick={() => setExamToRemove(exam)}
                                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {dates.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          {dates.map((item) => (
                            <span key={item.label}>
                              <span className="font-semibold text-foreground/70">{item.label}:</span>{" "}
                              {formatNumericDate(item.value)}
                            </span>
                          ))}
                        </div>
                      )}

                      {(exam.doctor_name || exam.lab) && (
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {[exam.doctor_name, exam.lab].filter(Boolean).join(" · ")}
                        </p>
                      )}

                      {exam.result && (
                        <div className="mt-2 whitespace-pre-line rounded-2xl bg-mint/40 px-3 py-2.5 text-xs leading-relaxed text-mint-foreground">
                          {exam.result}
                        </div>
                      )}

                      {exam.notes && (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                          {exam.notes}
                        </p>
                      )}

                      {(exam.attachments?.length ?? 0) > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {exam.attachments.map((attachment) => (
                            <button
                              key={attachment.id}
                              type="button"
                              onClick={() => handleDownload(attachment)}
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[10px] font-semibold text-foreground/75 transition-colors hover:bg-muted"
                            >
                              <Paperclip className="h-3 w-3 shrink-0" />
                              <span className="truncate">{attachment.file_name}</span>
                              {attachment.size_bytes ? (
                                <span className="shrink-0 text-muted-foreground">
                                  {formatFileSize(attachment.size_bytes)}
                                </span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <div className="animate-rise flex flex-col items-center rounded-4xl border border-dashed border-border bg-card/60 px-5 py-10 text-center">
          <FlaskConical className="h-7 w-7 text-primary" />
          <p className="mt-2 font-display text-base font-semibold text-foreground">
            {query ? "Nenhum exame encontrado" : "Nenhum exame registrado ainda"}
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {query
              ? "Tente buscar por outro nome, laboratório ou médico."
              : "Registre os exames do pré-natal para guardar as datas, os laudos e comparar resultados ao longo da gestação."}
          </p>
          {canCreate && !query && (
            <Button
              onClick={openCreate}
              variant="outline"
              className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar exame
            </Button>
          )}
        </div>
      )}

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
              {editing ? "Editar exame" : "Novo exame"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize as datas, o resultado e os anexos deste exame."
                : "Registre o pedido agora e complete o resultado depois do exame."}
            </DialogDescription>
          </DialogHeader>

          <ExamForm
            exam={editingLive}
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
        open={Boolean(examToRemove)}
        onOpenChange={(open) => !open && setExamToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Excluir “{examToRemove?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O registro e os anexos serão apagados para toda a família. Essa ação não pode ser
              desfeita.
            </AlertDialogDescription>
            {examToRemove?.is_private && examToRemove.cost_cents ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                A despesa de {formatCents(examToRemove.cost_cents)} lançada no Financeiro será
                removida junto.
              </p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter exame</AlertDialogCancel>
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

export default Exams;
