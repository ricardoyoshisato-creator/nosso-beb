import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Baby,
  Bath,
  CalendarRange,
  Droplets,
  FileDown,
  FileSpreadsheet,
  FlaskConical,
  HeartPulse,
  Loader2,
  Milk,
  Pill,
  Sparkles,
  Stethoscope,
  Syringe,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CreateFamilyCard } from "@/components/CreateFamilyCard";
import { ExpenseCategoryChart } from "@/components/ExpenseCategoryChart";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFamily } from "@/contexts/FamilyContext";
import { useReportData } from "@/hooks/useReportData";
import { useToast } from "@/hooks/use-toast";
import { formatCents } from "@/lib/expenses";
import { buildExpensesCsv, downloadReportPdf, downloadTextFile } from "@/lib/reportExports";
import {
  buildReportSummary,
  defaultReportPeriod,
  formatPeriod,
  reportFileBase,
  reportPresets,
} from "@/lib/reports";
import type { ReportPeriod } from "@/lib/reports";
import { cn } from "@/lib/utils";

const labelClass = "text-[11px] font-semibold text-foreground/70";
const fieldClass =
  "h-11 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40";

type StatTone = "lavender" | "mint" | "sun" | "sky" | "rose" | "clay" | "primary";

const toneClass: Record<StatTone, string> = {
  lavender: "bg-lavender/60 text-lavender-foreground",
  mint: "bg-mint/60 text-mint-foreground",
  sun: "bg-sun/70 text-sun-foreground",
  sky: "bg-sky/60 text-sky-foreground",
  rose: "bg-rose/70 text-rose-foreground",
  clay: "bg-clay/60 text-clay-foreground",
  primary: "bg-primary/15 text-primary",
};

