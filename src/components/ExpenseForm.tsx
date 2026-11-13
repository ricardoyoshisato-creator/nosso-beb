import { useState } from "react";
import type { FormEvent } from "react";
import { format } from "date-fns";
import { Loader2, Receipt, Wallet } from "lucide-react";

import { AttachmentPicker } from "@/components/AttachmentPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  centsToInput,
  expenseCategories,
  expenseCategoryMeta,
  parseAmountToCents,
} from "@/lib/expenses";
import type { Expense, ExpenseAttachment, ExpenseCategory } from "@/types/database";

export type ExpenseFormValues = {
  date: string;
  name: string;
  category: ExpenseCategory;
  description: string;
  amountCents: number;
  paidBy: string;
  store: string;
  notes: string;
  files: File[];
};

type ExpenseFormProps = {
  expense?: Expense | null;
  attachments?: ExpenseAttachment[];
  payerSuggestions?: string[];
  submitting?: boolean;
  removingAttachmentId?: string | null;
  onSubmit: (values: ExpenseFormValues) => void;
  onRemoveAttachment?: (attachment: ExpenseAttachment) => void;
  onCancel?: () => void;
};

export function ExpenseForm({
  expense,
  attachments = [],
  payerSuggestions = [],
  submitting = false,
  removingAttachmentId = null,
  onSubmit,
  onRemoveAttachment,
  onCancel,
}: ExpenseFormProps) {
  const [date, setDate] = useState(expense?.expense_date ?? format(new Date(), "yyyy-MM-dd"));
  const [name, setName] = useState(expense?.name ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "outros");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? centsToInput(expense.amount_cents) : "");
  const [paidBy, setPaidBy] = useState(expense?.paid_by ?? "");
  const [store, setStore] = useState(expense?.store ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!date) {
      setError("Informe a data da compra.");
      return;
    }
    if (!name.trim()) {
      setError("Informe o produto ou serviço.");
      return;
    }

    const amountCents = parseAmountToCents(amount);
    if (!amountCents) {
      setError("Informe um valor válido, maior que zero. Ex.: 129,90");
      return;
    }

    setError(null);
    onSubmit({
      date,
      name: name.trim(),
      category,
      description,
      amountCents,
      paidBy,
      store,
      notes,
      files,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="expense-name" className="text-xs font-semibold text-foreground/80">
            Produto ou serviço *
          </Label>
          <Input
            id="expense-name"
            value={name}
            maxLength={120}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Berço portátil"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expense-amount" className="text-xs font-semibold text-foreground/80">
            Valor *
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              R$
            </span>
            <Input
              id="expense-amount"
              value={amount}
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
              className="h-11 rounded-2xl border-border bg-background pl-10 text-sm font-semibold focus-visible:ring-primary/40"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground/80">Categoria *</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as ExpenseCategory)}>
            <SelectTrigger className="h-11 rounded-2xl border-border bg-background text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {expenseCategories.map((value) => (
                <SelectItem key={value} value={value}>
                  {expenseCategoryMeta[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expense-date" className="text-xs font-semibold text-foreground/80">
            Data *
          </Label>
          <Input
            id="expense-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expense-description" className="text-xs font-semibold text-foreground/80">
          Descrição
        </Label>
        <Textarea
          id="expense-description"
          value={description}
          rows={2}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex.: Berço com colchão, comprado junto do enxoval"
          className="min-h-[72px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="expense-payer" className="text-xs font-semibold text-foreground/80">
            Quem pagou
          </Label>
          <Input
            id="expense-payer"
            value={paidBy}
            list="expense-payer-options"
            maxLength={80}
            onChange={(event) => setPaidBy(event.target.value)}
            placeholder="Ex.: Ana"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
          <datalist id="expense-payer-options">
            {payerSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expense-store" className="text-xs font-semibold text-foreground/80">
            Loja / Fornecedor
          </Label>
          <Input
            id="expense-store"
            value={store}
            maxLength={120}
            onChange={(event) => setStore(event.target.value)}
            placeholder="Ex.: Loja Bebê Feliz"
            className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expense-notes" className="text-xs font-semibold text-foreground/80">
          Observações
        </Label>
        <Textarea
          id="expense-notes"
          value={notes}
          rows={2}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Forma de pagamento, parcelas, troca em até 30 dias…"
          className="min-h-[72px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
        />
      </div>

      <AttachmentPicker
        existing={attachments}
        files={files}
        onFilesChange={setFiles}
        onRemoveExisting={onRemoveAttachment}
        removingId={removingAttachmentId}
        onError={setError}
        disabled={submitting}
        hint="A foto do comprovante é opcional e fica no armazenamento privado da família."
      />

      {error && (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-2xl text-sm font-semibold shadow-soft sm:w-auto sm:px-6"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : expense ? (
            <Receipt className="h-4 w-4" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          {expense ? "Salvar alterações" : "Adicionar gasto"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-11 w-full rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted sm:w-auto"
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
