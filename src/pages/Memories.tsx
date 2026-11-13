import { useMemo, useState } from "react";
import { CalendarHeart, Heart, Loader2, Plus, Sparkles } from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { MemoryCard } from "@/components/MemoryCard";
import { MemoryForm } from "@/components/MemoryForm";
import type { MemoryFormValues } from "@/components/MemoryForm";
import { PageHeader } from "@/components/PageHeader";
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
import { formatNumericDate } from "@/lib/family";
import {
  favoriteMemoriesCount,
  filterMemories,
  groupMemoriesByMonth,
  sortMemories,
} from "@/lib/memories";
import type { MemoryFilter } from "@/lib/memories";
import { cn } from "@/lib/utils";
import type { Memory } from "@/types/database";

const Memories = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { family, loading, memories, can, saveMemory, deleteMemory, toggleMemoryFavorite } =
    useFamily();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<MemoryFilter>("all");
  const [memoryToRemove, setMemoryToRemove] = useState<Memory | null>(null);
  const [removing, setRemoving] = useState(false);
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);

  const canCreate = can("records.create");
  const canEditRecords = can("records.edit");
  const canDeleteAny = can("records.delete");

  const sorted = useMemo(() => sortMemories(memories), [memories]);
  const visible = useMemo(() => filterMemories(sorted, filter), [sorted, filter]);
  const groups = useMemo(() => groupMemoriesByMonth(visible), [visible]);

  const favorites = favoriteMemoriesCount(memories);
  const monthsRecorded = useMemo(
    () => new Set(memories.map((memory) => memory.date.slice(0, 7))).size,
    [memories],
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (memory: Memory) => {
    setEditing(memory);
    setFormOpen(true);
  };

  const handleSave = async (values: MemoryFormValues) => {
    setSaving(true);
    const { error } = await saveMemory(
      {
        title: values.title,
        date: values.date,
        category: values.category,
        description: values.description,
        media: values.media,
        removeMedia: values.removeMedia,
      },
      editing ?? undefined,
    );
    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    setFormOpen(false);
    setEditing(null);
    toast({
      title: editing ? "Memória atualizada" : "Memória guardada",
      description: editing
        ? "Os dados e a mídia já aparecem atualizados na linha do tempo."
        : "Ela já aparece na linha do tempo da família.",
    });
  };

  const handleFavorite = async (memory: Memory) => {
    setFavoriteBusyId(memory.id);
    const { error } = await toggleMemoryFavorite(memory);
    setFavoriteBusyId(null);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível favoritar", description: error });
    }
  };

  const handleDelete = async () => {
    if (!memoryToRemove) return;

    setRemoving(true);
    const { error } = await deleteMemory(memoryToRemove);
    setRemoving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível excluir", description: error });
      return;
    }

    setMemoryToRemove(null);
    toast({
      title: "Memória excluída",
      description: "O registro e a mídia saíram do álbum da família.",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Abrindo as memórias da família…</p>
      </div>
    );
  }

  if (!family) {
    return <CreateFamilyCard />;
  }

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Memórias"
        title="Linha do tempo de memórias"
        description="Cada primeiro momento do bebê — o ultrassom, o nascimento, o primeiro banho — guardado com foto ou vídeo, na ordem em que aconteceu."
        action={
          canCreate ? (
            <Button
              onClick={openCreate}
              className="rounded-2xl px-4 text-sm font-semibold shadow-soft"
            >
              <Plus className="h-4 w-4" />
              Nova memória
            </Button>
          ) : undefined
        }
      />

      {/* Resumo do álbum */}
      <section className="animate-rise relative overflow-hidden rounded-4xl border border-[hsl(346,50%,91%)] bg-[hsl(348,60%,97%)] p-5 shadow-soft sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[hsl(346,60%,90%)]" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[hsl(266,45%,93%)]" />

        <div className="relative text-[hsl(346,32%,26%)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
                <Heart className="h-3 w-3" />
                Nosso álbum
              </span>
              <p className="mt-3 font-display text-3xl font-semibold leading-none">
                {memories.length}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[hsl(346,25%,38%)]">
                {memories.length === 1 ? "memória guardada" : "memórias guardadas"} · {favorites}{" "}
                {favorites === 1 ? "favorita" : "favoritas"} · {monthsRecorded}{" "}
                {monthsRecorded === 1 ? "mês registrado" : "meses registrados"}
              </p>
              {sorted[0] && (
                <p className="mt-0.5 text-[11px] text-[hsl(346,22%,44%)]">
                  Momento mais recente em {formatNumericDate(sorted[0].date)}
                </p>
              )}
            </div>

            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-card/80 text-[hsl(346,55%,55%)] shadow-soft">
              <CalendarHeart className="h-6 w-6" />
            </div>
          </div>

          <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-card/60 px-3 py-2 text-[10.5px] leading-relaxed text-[hsl(346,24%,40%)]">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
            Toque no coração para guardar os momentos preferidos no filtro “Favoritas”.
          </p>
        </div>
      </section>

      {/* Filtro Todas / Favoritas */}
      <div
        className="animate-rise flex items-center gap-1.5 rounded-full border border-border/70 bg-card p-1 shadow-soft"
        role="group"
        aria-label="Filtrar memórias"
      >
        {(
          [
            { key: "all", label: "Todas as memórias", count: memories.length, icon: CalendarHeart },
            { key: "favorites", label: "Favoritas", count: favorites, icon: Heart },
          ] as const
        ).map((option) => {
          const Icon = option.icon;
          const active = filter === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              aria-pressed={active}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", active && option.key === "favorites" && "fill-current")} />
              {option.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  active ? "bg-primary-foreground/20" : "bg-muted text-foreground/70",
                )}
              >
                {option.count}
              </span>
            </button>
          );
        })}
      </div>

      {!canCreate && (
        <p className="rounded-2xl bg-secondary/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-secondary-foreground/85">
          Seu papel permite acompanhar as memórias e favoritar. Peça a um cuidador ou administrador
          para cadastrar novos momentos.
        </p>
      )}

      {/* Linha do tempo */}
      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group, groupIndex) => (
            <section
              key={group.key}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(groupIndex, 5) * 50}ms` }}
            >
              <div className="mb-2.5 flex items-center gap-2 pl-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </h2>
              </div>

              <ol className="relative ml-1.5 space-y-3 border-l border-dashed border-primary/30 pl-4 sm:pl-6">
                {group.items.map((memory) => (
                  <li key={memory.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[21px] top-6 z-10 h-2.5 w-2.5 rounded-full border-2 border-card sm:-left-[29px]",
                        memory.is_favorite ? "bg-rose-foreground" : "bg-primary",
                      )}
                      aria-hidden
                    />
                    <MemoryCard
                      memory={memory}
                      canEdit={canEditRecords}
                      canDelete={canDeleteAny || memory.created_by === user?.id}
                      favoriteBusy={favoriteBusyId === memory.id}
                      onToggleFavorite={() => void handleFavorite(memory)}
                      onEdit={() => openEdit(memory)}
                      onDelete={() => setMemoryToRemove(memory)}
                    />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <div className="animate-rise flex flex-col items-center rounded-4xl border border-dashed border-border bg-card/60 px-5 py-10 text-center">
          {filter === "favorites" ? (
            <>
              <Heart className="h-7 w-7 text-primary" />
              <p className="mt-2 font-display text-base font-semibold text-foreground">
                Nenhuma favorita ainda
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Toque no coração de uma memória para deixá-la aqui — assim os momentos especiais
                ficam sempre à mão.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFilter("all")}
                className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
              >
                Ver todas as memórias
              </Button>
            </>
          ) : (
            <>
              <CalendarHeart className="h-7 w-7 text-primary" />
              <p className="mt-2 font-display text-base font-semibold text-foreground">
                A linha do tempo começa aqui
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Guarde o primeiro ultrassom, o nascimento, o primeiro banho… Cada memória pode ter
                uma foto, um vídeo e a história do momento.
              </p>
              {canCreate && (
                <Button
                  onClick={openCreate}
                  variant="outline"
                  className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Registrar primeira memória
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing ? "Editar memória" : "Nova memória"}
            </DialogTitle>
            <DialogDescription>
              Conte o momento, escolha o tipo e anexe uma foto ou um vídeo do acontecimento.
            </DialogDescription>
          </DialogHeader>

          <MemoryForm
            memory={editing}
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
        open={Boolean(memoryToRemove)}
        onOpenChange={(open) => !open && setMemoryToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Excluir “{memoryToRemove?.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A foto/vídeo sai do armazenamento da família e a memória desaparece da linha do
              tempo. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter memória</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              onClick={handleDelete}
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Memories;
