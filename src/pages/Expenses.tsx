import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Plus,
  Receipt,
  Search,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { ExpenseCard } from "@/components/ExpenseCard";
import { ExpenseForm } from "@/components/ExpenseForm";
import type { ExpenseFormValues } from "@/components/ExpenseForm";
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
import { RECEIPT_BUCKET, downloadStoredFile } from "@/lib/attachments";
import {
  categoryTotals,
  emptyExpenseFilters,
  expenseCategories,
  expenseCategoryMeta,
  filterExpenses,
  filtersActive,
  formatCents,
  latestExpenses,
  monthTotalsFor,
  monthlyTotals,
  totalCents,
} from "@/lib/expenses";
import type { ExpenseFilters, ExpenseWithAttachments } from "@/lib/expenses";
import { formatNumericDate } from "@/lib/family";
import type { ExpenseAttachment } from "@/types/database";
import { cn } from "@/lib/utils";

const Expenses = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    family,
    loading,
    expenses,
    layetteItems,
    members,
    can,
    saveExpense,
    deleteExpense,
    uploadExpenseFiles,
    removeExpenseAttachment,
  } = useFamily();

  const [filters, setFilters] = useState<ExpenseFilters>(emptyExpenseFilters);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseWithAttachments | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<string | null>(null);
  const [expenseToRemove, setExpenseToRemove] = useState<ExpenseWithAttachments | null>(null);

  const canCreate = can("records.create");
  const canEditAny = can("records.edit");
  const canDeleteAny = can("records.delete");

  const editingLive = editing ? expenses.find((item) => item.id === editing.id) ?? editing : null;

  const layetteNameById = useMemo(
    () => new Map(layetteItems.map((item) => [item.id, item.name])),
    [layetteItems],
  );

  const payerSuggestions = useMemo(() => {
    const names = new Set<string>();
    for (const member of members) {
      const name = member.profile?.full_name?.trim();
      if (name) names.add(name);
    }
    for (const expense of expenses) {
      if (expense.paid_by) names.add(expense.paid_by);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [expenses, members]);

  const total = totalCents(expenses);
  const categories = categoryTotals(expenses);
  const months = monthlyTotals(expenses, 4);
  const latest = latestExpenses(expenses, 4);
  const month = monthTotalsFor(expenses);
  const filtered = filterExpenses(expenses, filters);
  const filteredTotal = totalCents(filtered);
  const hasFilters = filtersActive(filters);

  const topCategoryCents = categories[0]?.cents ?? 0;
  const topMonthCents = Math.max(...months.map((item) => item.cents), 1);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Somando as despesas da família…</p>
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

  const openEdit = (expense: ExpenseWithAttachments) => {
    setEditing(expense);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: ExpenseFormValues) => {
    setSaving(true);
    const { error, id } = await saveExpense(values, editing?.id);

    if (error) {
      setSaving(false);
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error });
      return;
    }

    let uploadError: string | null = null;
    if (id && values.files.length > 0) {
      const upload = await uploadExpenseFiles(id, values.files);
      uploadError = upload.error;
    }

    setSaving(false);
    setDialogOpen(false);

    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Gasto salvo, mas o comprovante falhou",
        description: uploadError,
      });
      setEditing(null);
      return;
    }

    toast({
      title: editing ? "Gasto atualizado" : "Gasto registrado",
      description: "Os indicadores já foram recalculados.",
    });
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!expenseToRemove) return;
    const { error } = await deleteExpense(expenseToRemove.id);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível excluir", description: error });
      return;
    }

    setExpenseToRemove(null);
    toast({ title: "Gasto excluído", description: "O comprovante também foi removido." });
  };

  const handleRemoveAttachment = async (attachment: ExpenseAttachment) => {
    setRemovingAttachmentId(attachment.id);
    const { error } = await removeExpenseAttachment(attachment);
    setRemovingAttachmentId(null);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: error });
      return;
    }

    toast({ title: "Comprovante removido", description: attachment.file_name });
  };

  const handleOpenReceipt = async (attachment: ExpenseAttachment) => {
    const { error } = await downloadStoredFile(
      RECEIPT_BUCKET,
      attachment.storage_path,
      attachment.file_name,
    );
    if (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível abrir o comprovante",
        description: error,
      });
    }
  };

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Financeiro"
        title="Controle de despesas"
        description="Registre cada compra do enxoval e da rotina, com categoria, quem pagou e o comprovante."
        action={
          canCreate ? (
            <Button
              onClick={openCreate}
              className="rounded-2xl px-4 text-sm font-semibold shadow-soft"
            >
              <Plus className="h-4 w-4" />
              Novo gasto
            </Button>
          ) : undefined
        }
      />

      {!canCreate && (
        <div className="animate-rise rounded-3xl border border-border/70 bg-secondary/40 p-4 text-xs leading-relaxed text-secondary-foreground/85">
          Seu papel permite acompanhar os gastos da família, mas não registrar ou editar despesas.
          Fale com um administrador para liberar a permissão de adicionar registros.
        </div>
      )}

      {/* Indicadores */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div
          className="animate-rise relative overflow-hidden rounded-4xl bg-[hsl(20,32%,24%)] p-5 text-primary-foreground shadow-soft sm:p-6"
          style={{ animationDelay: "60ms" }}
        >
          <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-primary/40" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-lavender/20" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
              <Wallet className="h-3 w-3" />
              Total gasto
            </span>
            <p className="mt-3 font-display text-3xl font-semibold leading-none sm:text-[32px]">
              {formatCents(total)}
            </p>
            <p className="mt-1.5 text-[11px] text-primary-foreground/80">
              {expenses.length} {expenses.length === 1 ? "lançamento" : "lançamentos"} ·{" "}
              {formatCents(month.current)} neste mês
            </p>

            {month.previous > 0 && (
              <span
                className={cn(
                  "mt-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                  month.difference > 0
                    ? "bg-primary/25 text-primary-foreground"
                    : "bg-mint/30 text-cream",
                )}
              >
                {month.difference > 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(month.variation)}% {month.difference > 0 ? "acima" : "abaixo"} do mês
                passado
              </span>
            )}
          </div>
        </div>

        <div
          className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-foreground">
              Gastos por categoria
            </h2>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-lavender/70 text-lavender-foreground">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>

          {categories.length > 0 ? (
            <>
              <ul className="mt-3 space-y-2.5">
                {categories.slice(0, 4).map((item) => (
                  <li key={item.category}>
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          category: current.category === item.category ? "all" : item.category,
                        }))
                      }
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span
                          className={cn(
                            "truncate font-semibold",
                            filters.category === item.category
                              ? "text-primary"
                              : "text-foreground/80",
                          )}
                        >
                          {item.label}
                        </span>
                        <span className="shrink-0 font-semibold text-muted-foreground">
                          {formatCents(item.cents)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", expenseCategoryMeta[item.category].bar)}
                          style={{
                            width: `${Math.max(4, Math.round((item.cents / topCategoryCents) * 100))}%`,
                          }}
                        />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {categories.length > 4 && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  + {categories.length - 4}{" "}
                  {categories.length - 4 === 1 ? "categoria" : "categorias"} com gastos
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 rounded-2xl bg-muted/60 px-3 py-4 text-[11px] leading-relaxed text-muted-foreground">
              Nenhum gasto registrado ainda. As categorias aparecem aqui conforme você cadastra as
              compras.
            </p>
          )}
        </div>

        <div
          className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
          style={{ animationDelay: "180ms" }}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-foreground">Gastos por mês</h2>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-mint/70 text-mint-foreground">
              <Receipt className="h-4 w-4" />
            </span>
          </div>

          <ul className="mt-3 space-y-2.5">
            {months.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-8 shrink-0 text-[10px] font-semibold uppercase",
                    item.isCurrent ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      item.isCurrent ? "bg-primary" : "bg-lavender",
                    )}
                    style={{ width: `${Math.round((item.cents / topMonthCents) * 100)}%` }}
                  />
                </div>
                <span className="w-[72px] shrink-0 truncate text-right text-[10px] font-semibold text-foreground/70">
                  {formatCents(item.cents)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground">
            Comparativo dos últimos 4 meses.
          </p>
        </div>
      </div>

      {/* Últimas compras */}
      <section
        className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
        style={{ animationDelay: "240ms" }}
      >
        <div className="flex items-end justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-foreground">Últimas compras</h2>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {latest.length} mais recentes
          </span>
        </div>

        {latest.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {latest.map((expense) => (
              <li
                key={expense.id}
                className="rounded-3xl border border-border/60 bg-background/70 p-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {formatNumericDate(expense.expense_date)}
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-foreground">{expense.name}</p>
                <p className="mt-1 font-display text-sm font-semibold text-foreground">
                  {formatCents(expense.amount_cents)}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {expenseCategoryMeta[expense.category].label}
                  {expense.store ? ` · ${expense.store}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl bg-muted/60 px-3 py-4 text-[11px] leading-relaxed text-muted-foreground">
            Quando você registrar a primeira compra, as mais recentes aparecem aqui.
          </p>
        )}
      </section>

      {/* Busca e filtros */}
      <section className="animate-rise space-y-2.5 rounded-4xl border border-border/70 bg-card p-4 shadow-soft">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(event) =>
              setFilters((current) => ({ ...current, query: event.target.value }))
            }
            placeholder="Buscar por produto, loja, quem pagou…"
            className="h-11 rounded-2xl border-border bg-background pl-10 text-sm shadow-none focus-visible:ring-primary/40"
            aria-label="Buscar despesas"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Categoria
            </p>
            <Select
              value={filters.category}
              onValueChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  category: value as ExpenseFilters["category"],
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
                {expenseCategories.map((value) => (
                  <SelectItem key={value} value={value}>
                    {expenseCategoryMeta[value].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              De
            </p>
            <Input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((current) => ({ ...current, from: event.target.value }))
              }
              className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
              aria-label="Data inicial"
            />
          </div>

          <div className="space-y-1">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Até
            </p>
            <Input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) =>
                setFilters((current) => ({ ...current, to: event.target.value }))
              }
              className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
              aria-label="Data final"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold text-foreground/75">
            {filtered.length} {filtered.length === 1 ? "lançamento" : "lançamentos"} ·{" "}
            {formatCents(filteredTotal)}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={() => setFilters(emptyExpenseFilters)}
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
          {filtered.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              layetteName={
                expense.layette_item_id
                  ? layetteNameById.get(expense.layette_item_id) ?? null
                  : null
              }
              canEdit={canEditAny}
              canDelete={canDeleteAny || expense.created_by === user?.id}
              onEdit={() => openEdit(expense)}
              onDelete={() => setExpenseToRemove(expense)}
              onOpenReceipt={(attachment) => void handleOpenReceipt(attachment)}
            />
          ))}
        </div>
      ) : (
        <div className="animate-rise flex flex-col items-center rounded-4xl border border-dashed border-border bg-card/60 px-5 py-10 text-center">
          <Wallet className="h-7 w-7 text-primary" />
          <p className="mt-2 font-display text-base font-semibold text-foreground">
            {expenses.length === 0 ? "Nenhum gasto registrado" : "Nenhum gasto encontrado"}
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {expenses.length === 0
              ? "Comece registrando a primeira compra do enxoval para acompanhar o total, as categorias e os gastos por mês."
              : "Tente outro termo de busca ou ajuste o período e a categoria dos filtros."}
          </p>
          {expenses.length === 0 && canCreate && (
            <Button
              onClick={openCreate}
              variant="outline"
              className="mt-4 h-10 rounded-2xl border-border bg-card px-4 text-xs font-semibold hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar primeiro gasto
            </Button>
          )}
          {expenses.length > 0 && hasFilters && (
            <Button
              onClick={() => setFilters(emptyExpenseFilters)}
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
              {editing ? "Editar gasto" : "Novo gasto"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados da compra, o comprovante e as observações."
                : "Registre a compra com data, categoria, valor e quem pagou."}
            </DialogDescription>
          </DialogHeader>

          <ExpenseForm
            expense={editingLive}
            attachments={editingLive?.attachments ?? []}
            payerSuggestions={payerSuggestions}
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
                description: "Peça a um administrador para excluir este comprovante.",
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
        open={Boolean(expenseToRemove)}
        onOpenChange={(open) => !open && setExpenseToRemove(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Excluir “{expenseToRemove?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {expenseToRemove
                ? `${formatCents(expenseToRemove.amount_cents)} de ${formatNumericDate(
                    expenseToRemove.expense_date,
                  )} serão removidos do controle de despesas, junto com o comprovante. Essa ação não pode ser desfeita.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Manter gasto</AlertDialogCancel>
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

export default Expenses;
