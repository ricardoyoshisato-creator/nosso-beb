import { useMemo, useState } from "react";
import {
  Baby,
  Loader2,
  PackageOpen,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  Wallet,
  X,
} from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { LayetteCard } from "@/components/LayetteCard";
import { LayetteForm } from "@/components/LayetteForm";
import type { LayetteFormValues } from "@/components/LayetteForm";
import { LayettePurchaseDialog } from "@/components/LayettePurchaseDialog";
import type {
  LayettePurchaseTarget,
  LayettePurchaseValues,
} from "@/components/LayettePurchaseDialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import { formatCents } from "@/lib/expenses";
import {
  emptyLayetteFilters,
  filterLayette,
  layetteCategories,
  layetteCategoryMeta,
  layetteFiltersActive,
  layetteQuantityLabel,
  layetteStatusCounts,
  layetteStatuses,
  layetteStatusMeta,
  layetteTotals,
  sortLayette,
} from "@/lib/layette";
import type { LayetteFilters } from "@/lib/layette";
import { cn } from "@/lib/utils";
import type { LayetteItem } from "@/types/database";

const Layette = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    family,
    loading,
    members,
    layetteItems,
    expenses,
    can,
    saveLayetteItem,
    deleteLayetteItem,
    purchaseLayetteItem,
  } = useFamily();

  const [filters, setFilters] = useState<LayetteFilters>(emptyLayetteFilters);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LayetteItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<LayetteItem | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<LayettePurchaseTarget | null>(null);
  const [savingPurchase, setSavingPurchase] = useState(false);

  const canCreate = can("records.create");
  const canEditAny = can("records.edit");
  const canDeleteAny = can("records.delete");
  /** A compra mexe no item (editar) e lança a despesa (criar). */
  const canPurchase = canCreate && canEditAny;

  const totals = layetteTotals(layetteItems);
  const statusCounts = layetteStatusCounts(layetteItems);
  const filtered = sortLayette(filterLayette(layetteItems, filters));
  const hasFilters = layetteFiltersActive(filters);

  const responsibleSuggestions = useMemo(() => {
    const names = new Set<string>();
    for (const member of members) {
      const name = member.profile?.full_name?.trim();
      if (name) names.add(name);
    }
    for (const item of layetteItems) {
      if (item.responsible) names.add(item.responsible);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [layetteItems, members]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Abrindo a lista do enxoval…</p>
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

  const openEdit = (item: LayetteItem) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: LayetteFormValues) => {
    const wasEditing = editing;
    setSaving(true);
    const { error, id } = await saveLayetteItem(
      {
        name: values.name,
        category: values.category,
        desiredQuantity: values.desiredQuantity,
        purchasedQuantity: values.purchasedQuantity,
        estimatedPriceCents: values.estimatedPriceCents,
        actualPriceCents: values.actualPriceCents,
        storeLink: values.storeLink,
        responsible: values.responsible,
        status: values.status,
        notes: values.notes,
      },
      wasEditing?.id,
    );
    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    setDialogOpen(false);
    setEditing(null);

    toast({
      title: wasEditing ? "Item atualizado" : "Item adicionado ao enxoval",
      description: id
        ? "Para somar peças compradas e lançar o gasto, use “Registrar compra” no card do item."
        : "As quantidades e o progresso já foram recalculados.",
    });
  };

  const handlePurchase = async (values: LayettePurchaseValues) => {
    if (!purchaseTarget) return;
    const target = purchaseTarget;

    setSavingPurchase(true);
    const { error } = await purchaseLayetteItem({
      layetteItemId: target.id,
      quantity: values.quantity,
      totalCents: values.totalCents,
      paidBy: values.paidBy,
      purchaseDate: values.purchaseDate,
    });
    setSavingPurchase(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível registrar a compra",
        description: error,
      });
      return;
    }

    setPurchaseTarget(null);
    toast({
      title: "Compra registrada",
      description: `${values.quantity} ${
        values.quantity === 1 ? "peça somada" : "peças somadas"
      } no enxoval · ${formatCents(values.totalCents)} em ${
        layetteCategoryMeta[target.category].label
      } no Financeiro.`,
    });
  };

  const handleCancelPurchase = () => {
    setPurchaseTarget(null);
  };

  const handleDelete = async () => {
    if (!itemToRemove) return;
    const { error } = await deleteLayetteItem(itemToRemove.id);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível excluir", description: error });
      return;
    }

    setItemToRemove(null);
    toast({ title: "Item removido", description: "Ele saiu da lista do enxoval." });
  };

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Enxoval"
        title="Lista de enxoval"
        description="Planeje o que o bebê precisa, acompanhe o que já foi comprado e o que ainda falta."
        action={
          canCreate ? (
            <Button
              onClick={openCreate}
              className="rounded-2xl px-4 text-sm font-semibold shadow-soft"
            >
              <Plus className="h-4 w-4" />
              Novo item
            </Button>
          ) : undefined
        }
      />

      {!canCreate && (
        <div className="animate-rise rounded-3xl border border-border/70 bg-secondary/40 p-4 text-xs leading-relaxed text-secondary-foreground/85">
          Seu papel permite acompanhar a lista do enxoval, mas não cadastrar ou editar itens. Fale
          com um administrador para liberar a permissão de adicionar registros.
        </div>
      )}

      {/* Progresso */}
      <section className="animate-rise relative overflow-hidden rounded-4xl bg-[hsl(266,32%,26%)] p-5 text-primary-foreground shadow-soft sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/30" />
        <div className="pointer-events-none absolute -bottom-20 -left-14 h-48 w-48 rounded-full bg-mint/15" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
                <Baby className="h-3 w-3" />
                Progresso do enxoval
              </span>
              <p className="mt-3 font-display text-3xl font-semibold leading-none">
                {totals.percent}%
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-primary-foreground/80">
                {totals.purchasedUnits} de {totals.desiredUnits} peças ·{" "}
                {totals.completeItems} de {totals.items}{" "}
                {totals.items === 1 ? "item completo" : "itens completos"}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-card/15 px-3 py-2 text-right backdrop-blur">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
                Faltam
              </p>
              <p className="font-display text-lg font-semibold leading-tight">
                {totals.pendingItems}
              </p>
              <p className="text-[9.5px] text-primary-foreground/70">
                {totals.pendingItems === 1 ? "item" : "itens"}
              </p>
            </div>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-card/25">
            <div
              className="h-full rounded-full bg-sun transition-all duration-700"
              style={{ width: `${totals.purchasedUnits > 0 ? Math.max(totals.percent, 3) : 0}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-card/15 px-3 py-2 backdrop-blur">
              <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
                <Tag className="h-3 w-3" />
                Estimado
              </p>
              <p className="mt-0.5 font-display text-sm font-semibold">
                {formatCents(totals.estimatedCents)}
              </p>
            </div>
            <div className="rounded-2xl bg-card/15 px-3 py-2 backdrop-blur">
              <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
                <Wallet className="h-3 w-3" />
                Já gasto
              </p>
              <p className="mt-0.5 font-display text-sm font-semibold">
                {formatCents(totals.actualCents)}
              </p>
            </div>
          </div>

          <p className="mt-2.5 text-[10.5px] leading-relaxed text-primary-foreground/70">
            Cada item só fica <strong>Concluído</strong> quando as peças recebidas ou compradas
            alcançam a quantidade desejada.
          </p>
        </div>
      </section>

      {/* Status: atalhos de filtro */}
      {layetteItems.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {layetteStatuses.map((value) => {
            const meta = layetteStatusMeta[value];
            const count = statusCounts.get(value) ?? 0;
            const active = filters.status === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    status: current.status === value ? "all" : value,
                  }))
                }
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all",
                  active
                    ? cn(meta.chip, "border-transparent shadow-soft")
                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted",
                  count === 0 && "opacity-60",
                )}
              >
                <meta.icon className="h-3.5 w-3.5" />
                {meta.label}
                <span className="rounded-full bg-card/70 px-1.5 text-[10px] text-foreground/70">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Busca e filtros */}
      <section className="animate-rise space-y-2.5 rounded-4xl border border-border/70 bg-card p-4 shadow-soft">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(event) =>
              setFilters((current) => ({ ...current, query: event.target.value }))
            }
            placeholder="Buscar por produto, responsável…"
            className="h-11 rounded-2xl border-border bg-background pl-10 text-sm shadow-none focus-visible:ring-primary/40"
            aria-label="Buscar itens do enxoval"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Select
            value={filters.category}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                category: value as LayetteFilters["category"],
              }))
            }
          >
            <SelectTrigger
              className="h-11 rounded-2xl border-border bg-background text-sm"
              aria-label="Filtrar por categoria"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todas as categorias</SelectItem>
              {layetteCategories.map((value) => (
                <SelectItem key={value} value={value}>
                  {layetteCategoryMeta[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            aria-pressed={filters.onlyPending}
            onClick={() =>
              setFilters((current) => ({ ...current, onlyPending: !current.onlyPending }))
            }
            className={cn(
              "inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border px-3.5 text-[11.5px] font-semibold transition-colors",
              filters.onlyPending
                ? "border-transparent bg-primary text-primary-foreground shadow-soft"
                : "border-border bg-background text-foreground/70 hover:bg-muted",
            )}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Só o que falta
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold text-foreground/75">
            {filtered.length} {filtered.length === 1 ? "item" : "itens"}
            {hasFilters ? ` de ${layetteItems.length}` : ""}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={() => setFilters(emptyLayetteFilters)}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-[10.5px] font-semibold text-foreground/70 transition-colors hover:bg-muted"
            >
              <X className="h-3 w-3" />
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      {/* Listagem */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((item) => (
            <LayetteCard
              key={item.id}
              item={item}
              canEdit={canEditAny}
              canDelete={canDeleteAny || item.created_by === user?.id}
              canPurchase={canPurchase}
              onEdit={() => openEdit(item)}
              onDelete={() => setItemToRemove(item)}
              onPurchase={() =>
                setPurchaseTarget({
                  id: item.id,
                  name: item.name,
                  category: item.category,
                  desiredQuantity: item.desired_quantity,
                  purchasedQuantity: item.purchased_quantity,
                })
              }
            />
          ))}
        </div>
      ) : (
        <div className="animate-rise flex flex-col items-center rounded-4xl border border-dashed border-border bg-card/60 px-5 py-10 text-center">
          <PackageOpen className="h-7 w-7 text-primary" />
          <p className="mt-2 font-display text-base font-semibold text-foreground">
            {layetteItems.length === 0
              ? "Seu enxoval ainda está vazio"
              : "Nenhum item encontrado"}
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {layetteItems.length === 0
              ? "Comece pela lista do que o bebê vai precisar: roupas, berço, banho e passeio. Depois é só ir marcando o que já foi comprado."
              : "Tente outro termo de busca ou ajuste a categoria e o status dos filtros."}
          </p>
          {layetteItems.length === 0 && canCreate && (
            <Button
              onClick={openCreate}
              variant="outline"
              className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar primeiro item
            </Button>
          )}
          {layetteItems.length > 0 && hasFilters && (
            <Button
              onClick={() => setFilters(emptyLayetteFilters)}
              variant="outline"
              className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
            >
              Limpar filtros
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
              {editing ? "Editar item do enxoval" : "Novo item do enxoval"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize quantidades, preços e o status deste item."
                : "Cadastre o que o bebê precisa e acompanhe até a compra."}
            </DialogDescription>
          </DialogHeader>

          <LayetteForm
            item={editing}
            responsibleSuggestions={responsibleSuggestions}
            submitting={saving}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {purchaseTarget && (
        <LayettePurchaseDialog
          item={purchaseTarget}
          payerSuggestions={responsibleSuggestions}
          submitting={savingPurchase}
          onSubmit={handlePurchase}
          onCancel={handleCancelPurchase}
        />
      )}

      <AlertDialog
        open={Boolean(itemToRemove)}
        onOpenChange={(open) => !open && setItemToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Excluir “{itemToRemove?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToRemove
                ? `${layetteQuantityLabel(itemToRemove)} · ${
                    layetteCategoryMeta[itemToRemove.category].label
                  }. O item sai da lista do enxoval e essa ação não pode ser desfeita.`
                : ""}
            </AlertDialogDescription>
            {itemToRemove && expenses.some((expense) => expense.layette_item_id === itemToRemove.id) && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                A despesa lançada no Financeiro continua registrada, apenas sem o vínculo com este
                item.
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter item</AlertDialogCancel>
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

export default Layette;