function StatTile({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  note?: string;
  tone: StatTone;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-3">
      <span className={cn("grid h-8 w-8 place-items-center rounded-xl", toneClass[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 font-display text-xl font-semibold leading-none text-foreground">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold leading-tight text-foreground/80">{label}</p>
      {note && <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{note}</p>}
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  description,
  tone,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone: StatTone;
  children: ReactNode;
}) {
  return (
    <section className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
      <div className="flex items-start gap-2.5">
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-2xl", toneClass[tone])}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold leading-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      <div className="mt-3.5">{children}</div>
    </section>
  );
}

const Reports = () => {
  const { toast } = useToast();
  const { family, loading, babyProfile } = useFamily();

  const [period, setPeriod] = useState<ReportPeriod>(() => defaultReportPeriod());
  const [exportingPdf, setExportingPdf] = useState(false);

  // Busca o período direto no banco (sessão + RLS), sem o limite do contexto.
  const {
    appointments,
    exams,
    medications,
    expenses,
    babyLogs,
    vaccines,
    loading: reportLoading,
    loaded: reportLoaded,
    error: reportError,
  } = useReportData(family?.id ?? null, period);

  const presets = useMemo(() => reportPresets(), []);
  const activePreset =
    presets.find((preset) => preset.from === period.from && preset.to === period.to)?.key ?? null;

  const summary = useMemo(
    () =>
      buildReportSummary(period, {
        appointments,
        exams,
        medications,
        expenses,
        babyLogs,
        vaccines,
      }),
    [period, appointments, exams, medications, expenses, babyLogs, vaccines],
  );

  const updateFrom = (value: string) => {
    setPeriod((current) => ({
      from: value,
      // Mantém o intervalo válido: o início nunca fica depois do fim.
      to: value && current.to && value > current.to ? value : current.to,
    }));
  };

  const updateTo = (value: string) => {
    setPeriod((current) => ({
      from: current.from && value && current.from > value ? value : current.from,
      to: value,
    }));
  };

  const handleExportCsv = () => {
    const csv = buildExpensesCsv(expenses, period);
    downloadTextFile(`${reportFileBase("despesas", period)}.csv`, csv);

    toast({
      title: "Planilha exportada",
      description:
        summary.finance.expenseCount === 0
          ? "O arquivo foi baixado, mas não há despesas neste período."
          : `${summary.finance.expenseCount} ${
              summary.finance.expenseCount === 1 ? "despesa" : "despesas"
            } do período, prontas para abrir no Excel.`,
    });
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);

    try {
      await downloadReportPdf(summary, {
        familyName: family?.name ?? "Família",
        babyName: babyProfile?.name ?? family?.baby_name ?? null,
      });

      toast({
        title: "Relatório em PDF gerado",
        description: `Resumo de ${formatPeriod(summary.period)} baixado em PDF.`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Não foi possível gerar o PDF",
        description: "Tente novamente em instantes.",
      });
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Preparando os relatórios…</p>
      </div>
    );
  }

  if (!family) {
    return <CreateFamilyCard />;
  }

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Relatórios"
        title="Relatórios do período"
        description="Escolha o intervalo e veja o resumo de saúde, gastos e rotina do bebê — pronto para exportar em PDF ou planilha."
      />

      {/* Seletor de período */}
      <section className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <CalendarRange className="h-3.5 w-3.5" />
            Período
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-foreground/70">
            {reportLoading && reportLoaded && <Loader2 className="h-3 w-3 animate-spin" />}
            {summary.days} {summary.days === 1 ? "dia" : "dias"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <Label htmlFor="report-from" className={labelClass}>
              Data de início
            </Label>
            <Input
              id="report-from"
              type="date"
              value={period.from}
              max={period.to || undefined}
              onChange={(event) => updateFrom(event.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-to" className={labelClass}>
              Data de fim
            </Label>
            <Input
              id="report-to"
              type="date"
              value={period.to}
              min={period.from || undefined}
              onChange={(event) => updateTo(event.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const active = activePreset === preset.key;

            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => setPeriod({ from: preset.from, to: preset.to })}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {formatPeriod(summary.period)}
        </p>
      </section>

      {reportError && (
        <p className="rounded-2xl bg-destructive/10 px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-destructive">
          Não foi possível carregar todos os dados do período: {reportError}
        </p>
      )}

      {!reportLoaded ? (
        <div className="flex flex-col items-center rounded-4xl border border-dashed border-border bg-card/60 px-5 py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            Montando o resumo do período…
          </p>
        </div>
      ) : (
        <>
      {/* Destaque do período */}
      <section className="animate-rise relative overflow-hidden rounded-4xl bg-[hsl(20,32%,24%)] p-5 text-primary-foreground shadow-soft sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/35" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-lavender/25" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
            <Sparkles className="h-3 w-3" />
            Resumo do período
          </span>

          <p className="mt-3 text-[11px] font-medium text-primary-foreground/80">
            Total gasto no período
          </p>
          <p className="font-display text-3xl font-semibold leading-none">
            {formatCents(summary.finance.totalCents)}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-card/15 px-2 py-2 backdrop-blur">
              <p className="font-display text-base font-semibold leading-none">
                {summary.health.consultationsDone}
              </p>
              <p className="mt-1 text-[9.5px] font-medium leading-tight text-primary-foreground/80">
                consultas realizadas
              </p>
            </div>
            <div className="rounded-2xl bg-card/15 px-2 py-2 backdrop-blur">
              <p className="font-display text-base font-semibold leading-none">
                {summary.health.pendingExams}
              </p>
              <p className="mt-1 text-[9.5px] font-medium leading-tight text-primary-foreground/80">
                exames pendentes
              </p>
            </div>
            <div className="rounded-2xl bg-card/15 px-2 py-2 backdrop-blur">
              <p className="font-display text-base font-semibold leading-none">
                {summary.baby.totalLogs}
              </p>
              <p className="mt-1 text-[9.5px] font-medium leading-tight text-primary-foreground/80">
                registros do bebê
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Saúde */}
      <Panel
        icon={HeartPulse}
        title="Gestação e saúde"
        description="Consultas, exames e medicamentos do período."
        tone="lavender"
      >
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            icon={Stethoscope}
            label="Consultas realizadas"
            value={summary.health.consultationsDone}
            tone="lavender"
          />
          <StatTile
            icon={FlaskConical}
            label="Exames pendentes"
            value={summary.health.pendingExams}
            note={`${summary.health.examsWithResult} com resultado`}
            tone="sun"
          />
          <StatTile
            icon={Pill}
            label="Medicamentos"
            value={summary.health.medications}
            note={`${summary.health.medicationsActive} em uso`}
            tone="mint"
          />
        </div>

        <p className="mt-3 rounded-2xl bg-muted/50 px-3 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
          {summary.health.consultationsScheduled}{" "}
          {summary.health.consultationsScheduled === 1 ? "consulta agendada" : "consultas agendadas"}{" "}
          e {summary.health.consultationsCanceled}{" "}
          {summary.health.consultationsCanceled === 1 ? "cancelada" : "canceladas"} no período.
        </p>
      </Panel>

      {/* Financeiro */}
      <Panel
        icon={Wallet}
        title="Financeiro"
        description="Gastos por categoria no período selecionado."
        tone="primary"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Total gasto
            </p>
            <p className="font-display text-2xl font-semibold leading-tight text-foreground">
              {formatCents(summary.finance.totalCents)}
            </p>
          </div>
          <p className="pb-1 text-right text-[10px] leading-snug text-muted-foreground">
            {summary.finance.expenseCount}{" "}
            {summary.finance.expenseCount === 1 ? "lançamento" : "lançamentos"}
            <br />
            média de {formatCents(summary.finance.averagePerDayCents)}/dia
          </p>
        </div>

        <div className="mt-3">
          <ExpenseCategoryChart
            categories={summary.finance.categories}
            totalCents={summary.finance.totalCents}
          />
        </div>
      </Panel>

      {/* Bebê */}
      <Panel
        icon={Baby}
        title="Bebê"
        description="Cuidados registrados na rotina e vacinas aplicadas."
        tone="rose"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            icon={Droplets}
            label="Trocas de fralda"
            value={summary.baby.diapers}
            tone="sun"
          />
          <StatTile icon={Milk} label="Mamadeiras" value={summary.baby.bottles} tone="sky" />
          <StatTile icon={Bath} label="Banhos" value={summary.baby.baths} tone="mint" />
          <StatTile
            icon={Syringe}
            label="Vacinas aplicadas"
            value={summary.baby.vaccines}
            tone="rose"
          />
        </div>

        <p className="mt-3 rounded-2xl bg-muted/50 px-3 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
          Também no período: {summary.baby.breastfeedings}{" "}
          {summary.baby.breastfeedings === 1 ? "amamentação" : "amamentações"} e{" "}
          {summary.baby.sleep} {summary.baby.sleep === 1 ? "registro de sono" : "registros de sono"}.
        </p>
      </Panel>

      {/* Exportações */}
      <section className="animate-rise rounded-4xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <FileDown className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold leading-tight text-foreground">
              Exportar
            </h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Baixe o resumo em PDF ou o histórico detalhado de despesas em CSV.
            </p>
          </div>
        </div>

        <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={exportingPdf}
            className="h-11 w-full rounded-2xl text-sm font-semibold shadow-soft sm:flex-1"
          >
            {exportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Exportar relatório (PDF)
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            className="h-11 w-full rounded-2xl border-border bg-background text-sm font-semibold hover:bg-muted sm:flex-1"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar dados (CSV)
          </Button>
        </div>

        <p className="mt-2.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          O CSV traz todas as despesas do período (data, item, categoria, valor, loja e quem pagou) e
          abre direto no Excel. Os dados seguem as permissões de acesso da sua família.
        </p>
      </section>
        </>
      )}
    </div>
  );
};

export default Reports;
