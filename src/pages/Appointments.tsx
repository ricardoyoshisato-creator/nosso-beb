import { useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  History,
  Loader2,
  Paperclip,
  Stethoscope,
} from "lucide-react";

import { AppointmentCard } from "@/components/AppointmentCard";
import { AppointmentForm } from "@/components/AppointmentForm";
import type { AppointmentFormValues } from "@/components/AppointmentForm";
import { CreateFamilyCard } from "@/components/CreateFamilyCard";
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
import { useFamily } from "@/contexts/FamilyContext";
import type { AppointmentWithAttachments } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import {
  appointmentCountdown,
  formatAppointmentLong,
  formatAppointmentTime,
  partitionAppointments,
} from "@/lib/appointments";
import { APPOINTMENT_BUCKET, downloadStoredFile } from "@/lib/attachments";
import { formatCents } from "@/lib/expenses";
import type { AppointmentAttachment } from "@/types/database";
import { cn } from "@/lib/utils";

const Appointments = () => {
  const { toast } = useToast();
  const {
    family,
    loading,
    appointments,
    can,
    saveAppointment,
    deleteAppointment,
    uploadAppointmentFiles,
    removeAppointmentAttachment,
  } = useFamily();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentWithAttachments | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<string | null>(null);
  const [appointmentToRemove, setAppointmentToRemove] =
    useState<AppointmentWithAttachments | null>(null);

  const canManage = can("calendar.manage");
  const { upcoming, history } = partitionAppointments(appointments);
  const next = upcoming[0] ?? null;
  // Mantém os anexos do formulário sincronizados com o estado do contexto.
  const editingLive = editing
    ? appointments.find((appointment) => appointment.id === editing.id) ?? editing
    : null;
  const doneCount = appointments.filter((appointment) => appointment.status === "done").length;
  const attachmentsCount = appointments.reduce(
    (total, appointment) => total + (appointment.attachments?.length ?? 0),
    0,
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Organizando as consultas…</p>
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

  const openEdit = (appointment: AppointmentWithAttachments) => {
    setEditing(appointment);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: AppointmentFormValues) => {
    setSaving(true);
    const { error, id } = await saveAppointment(values, editing?.id);

    if (error) {
      setSaving(false);
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    let uploadError: string | null = null;
    if (id && values.files.length > 0) {
      const upload = await uploadAppointmentFiles(id, values.files);
      uploadError = upload.error;
    }

    setSaving(false);
    setDialogOpen(false);

    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Consulta salva, mas os anexos falharam",
        description: uploadError,
      });
      return;
    }

    toast({
      title: editing ? "Consulta atualizada" : "Consulta agendada",
      description:
        values.isPrivate && values.costCents
          ? `${formatCents(values.costCents)} já estão no Financeiro como Consultas e exames.`
          : "A família já pode acompanhar os detalhes.",
    });
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!appointmentToRemove) return;
    const { error } = await deleteAppointment(appointmentToRemove.id);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível excluir", description: error });
      return;
    }

    setAppointmentToRemove(null);
    toast({ title: "Consulta excluída", description: "Os anexos também foram removidos." });
  };

  const handleRemoveAttachment = async (attachment: AppointmentAttachment) => {
    setRemovingAttachmentId(attachment.id);
    const { error } = await removeAppointmentAttachment(attachment);
    setRemovingAttachmentId(null);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: error });
      return;
    }

    toast({ title: "Anexo removido", description: attachment.file_name });
  };

  const handleDownload = async (attachment: AppointmentAttachment) => {
    const { error } = await downloadStoredFile(
      APPOINTMENT_BUCKET,
      attachment.storage_path,
      attachment.file_name,
    );
    if (error) {
      toast({ variant: "destructive", title: "Não foi possível abrir o anexo", description: error });
    }
  };

  const stats = [
    {
      label: "Próximas",
      value: `${upcoming.length}`,
      hint: upcoming.length === 1 ? "consulta agendada" : "consultas agendadas",
      icon: CalendarClock,
      chip: "bg-lavender/70 text-lavender-foreground",
    },
    {
      label: "Realizadas",
      value: `${doneCount}`,
      hint: "no histórico",
      icon: CalendarCheck2,
      chip: "bg-mint/70 text-mint-foreground",
    },
    {
      label: "Anexos",
      value: `${attachmentsCount}`,
      hint: "exames e documentos",
      icon: Paperclip,
      chip: "bg-sun/80 text-sun-foreground",
    },
  ];

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Consultas"
        title="Consultas da gestação"
        description="Agende o pré-natal, guarde as recomendações de cada encontro e os exames anexados."
        action={
          canManage ? (
            <Button
              onClick={openCreate}
              className="rounded-2xl px-4 text-sm font-semibold shadow-soft"
            >
              <CalendarPlus className="h-4 w-4" />
              Nova consulta
            </Button>
          ) : undefined
        }
      />

      {!canManage && (
        <div className="animate-rise rounded-3xl border border-border/70 bg-secondary/40 p-4 text-xs leading-relaxed text-secondary-foreground/85">
          Seu papel permite apenas acompanhar as consultas. Fale com um administrador para agendar
          ou editar.
        </div>
      )}

      {next && (
        <section className="animate-rise relative overflow-hidden rounded-4xl bg-[hsl(20,32%,24%)] p-5 text-primary-foreground sm:p-6">
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/45" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-lavender/25" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
                <Stethoscope className="h-3.5 w-3.5" />
                Próxima consulta
              </span>
              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight">
                {next.doctor_name}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-primary-foreground/85">
                {formatAppointmentLong(next.scheduled_at)} · {formatAppointmentTime(next.scheduled_at)}
              </p>
              {(next.clinic || next.address) && (
                <p className="mt-1 text-xs leading-relaxed text-primary-foreground/70">
                  {[next.clinic, next.address].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-2xl bg-card/20 px-3.5 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur">
                {appointmentCountdown(next.scheduled_at)}
              </span>
              {canManage && (
                <Button
                  onClick={() => openEdit(next)}
                  className="h-10 rounded-2xl bg-card text-xs font-semibold text-foreground shadow-soft hover:bg-cream"
                >
                  Abrir
                </Button>
              )}
            </div>
          </div>
        </section>
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

      {/* Consultas futuras */}
      <section className="animate-rise rounded-4xl border border-border/70 bg-card/60 p-4 shadow-soft sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Próximas consultas</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Agendadas ou remarcadas, em ordem de data.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-lavender/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-lavender-foreground">
            {upcoming.length}
          </span>
        </div>

        {upcoming.length > 0 ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {upcoming.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                canManage={canManage}
                onEdit={openEdit}
                onDelete={setAppointmentToRemove}
                onDownload={handleDownload}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center rounded-3xl border border-dashed border-border bg-background/60 px-5 py-8 text-center">
            <CalendarClock className="h-6 w-6 text-primary" />
            <p className="mt-2 font-display text-base font-semibold text-foreground">
              Nenhuma consulta agendada
            </p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Registre a próxima consulta do pré-natal para não perder nenhum encontro.
            </p>
            {canManage && (
              <Button
                onClick={openCreate}
                variant="outline"
                className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Agendar consulta
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Histórico */}
      <section className="animate-rise rounded-4xl border border-border/70 bg-card/60 p-4 shadow-soft sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Histórico</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Consultas realizadas, canceladas e as que já passaram.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <History className="h-3 w-3" />
            {history.length}
          </span>
        </div>

        {history.length > 0 ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {history.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                canManage={canManage}
                onEdit={openEdit}
                onDelete={setAppointmentToRemove}
                onDownload={handleDownload}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-3xl bg-muted/50 px-4 py-5">
            <CalendarX2 className="h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ainda não há consultas no histórico. Elas aparecem aqui depois do atendimento — basta
              atualizar o status para “Realizada”.
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
              {editing ? "Editar consulta" : "Nova consulta"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados, o status e os anexos desta consulta."
                : "Preencha o que já sabe — dá para completar as recomendações depois do atendimento."}
            </DialogDescription>
          </DialogHeader>

          <AppointmentForm
            appointment={editingLive}
            attachments={editingLive?.attachments ?? []}
            submitting={saving}
            removingAttachmentId={removingAttachmentId}
            onSubmit={handleSubmit}
            onRemoveAttachment={canManage ? handleRemoveAttachment : undefined}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(appointmentToRemove)}
        onOpenChange={(open) => !open && setAppointmentToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Excluir a consulta com {appointmentToRemove?.doctor_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O registro e os anexos serão apagados para toda a família. Essa ação não pode ser
              desfeita.
            </AlertDialogDescription>
            {appointmentToRemove?.is_private && appointmentToRemove.cost_cents ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                A despesa de {formatCents(appointmentToRemove.cost_cents)} lançada no Financeiro será
                removida junto.
              </p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter consulta</AlertDialogCancel>
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

export default Appointments;
