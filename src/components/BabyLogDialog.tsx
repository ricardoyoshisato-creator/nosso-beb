import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { format } from "date-fns";
import { Check, Clock, Loader2, PackageMinus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import {
  babyLogMetaOf,
  breastfeedingSideLabels,
  formatLogClock,
  formatLogDuration,
  milkTypeLabels,
  stoolConsistencyLabels,
} from "@/lib/babyLogs";
import { formatStock, parseQuantity } from "@/lib/inventory";
import { cn } from "@/lib/utils";
import type { BabyLogDetails, BabyLogType } from "@/types/database";

type BabyLogDialogProps = {
  type: BabyLogType | null;
  onClose: () => void;
};

type MilkType = NonNullable<BabyLogDetails["milk_type"]>;
type BreastfeedingSide = NonNullable<BabyLogDetails["side"]>;
type StoolConsistency = NonNullable<BabyLogDetails["consistency"]>;

/** Valor para input datetime-local no fuso local (nunca UTC). */
function localInputValue(date = new Date()) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function parseNumber(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Opção "não baixar do estoque" no seletor da fralda. */
const NO_STOCK = "none";

export function BabyLogDialog({ type, onClose }: BabyLogDialogProps) {
  const { toast } = useToast();
  const { saveBabyLog, inventoryItems } = useFamily();

  const [when, setWhen] = useState(localInputValue());
  const [notes, setNotes] = useState("");

  // fralda
  const [xixi, setXixi] = useState(false);
  const [coco, setCoco] = useState(false);
  const [stockItemId, setStockItemId] = useState(NO_STOCK);
  const [stockQty, setStockQty] = useState("1");

  // mamadeira
  const [volume, setVolume] = useState("120");
  const [milkType, setMilkType] = useState<MilkType>("formula");

  // amamentação
  const [side, setSide] = useState<BreastfeedingSide>("esquerdo");
  const [duration, setDuration] = useState("");

  // sono
  const [sleepStart, setSleepStart] = useState(localInputValue());
  const [sleepEnd, setSleepEnd] = useState("");

  // medicamento
  const [medicationName, setMedicationName] = useState("");
  const [medicationDosage, setMedicationDosage] = useState("");

  // temperatura
  const [temperature, setTemperature] = useState("");

  // evacuação
  const [consistency, setConsistency] = useState<StoolConsistency>("pastosa");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const meta = type ? babyLogMetaOf(type) : null;

  // Todos os produtos do estoque aparecem; os que estão sem saldo ficam bloqueados.
  const stockOptions = useMemo(
    () =>
      [...inventoryItems].sort((a, b) =>
        a.product_name.localeCompare(b.product_name, "pt-BR"),
      ),
    [inventoryItems],
  );
  const linkedStockItem =
    stockItemId === NO_STOCK
      ? null
      : stockOptions.find((item) => item.id === stockItemId) ?? null;
  const parsedStockQty = linkedStockItem ? parseQuantity(stockQty) : null;

  // Cada abertura começa limpa, com o horário atual.
  useEffect(() => {
    if (!type) return;

    setWhen(localInputValue());
    setNotes("");
    setXixi(false);
    setCoco(false);
    setStockItemId(NO_STOCK);
    setStockQty("1");
    setVolume("120");
    setMilkType("formula");
    setSide("esquerdo");
    setDuration("");
    setSleepStart(localInputValue());
    setSleepEnd("");
    setMedicationName("");
    setMedicationDosage("");
    setTemperature("");
    setConsistency("pastosa");
    setError(null);
    setSaving(false);
  }, [type]);

  const sleepMinutes = useMemo(() => {
    if (!sleepStart || !sleepEnd) return null;
    const start = new Date(sleepStart).getTime();
    const end = new Date(sleepEnd).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return Math.round((end - start) / 60000);
  }, [sleepEnd, sleepStart]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!type) return;

    setError(null);
    const details: BabyLogDetails = {};
    let loggedAt = when ? new Date(when).toISOString() : new Date().toISOString();

    switch (type) {
      case "fralda":
        if (!xixi && !coco) {
          setError("Marque xixi, cocô ou os dois.");
          return;
        }
        if (linkedStockItem) {
          if (parsedStockQty === null || parsedStockQty <= 0) {
            setError("Informe quantas unidades do estoque foram usadas (ex.: 1).");
            return;
          }
          if (parsedStockQty > linkedStockItem.current_quantity) {
            setError(
              `Só há ${formatStock(linkedStockItem.current_quantity, linkedStockItem.unit)} de “${linkedStockItem.product_name}” no estoque.`,
            );
            return;
          }
        }
        details.xixi = xixi;
        details.coco = coco;
        break;

      case "mamadeira": {
        const ml = parseNumber(volume);
        if (ml === null || ml <= 0 || ml > 2000) {
          setError("Informe o volume em ml (até 2000 ml).");
          return;
        }
        details.volume_ml = Math.round(ml);
        details.milk_type = milkType;
        break;
      }

      case "amamentacao": {
        const minutes = parseNumber(duration);
        if (minutes === null || minutes <= 0 || minutes > 300) {
          setError("Informe a duração em minutos (até 300 min).");
          return;
        }
        details.side = side;
        details.duration_min = Math.round(minutes);
        break;
      }

      case "sono": {
        if (!sleepStart || !sleepEnd) {
          setError("Informe o início e o fim do sono.");
          return;
        }
        const start = new Date(sleepStart);
        const end = new Date(sleepEnd);
        if (!(end.getTime() > start.getTime())) {
          setError("O fim do sono precisa ser depois do início.");
          return;
        }
        if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
          setError("Um registro de sono não pode passar de 24 horas.");
          return;
        }
        details.started_at = start.toISOString();
        details.ended_at = end.toISOString();
        // O sono entra no diário pelo horário em que começou.
        loggedAt = start.toISOString();
        break;
      }

      case "medicamento":
        if (!medicationName.trim()) {
          setError("Escreva o nome do medicamento.");
          return;
        }
        details.name = medicationName.trim();
        if (medicationDosage.trim()) details.dosage = medicationDosage.trim();
        break;

      case "temperatura": {
        const celsius = parseNumber(temperature);
        if (celsius === null || celsius < 30 || celsius > 45) {
          setError("Informe a temperatura entre 30 e 45 °C.");
          return;
        }
        details.celsius = Math.round(celsius * 10) / 10;
        break;
      }

      case "evacuacao":
        details.consistency = consistency;
        break;

      case "outro":
        if (!notes.trim()) {
          setError("Descreva o cuidado nas observações.");
          return;
        }
        break;
    }

    setSaving(true);
    const { error: saveError } = await saveBabyLog({
      type,
      loggedAt,
      details,
      notes,
      inventoryItemId: linkedStockItem?.id ?? null,
      stockQuantity: linkedStockItem ? parsedStockQty : null,
    });
    setSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    toast({
      title: "Registro salvo",
      description: linkedStockItem
        ? `${babyLogMetaOf(type).label} às ${formatLogClock(loggedAt)} · ${formatStock(
            parsedStockQty ?? 0,
            linkedStockItem.unit,
          )} baixados de “${linkedStockItem.product_name}”.`
        : `${babyLogMetaOf(type).label} às ${formatLogClock(loggedAt)} no diário da família.`,
    });
    onClose();
  };

  if (!type || !meta) return null;

  const Icon = meta.icon;
  const nowValue = localInputValue();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", meta.chip)}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-display text-lg">{meta.dialogTitle}</DialogTitle>
              <DialogDescription className="text-[11px]">
                Fica no diário da família com quem registrou.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "sono" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sleep-start" className="text-xs font-semibold text-foreground/80">
                    Início
                  </Label>
                  <Input
                    id="sleep-start"
                    type="datetime-local"
                    required
                    max={nowValue}
                    value={sleepStart}
                    onChange={(event) => setSleepStart(event.target.value)}
                    className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sleep-end" className="text-xs font-semibold text-foreground/80">
                    Fim
                  </Label>
                  <Input
                    id="sleep-end"
                    type="datetime-local"
                    required
                    max={nowValue}
                    value={sleepEnd}
                    onChange={(event) => setSleepEnd(event.target.value)}
                    className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
                  />
                </div>
              </div>

              {sleepMinutes !== null && (
                <p className="flex items-center gap-2 rounded-2xl bg-lavender/40 px-3.5 py-2.5 text-[11px] font-semibold text-lavender-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatLogDuration(sleepMinutes)} de sono
                </p>
              )}
            </>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="log-when" className="text-xs font-semibold text-foreground/80">
                Quando
              </Label>
              <Input
                id="log-when"
                type="datetime-local"
                required
                max={nowValue}
                value={when}
                onChange={(event) => setWhen(event.target.value)}
                className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
              />
            </div>
          )}

          {type === "fralda" && (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { key: "xixi" as const, label: "Xixi", active: xixi, toggle: () => setXixi((value) => !value) },
                { key: "coco" as const, label: "Cocô", active: coco, toggle: () => setCoco((value) => !value) },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={option.toggle}
                  aria-pressed={option.active}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition-all",
                    option.active
                      ? "border-primary/40 bg-primary/12 text-[hsl(13,62%,38%)]"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {option.label}
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-lg border transition-colors",
                      option.active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-transparent",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {type === "fralda" && (
            <div className="space-y-2 rounded-3xl border border-border/70 bg-muted/35 p-3.5">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                  <PackageMinus className="h-3.5 w-3.5 text-primary" />
                  Produto Utilizado
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Opcional. A quantidade sai do produto escolhido e entra no histórico de
                  movimentações do estoque.
                </p>
              </div>

              {stockOptions.length === 0 ? (
                <p className="rounded-2xl bg-card px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  Nenhum produto cadastrado no estoque. Cadastre fraldas em <strong>Estoque</strong>{" "}
                  para dar baixa automática nas trocas.
                </p>
              ) : (
                <>
                  <Select
                    value={stockItemId}
                    onValueChange={(value) => {
                      setStockItemId(value);
                      setStockQty("1");
                      setError(null);
                    }}
                  >
                    <SelectTrigger
                      className="h-11 rounded-2xl border-border bg-background text-sm"
                      aria-label="Produto utilizado na troca"
                    >
                      <SelectValue placeholder="Nenhum produto" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value={NO_STOCK}>Nenhum produto</SelectItem>
                      {stockOptions.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={item.id}
                          disabled={item.current_quantity <= 0}
                        >
                          {item.product_name} ·{" "}
                          {item.current_quantity > 0
                            ? formatStock(item.current_quantity, item.unit)
                            : "sem estoque"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {linkedStockItem && (
                    <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr] sm:items-center">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="diaper-stock-quantity"
                          className="text-[11px] font-semibold text-foreground/80"
                        >
                          Quantidade
                        </Label>
                        <Input
                          id="diaper-stock-quantity"
                          inputMode="decimal"
                          value={stockQty}
                          onChange={(event) => setStockQty(event.target.value)}
                          className="h-11 rounded-2xl border-border bg-background text-sm"
                        />
                      </div>

                      <p className="rounded-2xl bg-card px-3 py-2.5 text-[11px] leading-relaxed text-foreground/75">
                        {parsedStockQty !== null && parsedStockQty > 0
                          ? `Saldo depois da troca: ${formatStock(
                              Math.max(linkedStockItem.current_quantity - parsedStockQty, 0),
                              linkedStockItem.unit,
                            )}`
                          : `Saldo atual: ${formatStock(
                              linkedStockItem.current_quantity,
                              linkedStockItem.unit,
                            )}`}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {type === "mamadeira" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="bottle-volume" className="text-xs font-semibold text-foreground/80">
                  Volume (ml)
                </Label>
                <Input
                  id="bottle-volume"
                  inputMode="numeric"
                  required
                  value={volume}
                  onChange={(event) => setVolume(event.target.value)}
                  placeholder="120"
                  className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/80">Tipo de leite</Label>
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted p-1">
                  {(Object.keys(milkTypeLabels) as MilkType[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMilkType(option)}
                      aria-pressed={milkType === option}
                      className={cn(
                        "rounded-xl px-2 py-2 text-[11px] font-semibold leading-tight transition-all",
                        milkType === option
                          ? "bg-card text-foreground shadow-soft"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {milkTypeLabels[option]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === "amamentacao" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/80">Lado</Label>
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted p-1">
                  {(Object.keys(breastfeedingSideLabels) as BreastfeedingSide[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSide(option)}
                      aria-pressed={side === option}
                      className={cn(
                        "rounded-xl px-2 py-2 text-[11px] font-semibold transition-all",
                        side === option
                          ? "bg-card text-foreground shadow-soft"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {breastfeedingSideLabels[option]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="breastfeeding-duration" className="text-xs font-semibold text-foreground/80">
                  Duração (min)
                </Label>
                <Input
                  id="breastfeeding-duration"
                  inputMode="numeric"
                  required
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  placeholder="15"
                  className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
                />
              </div>
            </>
          )}

          {type === "medicamento" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="medication-name" className="text-xs font-semibold text-foreground/80">
                  Medicamento
                </Label>
                <Input
                  id="medication-name"
                  required
                  value={medicationName}
                  onChange={(event) => setMedicationName(event.target.value)}
                  placeholder="Ex.: Paracetamol"
                  className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="medication-dosage" className="text-xs font-semibold text-foreground/80">
                  Dose <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="medication-dosage"
                  value={medicationDosage}
                  onChange={(event) => setMedicationDosage(event.target.value)}
                  placeholder="Ex.: 5 gotas"
                  className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
                />
              </div>
            </div>
          )}

          {type === "temperatura" && (
            <div className="space-y-1.5">
              <Label htmlFor="temperature" className="text-xs font-semibold text-foreground/80">
                Temperatura (°C)
              </Label>
              <Input
                id="temperature"
                inputMode="decimal"
                required
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
                placeholder="36,5"
                className="h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
              />
            </div>
          )}

          {type === "evacuacao" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">Consistência</Label>
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted p-1">
                {(Object.keys(stoolConsistencyLabels) as StoolConsistency[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setConsistency(option)}
                    aria-pressed={consistency === option}
                    className={cn(
                      "rounded-xl px-2 py-2 text-[11px] font-semibold transition-all",
                      consistency === option
                        ? "bg-card text-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {stoolConsistencyLabels[option]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === "banho" && (
            <p className="rounded-2xl bg-mint/40 px-3.5 py-3 text-[11px] leading-relaxed text-mint-foreground">
              Registre o horário do banho. Use as observações para guardar detalhes do momento.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="log-notes" className="text-xs font-semibold text-foreground/80">
              Observações{" "}
              <span className="font-normal text-muted-foreground">
                {type === "outro" ? "(obrigatório)" : "(opcional)"}
              </span>
            </Label>
            <Textarea
              id="log-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder={
                type === "outro"
                  ? "Descreva o cuidado registrado."
                  : "Ex.: aceitou bem, ficou sonolento depois."
              }
              className="min-h-[72px] resize-none rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
            />
          </div>

          {error && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              disabled={saving}
              className="h-11 w-full rounded-2xl text-sm font-semibold shadow-soft sm:w-auto sm:px-6"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Salvar registro
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-11 w-full rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
