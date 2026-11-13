import { useMemo, useState } from "react";
import { Gift as GiftIcon, Info, Loader2, Plus } from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { GiftCard } from "@/components/GiftCard";
import { GiftForm } from "@/components/GiftForm";
import type { GiftFormValues } from "@/components/GiftForm";
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
import { GIFT_BUCKET, downloadStoredFile } from "@/lib/attachments";
import { formatCents } from "@/lib/expenses";
import { formatNumericDate } from "@/lib/family";
import { giftPhotoFileName, giftTotals, linkableLayetteItems } from "@/lib/gifts";
import type { Gift } from "@/types/database";

const Gifts = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    family,
    loading,
    members,
    gifts,
    layetteItems,
    inventoryItems,
    can,
    saveGift,
    deleteGift,
    uploadGiftPhoto,
    removeGiftPhoto,
    saveInventoryItem,
    deleteInventoryItem,
  } = useFamily();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Gift | null>(null);
  const [saving, setSaving] = useState(false);
  const [giftToRemove, setGiftToRemove] = useState<Gift | null>(null);

  const canCreate = can("records.create");
  const canEditAny = can("records.edit");
  const canDeleteAny = can("records.delete");

  const totals = giftTotals(gifts);

  const layetteById = useMemo(
    () => new Map(layetteItems.map((item) => [item.id, item])),
    [layetteItems],
  );

  const inventoryById = useMemo(
    () => new Map(inventoryItems.map((item) => [item.id, item])),
    [inventoryItems],
  );

  /** Só itens que ainda não fecharam a quantidade; ao editar, mantém o vínculo atual. */
  const layetteOptions = useMemo(() => {
    const options = linkableLayetteItems(layetteItems);
    const linkedId = editing?.layette_item_id;
    if (linkedId && !options.some((item) => item.id === linkedId)) {
      const linked = layetteItems.find((item) => item.id === linkedId);
      if (linked) return [linked, ...options];
    }
    return options;
  }, [editing, layetteItems]);

  const giverSuggestions = useMemo(() => {
    const names = new Set<string>();
    for (const member of members) {
      const name = member.profile?.full_name?.trim();
      if (name) names.add(name);
    }
    for (const gift of gifts) {
      if (gift.giver_name) names.add(gift.giver_name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [gifts, members]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Abrindo os presentes do bebê…</p>
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

  const openEdit = (gift: Gift) => {
    setEditing(gift);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: GiftFormValues) => {
    setSaving(true);
    const previousPhoto = editing?.photo_path ?? null;

    // Presente consumível: o produto precisa existir no estoque antes do insert,
    // porque a entrada é criada pelo trigger `apply_gift_stock` junto do presente.
    let createdInventoryId: string | null = null;
    if (!editing && values.stock && !values.stock.inventoryItemId) {
      const created = await saveInventoryItem({
        productName: values.stock.productName,
        currentQuantity: 0,
        unit: values.stock.unit,
        minimumStock: 0,
      });

      if (created.error) {
        setSaving(false);
        toast({
          variant: "destructive",
          title: "Não foi possível criar o produto no estoque",
          description: created.error,
        });
        return;
      }

      createdInventoryId = created.id;
    }

    const inventoryItemId = values.stock
      ? values.stock.inventoryItemId ?? createdInventoryId
      : editing?.inventory_item_id ?? null;
    const stockQuantity = values.stock
      ? values.stock.quantity
      : editing?.stock_quantity ?? null;

    const { error, id } = await saveGift(
      {
        productName: values.productName,
        dateReceived: values.dateReceived,
        giverName: values.giverName,
        quantity: values.quantity,
        description: values.description,
        notes: values.notes,
        layetteItemId: values.layetteItemId,
        inventoryItemId,
        stockQuantity,
        costCents: values.costCents,
      },
      editing?.id,
    );

    if (error) {
      // Sem o presente, o produto criado agora ficaria vazio no estoque.
      if (createdInventoryId) await deleteInventoryItem(createdInventoryId);
      setSaving(false);
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    let photoError: string | null = null;

    if (id) {
      if (previousPhoto && (values.removePhoto || values.photo) && editing) {
        const removal = await removeGiftPhoto(editing);
        photoError = removal.error;
      }

      if (values.photo) {
        const upload = await uploadGiftPhoto(id, values.photo, null);
        photoError = upload.error ?? photoError;
      }
    }

    setSaving(false);
    setDialogOpen(false);
    setEditing(null);

    if (photoError) {
      toast({
        variant: "destructive",
        title: "Presente salvo, mas a foto falhou",
        description: photoError,
      });
      return;
    }

    const linkedLayette = values.layetteItemId
      ? layetteItems.find((item) => item.id === values.layetteItemId)
      : null;
    const unitsLabel = `${values.quantity} ${
      values.quantity === 1 ? "unidade somada" : "unidades somadas"
    }${linkedLayette ? ` em “${linkedLayette.name}”` : " no enxoval"}`;

    const effects = [
      values.layetteItemId ? unitsLabel : null,
      values.stock ? "quantidade somada no Estoque" : null,
      values.costCents
        ? `${formatCents(values.costCents)} lançado no Financeiro`
        : "nenhum custo no Financeiro",
    ]
      .filter(Boolean)
      .join(" · ");

    toast({
      title: editing ? "Presente atualizado" : "Presente registrado",
      description: `${effects}.`,
    });
  };

  const handleDelete = async () => {
    if (!giftToRemove) return;
    const { error } = await deleteGift(giftToRemove.id);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível excluir", description: error });
      return;
    }

    setGiftToRemove(null);
    toast({ title: "Presente excluído", description: "A foto também foi removida do cofre." });
  };

  const handleOpenPhoto = async (gift: Gift) => {
    if (!gift.photo_path) return;

    const { error } = await downloadStoredFile(
      GIFT_BUCKET,
      gift.photo_path,
      giftPhotoFileName(gift.photo_path),
    );

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível abrir a foto", description: error });
    }
  };

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Presentes"
        title="Controle de presentes"
        description="Guarde quem presenteou, a data e a foto. As unidades vinculadas somam no enxoval e o custo, quando a família paga, entra no Financeiro."
        action={
          canCreate ? (
            <Button
              onClick={openCreate}
              className="rounded-2xl px-4 text-sm font-semibold shadow-soft"
            >
              <Plus className="h-4 w-4" />
              Novo presente
            </Button>
          ) : undefined
        }
      />

      {!canCreate && (
        <div className="animate-rise rounded-3xl border border-border/70 bg-secondary/40 p-4 text-xs leading-relaxed text-secondary-foreground/85">
          Seu papel permite acompanhar os presentes, mas não cadastrar ou editar registros. Fale com
          um administrador para liberar a permissão de adicionar registros.
        </div>
      )}

      {/* Resumo */}
      <section className="animate-rise relative overflow-hidden rounded-4xl border border-[hsl(340,45%,90%)] bg-[hsl(340,58%,95%)] p-5 shadow-soft sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[hsl(340,52%,88%)]" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[hsl(20,80%,92%)]" />

        <div className="relative text-[hsl(340,36%,28%)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
                <GiftIcon className="h-3 w-3" />
                Presentes recebidos
              </span>
              <p className="mt-3 font-display text-3xl font-semibold leading-none">
                {totals.count}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[hsl(340,28%,38%)]">
                {totals.units} {totals.units === 1 ? "peça" : "peças"} · {totals.linked}{" "}
                {totals.linked === 1 ? "vinculado" : "vinculados"} ao enxoval
              </p>
              {totals.lastDate && (
                <p className="mt-0.5 text-[11px] text-[hsl(340,24%,44%)]">
                  Último presente em {formatNumericDate(totals.lastDate)}
                </p>
              )}
            </div>

            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-card/80 text-[hsl(340,50%,50%)] shadow-soft">
              <GiftIcon className="h-6 w-6" />
            </div>
          </div>

          <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-card/60 px-3 py-2 text-[10.5px] leading-relaxed text-[hsl(340,26%,40%)]">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            As unidades vinculadas somam na quantidade do item do enxoval. Nada vai para o
            Financeiro, a menos que você marque “Gerou custo para a família?” no cadastro.
          </p>
        </div>
      </section>

      {/* Listagem */}
      {gifts.length > 0 ? (
        <div className="space-y-2">
          {gifts.map((gift) => (
            <GiftCard
              key={gift.id}
              gift={gift}
              linkedLayette={
                gift.layette_item_id ? layetteById.get(gift.layette_item_id) ?? null : null
              }
              stockItem={
                gift.inventory_item_id ? inventoryById.get(gift.inventory_item_id) ?? null : null
              }
              canEdit={canEditAny}
              canDelete={canDeleteAny || gift.created_by === user?.id}
              onEdit={() => openEdit(gift)}
              onDelete={() => setGiftToRemove(gift)}
              onOpenPhoto={() => void handleOpenPhoto(gift)}
            />
          ))}
        </div>
      ) : (
        <div className="animate-rise flex flex-col items-center rounded-4xl border border-dashed border-border bg-card/60 px-5 py-10 text-center">
          <GiftIcon className="h-7 w-7 text-primary" />
          <p className="mt-2 font-display text-base font-semibold text-foreground">
            Nenhum presente registrado ainda
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            A cada presente que chegar, registre quem deu, a data e uma foto. Se ele substituir algo
            do enxoval, basta vincular ao item.
          </p>
          {canCreate && (
            <Button
              onClick={openCreate}
              variant="outline"
              className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar primeiro presente
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
              {editing ? "Editar presente" : "Novo presente"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize quem presenteou, a data, a foto e o vínculo com o enxoval."
                : "Registre o presente e, se quiser, vincule a um item do enxoval."}
            </DialogDescription>
          </DialogHeader>

          <GiftForm
            gift={editing}
            layetteOptions={layetteOptions}
            inventoryItems={inventoryItems}
            giverSuggestions={giverSuggestions}
            submitting={saving}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(giftToRemove)}
        onOpenChange={(open) => !open && setGiftToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Excluir “{giftToRemove?.product_name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {giftToRemove
                ? `Presente de ${giftToRemove.giver_name || "—"} em ${formatNumericDate(
                    giftToRemove.date_received,
                  )}. A foto e o registro serão removidos.`
                : ""}
            </AlertDialogDescription>
            {giftToRemove && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {giftToRemove.layette_item_id
                  ? `${giftToRemove.quantity} ${
                      giftToRemove.quantity === 1 ? "unidade sai" : "unidades saem"
                    } da quantidade do item no enxoval. `
                  : ""}
                {giftToRemove.cost_cents
                  ? `A despesa de ${formatCents(giftToRemove.cost_cents)} também sai do Financeiro.`
                  : "O Financeiro não é alterado."}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter presente</AlertDialogCancel>
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

export default Gifts;
