import type { Exam } from "@/types/database";

/** Etapa do exame, derivada das datas informadas. */
export type ExamStage = "requested" | "scheduled" | "done";

export const examStageMeta: Record<ExamStage, { label: string; chip: string }> = {
  done: { label: "Resultado disponível", chip: "bg-mint/70 text-mint-foreground" },
  scheduled: { label: "Agendado", chip: "bg-lavender/70 text-lavender-foreground" },
  requested: { label: "Solicitado", chip: "bg-sun/80 text-sun-foreground" },
};

export function examStage(exam: Exam): ExamStage {
  if (exam.performed_date) return "done";
  if (exam.scheduled_date) return "scheduled";
  return "requested";
}

/** Data usada para ordenar e exibir o exame (realização > agendamento > solicitação). */
export function examSortDate(exam: Exam): string {
  return (
    exam.performed_date ??
    exam.scheduled_date ??
    exam.requested_date ??
    exam.created_at.slice(0, 10)
  );
}

export type ExamGroup<T extends Exam = Exam> = {
  key: string;
  name: string;
  exams: T[];
  latestDate: string;
  withResult: number;
  comparable: boolean;
};

/**
 * Agrupa exames com o mesmo nome (normalizado) para comparação de resultados.
 * Os grupos e os exames dentro deles ficam em ordem decrescente de data.
 */
export function groupExams<T extends Exam>(exams: readonly T[]): ExamGroup<T>[] {
  const buckets = new Map<string, T[]>();

  for (const exam of exams) {
    const key = exam.name.trim().toLowerCase();
    const current = buckets.get(key);
    if (current) {
      current.push(exam);
    } else {
      buckets.set(key, [exam]);
    }
  }

  const groups = [...buckets.entries()].map(([key, list]) => {
    const sorted = [...list].sort((a, b) => examSortDate(b).localeCompare(examSortDate(a)));
    return {
      key,
      name: sorted[0].name.trim(),
      exams: sorted,
      latestDate: examSortDate(sorted[0]),
      withResult: sorted.filter((exam) => Boolean(exam.result?.trim())).length,
      comparable: sorted.length > 1,
    };
  });

  return groups.sort((a, b) => {
    if (a.latestDate === b.latestDate) return a.name.localeCompare(b.name, "pt-BR");
    return b.latestDate.localeCompare(a.latestDate);
  });
}

/** Exames que ainda não têm resultado, usados no resumo da tela. */
export function pendingExams(exams: readonly Exam[]) {
  return exams.filter((exam) => !exam.result?.trim());
}
