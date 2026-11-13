import { useEffect, useState } from "react";
import { endOfDay, parseISO, startOfDay } from "date-fns";

import { normalizePeriod } from "@/lib/reports";
import type { ReportPeriod } from "@/lib/reports";
import { supabase } from "@/lib/supabase";
import type {
  Appointment,
  BabyLog,
  Exam,
  Expense,
  Medication,
  Vaccine,
} from "@/types/database";

export type ReportSources = {
  appointments: Appointment[];
  exams: Exam[];
  medications: Medication[];
  expenses: Expense[];
  babyLogs: BabyLog[];
  vaccines: Vaccine[];
};

const emptySources: ReportSources = {
  appointments: [],
  exams: [],
  medications: [],
  expenses: [],
  babyLogs: [],
  vaccines: [],
};

/**
 * Dados do relatório buscados direto do banco para o período escolhido.
 *
 * As consultas usam a sessão do usuário logado, então o RLS continua sendo a
 * autorização: só voltam as linhas da família ativa. O filtro por `family_id` é
 * redundante de propósito. Consultas, despesas e diário são filtrados no banco
 * pelo intervalo (o diário não tem limite de 300 linhas como no contexto);
 * exames, medicamentos e vacinas são poucos e vêm completos para o resumo.
 */
export function useReportData(familyId: string | null, period: ReportPeriod) {
  const [sources, setSources] = useState<ReportSources>(emptySources);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = period.from;
  const to = period.to;

  useEffect(() => {
    if (!familyId || !from || !to) {
      setSources(emptySources);
      setLoading(false);
      return;
    }

    let active = true;
    const { from: start, to: end } = normalizePeriod({ from, to });
    const fromISO = startOfDay(parseISO(start)).toISOString();
    const toISO = endOfDay(parseISO(end)).toISOString();

    setLoading(true);
    setError(null);

    void (async () => {
      const [appointmentsRes, examsRes, medicationsRes, expensesRes, babyLogsRes, vaccinesRes] =
        await Promise.all([
          supabase
            .from("appointments")
            .select("*")
            .eq("family_id", familyId)
            .gte("scheduled_at", fromISO)
            .lte("scheduled_at", toISO),
          supabase.from("exams").select("*").eq("family_id", familyId),
          supabase.from("medications").select("*").eq("family_id", familyId),
          supabase
            .from("expenses")
            .select("*")
            .eq("family_id", familyId)
            .gte("expense_date", start)
            .lte("expense_date", end),
          supabase
            .from("baby_logs")
            .select("*")
            .eq("family_id", familyId)
            .gte("logged_at", fromISO)
            .lte("logged_at", toISO),
          supabase.from("vaccines").select("*").eq("family_id", familyId),
        ]);

      if (!active) return;

      const firstError =
        appointmentsRes.error ||
        examsRes.error ||
        medicationsRes.error ||
        expensesRes.error ||
        babyLogsRes.error ||
        vaccinesRes.error;

      setError(firstError?.message ?? null);
      setSources({
        appointments: (appointmentsRes.data ?? []) as Appointment[],
        exams: (examsRes.data ?? []) as Exam[],
        medications: (medicationsRes.data ?? []) as Medication[],
        expenses: (expensesRes.data ?? []) as Expense[],
        babyLogs: (babyLogsRes.data ?? []) as BabyLog[],
        vaccines: (vaccinesRes.data ?? []) as Vaccine[],
      });
      setLoading(false);
      setLoaded(true);
    })();

    return () => {
      active = false;
    };
  }, [familyId, from, to]);

  return { ...sources, loading, loaded, error };
}
