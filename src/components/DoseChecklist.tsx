import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";

import { doseStatusMeta } from "@/lib/medications";
import type { DoseSlot } from "@/lib/medications";
import type { DoseStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type MarkableStatus = Exclude<DoseStatus, "pending">;

const markOptions: { status: MarkableStatus; label: string; activeClass: string }[] = [
  { status: "taken", label: "Tomada", activeClass: "bg-mint text-mint-foreground border-mint" },
  { status: "late", label: "Atrasada", activeClass: "bg-sun text-sun-foreground border-sun" },
  {
    status: "missed",
    label: "Não tomada",
    activeClass: "bg-destructive text-destructive-foreground border-destructive",
  },
];

type DoseChecklistProps = {
  slots: DoseSlot[];
  canMark: boolean;
  markingKey: string | null;
  nameFor: (userId: string | null) => string;
  onMark: (slot: DoseSlot, status: MarkableStatus) => void;
};

export function DoseChecklist({
  slots,
  canMark,
  markingKey,
  nameFor,
  onMark,
}: DoseChecklistProps) {
  return (
    <ul className="space-y-2.5">
      {slots.map((slot) => {
        const meta = doseStatusMeta[slot.status];
        const isMarking = markingKey === slot.key;
        // Dose com horário vencido e sem registro não é "atrasada": está sem confirmação.
        const chipLabel = !slot.recorded && slot.status === "late" ? "Sem registro" : meta.label;

        return (
          <li
            key={slot.key}
            className="rounded-3xl border border-border/60 bg-background/70 p-3.5 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                <span className="font-display text-[11px] font-semibold leading-none">
                  {slot.time}
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-foreground">
                  {slot.medication.name}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {slot.medication.dosage} {slot.medication.dosage_unit}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {slot.recorded && slot.dose?.confirmed_at
                    ? `Registrado por ${nameFor(slot.dose.confirmed_by)} às ${format(
                        parseISO(slot.dose.confirmed_at),
                        "HH:mm",
                      )}`
                    : slot.status === "late"
                      ? "Horário passou sem registro"
                      : "Aguardando registro"}
                </p>
              </div>

              {isMarking ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    meta.chip,
                  )}
                >
                  {chipLabel}
                </span>
              )}
            </div>

            {canMark && (
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {markOptions.map((option) => {
                  const active = slot.recorded && slot.dose?.status === option.status;
                  return (
                    <button
                      key={option.status}
                      type="button"
                      disabled={isMarking}
                      onClick={() => onMark(slot, option.status)}
                      className={cn(
                        "inline-flex h-9 items-center justify-center gap-1 rounded-xl border text-[11px] font-semibold transition-colors disabled:opacity-60",
                        active
                          ? option.activeClass
                          : "border-border bg-card text-foreground/70 hover:bg-muted",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
