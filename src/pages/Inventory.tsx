import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Package, PackageOpen, Plus } from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { InventoryCard } from "@/components/InventoryCard";
import { InventoryForm } from "@/components/InventoryForm";
import type { InventoryFormValues } from "@/components/InventoryForm";
import { InventoryHistoryDialog } from "@/components/InventoryHistoryDialog";
import type { MovementFormValues } from "@/components/InventoryHistoryDialog";
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
import { useToast } from "@/hooks/use-toast";
import {
  formatStock,
  inventorySummary,
  isLowStock,
  sortInventory,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/types/database";

const Inventory = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    family,
    loading,
    members,
    inventoryItems,
    inventoryMovements,
    can,
    saveInventoryItem,
    deleteInventoryItem,
    addInventoryMovement,
  } = useFamily();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<InventoryItem | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [savingMovement, setSavingMovement] = useState(false);
  const [movementResetSignal, setMovementResetSignal] = useState(0);

  const canCreate = can("records.create");
  const canEditAny = can("records.edit");
  const canDeleteAny = can("records.delete");

  const summary = inventorySummary(inventoryItems);
  const sorted = sortInventory(inventoryItems);
  const lowStockItems = sorted.filter(isLowStock);

  const memberNames = useMemo(
    () =>
      new Map(
        members.map((member) => [
          member.user_id,
          member.profile?.full_name?.trim() || member.profile?.email || "Membro da família",
        ]),
      ),
    [members],
  );

  // Sempre o registro mais recente do contexto: o saldo muda ao registrar movimentações.
  const openItem = openItemId
    ? inventoryItems.find((entry) => entry.id === openItemId) ?? null
    : null;
  const openItemMovements = openItemId
    ? inventoryMovements.filter((movement) => movement.inventory_item_id === openItemId)
    : [];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Conferindo o estoque do bebê…</p>
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

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: InventoryFormValues) => {
    setSaving(true);
    const { error } = await saveInventoryItem(
      {
        productName: values.productName,
        brand: values.brand,
        size: values.size,
        currentQuantity: values.currentQuantity,
        unit: values.unit,
        minimumStock: values.minimumStock,
      },
      editing?.id,
    );
    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    setDialogOpen(false);
    setEditing(null);
    toast({
      title: editing ? "Produto atualizado" : "Produto cadastrado",
      description: editing
        ? "A quantidade e o alerta de estoque já foram recalculados."
        : "Ele já aparece na lista de estoque da família.",
    });
  };

  const handleDelete = async () => {
    if (!itemToRemove) return;
    const { error } = await deleteInventoryItem(itemToRemove.id);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível excluir", description: error });
      return;
    }

    setItemToRemove(null);
    toast({ title: "Produto removido", description: "Ele saiu do controle de estoque." });
  };

  const handleAddMovement = async (values: MovementFormValues) => {
    if (!openItem) return;

    setSavingMovement(true);
    const { error } = await addInventoryMovement({
      inventoryItemId: openItem.id,
      movementType: values.movementType,
      quantity: values.quantity,
      occurredAt: values.occurredAt,
      notes: values.notes,
    });
    setSavingMovement(false);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível registrar", description: error });
      return;
    }

    setMovementResetSignal((current) => current + 1);
    toast({
      title: "Movimentação registrada",
      description: "O saldo do produto e a data de atualização já foram ajustados.",
    });
  };

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Estoque"
        title="Controle de estoque"
        description="Acompanhe fraldas, lenços, produtos de banho e tudo o que não pode faltar — com alerta quando o nível baixar."
        action={
          canCreate ? (
            <Button
              onClick={openCreate}
              className="rounded-2xl px-4 text-sm font-semibold shadow-soft"
            >
              <Plus className="h-4 w-4" />
              Novo produto
            </Button>
          ) : undefined
        }
      />

      {!canCreate && (
        <div className="animate-rise rounded-3xl border border-border/70 bg-secondary/40 p-4 text-xs leading-relaxed text-secondary-foreground/85">
          Seu papel permite acompanhar o estoque, mas não cadastrar ou editar produtos. Fale com um
          administrador para liberar a permissão de adicionar registros.
        </div>
      )}

      {/* Resumo */}
      <section className="animate-rise relative overflow-hidden rounded-4xl border border-border/70 bg-card p-5 shadow-soft sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-sun/50" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-mint/40" />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
              <Package className="h-3 w-3" />
              Estoque do bebê
            </span>
            <p className="mt-3 font-display text-3xl font-semibold leading-none text-foreground">
              {summary.total}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {summary.total === 1 ? "produto cadastrado" : "produtos cadastrados"} ·{" "}
              {summary.healthy} com estoque saudável
            </p>
          </div>

          <div
            className={cn(
              "shrink-0 rounded-3xl px-4 py-3 text-center",
              summary.lowStock > 0
                ? "bg-destructive/10 text-destructive"
                : "bg-mint/60 text-mint-foreground",
            )}
          >
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em]">
              Estoque baixo
            </p>
            <p className="font-display text-2xl font-semibold leading-tight">{summary.lowStock}</p>
            <p className="text-[9.5px]">
              {summary.lowStock === 1 ? "produto" : "produtos"}
            </p>
          </div>
        </div>
      </section>

      {/* Alerta de estoque baixo */}
      {lowStockItems.length > 0 && (
        <section className="animate-rise rounded-3xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {lowStockItems.length === 1
              ? "1 produto está no nível mínimo"
              : `${lowStockItems.length} produtos estão no nível mínimo`}
          </p>
          <ul className="mt-2 space-y-1">
            {lowStockItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-x-2 text-[11px] text-destructive/90"
              >
                <span className="truncate font-semibold">{item.product_name}</span>
                <span className="shrink-0">
                  {formatStock(item.current_quantity, item.unit)} de{" "}
                  {formatStock(item.minimum_stock, item.unit)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Listagem */}
      {sorted.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {sorted.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              canEdit={canEditAny}
              canDelete={canDeleteAny || item.created_by === user?.id}
              onOpen={() => {
                setOpenItemId(item.id);
                setMovementResetSignal(0);
              }}
              onEdit={() => openEdit(item)}
              onDelete={() => setItemToRemove(item)}
            />
          ))}
        </div>
      ) : (
        <div className="animate-rise flex flex-col items-center rounded-4xl border border-dashed border-border bg-card/60 px-5 py-10 text-center">
          <PackageOpen className="h-7 w-7 text-primary" />
          <p className="mt-2 font-display text-base font-semibold text-foreground">
            Nenhum produto no estoque
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Cadastre o que você costuma ter em casa — fraldas, lenços, sabonete — e defina o estoque
            mínimo para receber o alerta antes de acabar.
          </p>
          {canCreate && (
            <Button
              onClick={openCreate}
              variant="outline"
              className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Cadastrar primeiro produto
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
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing ? "Editar produto" : "Novo produto"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize a quantidade atual, a unidade e o estoque mínimo."
                : "Cadastre o produto com a quantidade atual e o mínimo desejado."}
            </DialogDescription>
          </DialogHeader>

          <InventoryForm
            item={editing}
            submitting={saving}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <InventoryHistoryDialog
        item={openItem}
        movements={openItemMovements}
        memberNames={memberNames}
        canRecord={canCreate}
        submitting={savingMovement}
        resetSignal={movementResetSignal}
        onClose={() => setOpenItemId(null)}
        onSubmit={handleAddMovement}
      />

      <AlertDialog
        open={Boolean(itemToRemove)}
        onOpenChange={(open) => !open && setItemToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Excluir “{itemToRemove?.product_name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToRemove
                ? `${formatStock(itemToRemove.current_quantity, itemToRemove.unit)} em estoque. O produto sai do controle de estoque e essa ação não pode ser desfeita.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter produto</AlertDialogCancel>
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

export default Inventory;
