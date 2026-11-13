import { format, parseISO } from "date-fns";

import { categoryLabel, formatCents } from "@/lib/expenses";
import { expensesInPeriod, formatPeriod } from "@/lib/reports";
import type { ReportPeriod, ReportSummary } from "@/lib/reports";
import type { Expense } from "@/types/database";

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Centavos para o formato numérico do Excel em português ("1.234,56"). */
function csvCents(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Planilha com o histórico detalhado das despesas do período (uma linha por
 * lançamento + total). Separador ";" e BOM para abrir direto no Excel pt-BR.
 */
export function buildExpensesCsv(expenses: readonly Expense[], period: ReportPeriod) {
  const rows = expensesInPeriod(expenses, period);

  const header = [
    "Data",
    "Produto/Serviço",
    "Categoria",
    "Valor (R$)",
    "Loja",
    "Quem pagou",
    "Descrição",
    "Observações",
  ];

  const lines = [header.map(csvCell).join(";")];

  for (const expense of rows) {
    lines.push(
      [
        format(parseISO(expense.expense_date), "dd/MM/yyyy"),
        expense.name,
        categoryLabel(expense.category),
        csvCents(expense.amount_cents),
        expense.store ?? "",
        expense.paid_by ?? "",
        expense.description ?? "",
        expense.notes ?? "",
      ]
        .map(csvCell)
        .join(";"),
    );
  }

  const totalCents = rows.reduce((total, expense) => total + expense.amount_cents, 0);

  lines.push("");
  lines.push(
    [
      "TOTAL",
      `${rows.length} ${rows.length === 1 ? "lançamento" : "lançamentos"}`,
      "",
      csvCents(totalCents),
      "",
      "",
      "",
      "",
    ]
      .map(csvCell)
      .join(";"),
  );

  return lines.join("\r\n");
}

/** Baixa um arquivo de texto (CSV) no navegador. */
export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** jsPDF usa as fontes padrão (Latin-1): troca a tipografia "bonita" por ASCII. */
function pdfText(value: string) {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[^\u0000-\u00FF]/g, "?");
}

type PdfOptions = {
  familyName: string;
  babyName?: string | null;
};

/**
 * Gera o PDF do resumo do período com jsPDF (carregado sob demanda para não
 * pesar no bundle inicial). O documento traz saúde, financeiro e rotina do bebê.
 */
export async function downloadReportPdf(summary: ReportSummary, options: PdfOptions) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const ink = "#3F3129";
  const muted = "#8C7B71";
  const accent = "#E07A62";
  const line = "#EFE4DB";
  const soft = "#FBF3EE";
  const mint = "#4F8F7F";
  const lavender = "#8E7AB5";

  const left = 16;
  const right = 194;
  const contentWidth = right - left;
  let y = 0;

  doc.setFont("helvetica", "normal");

  // Cabeçalho
  doc.setFillColor(soft);
  doc.roundedRect(left, 14, contentWidth, 32, 4, 4, "F");
  doc.setFillColor(accent);
  doc.roundedRect(left, 14, 3, 32, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(ink);
  doc.text(pdfText("Relatório do período"), left + 9, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(muted);
  const subtitle = options.babyName
    ? `${options.familyName} | Bebe: ${options.babyName}`
    : options.familyName;
  doc.text(pdfText(subtitle), left + 9, 32);
  doc.text(pdfText(formatPeriod(summary.period)), left + 9, 37);

  doc.setFontSize(8);
  doc.text(
    pdfText(
      `${summary.days} ${summary.days === 1 ? "dia" : "dias"} | gerado em ${format(
        new Date(),
        "dd/MM/yyyy 'as' HH:mm",
      )}`,
    ),
    right - 4,
    25,
    { align: "right" },
  );

  y = 56;

  const ensure = (needed: number) => {
    if (y + needed > 274) {
      doc.addPage();
      y = 22;
    }
  };

  const section = (title: string, color: string) => {
    ensure(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(color);
    doc.text(pdfText(title.toUpperCase()), left, y);
    doc.setDrawColor(line);
    doc.setLineWidth(0.3);
    doc.line(left, y + 2.5, right, y + 2.5);
    y += 9;
  };

  const row = (label: string, value: string, note?: string) => {
    ensure(9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(ink);
    doc.text(pdfText(label), left, y);

    if (note) {
      doc.setFontSize(7.5);
      doc.setTextColor(muted);
      doc.text(pdfText(note), left, y + 3.2);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(ink);
    doc.text(pdfText(value), right, y, { align: "right" });

    y += note ? 8 : 6.5;
  };

  // Gestação / Saúde
  section("Gestação e saúde", lavender);
  row(
    "Consultas realizadas",
    String(summary.health.consultationsDone),
    `${summary.health.consultationsScheduled} agendada(s) e ${summary.health.consultationsCanceled} cancelada(s) no período`,
  );
  row("Exames pendentes (sem resultado)", String(summary.health.pendingExams));
  row("Exames com resultado", String(summary.health.examsWithResult));
  row(
    "Medicamentos registrados",
    String(summary.health.medications),
    `${summary.health.medicationsActive} em uso durante o período`,
  );

  y += 3;

  // Financeiro
  section("Financeiro", accent);

  ensure(18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(muted);
  doc.text(pdfText("Total gasto no período"), left, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(ink);
  doc.text(pdfText(formatCents(summary.finance.totalCents)), left, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted);
  doc.text(
    pdfText(
      `${summary.finance.expenseCount} ${
        summary.finance.expenseCount === 1 ? "lançamento" : "lançamentos"
      }`,
    ),
    right,
    y + 2,
    { align: "right" },
  );
  doc.text(
    pdfText(`média ${formatCents(summary.finance.averagePerDayCents)} por dia`),
    right,
    y + 6.5,
    {
      align: "right",
    },
  );
  y += 15;

  if (summary.finance.categories.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(ink);
    doc.text(pdfText("Gastos por categoria"), left, y);
    y += 6;

    for (const category of summary.finance.categories) {
      ensure(12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(ink);
      doc.text(pdfText(category.label), left, y);

      doc.setTextColor(muted);
      doc.text(`${Math.round(category.share * 100)}%`, right - 26, y, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(ink);
      doc.text(pdfText(formatCents(category.cents)), right, y, { align: "right" });

      // Barra de participação: fundo claro + trecho colorido da categoria.
      doc.setFillColor(soft);
      doc.roundedRect(left, y + 2, contentWidth, 1.8, 0.9, 0.9, "F");

      const rgb = hexToRgb(category.color);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.roundedRect(left, y + 2, Math.max(0.8, contentWidth * category.share), 1.8, 0.9, 0.9, "F");

      y += 8;
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(muted);
    doc.text(pdfText("Nenhuma despesa registrada no período."), left, y);
    y += 8;
  }

  y += 3;

  // Bebê
  section("Rotina do bebê", mint);
  row("Trocas de fralda", String(summary.baby.diapers));
  row("Mamadeiras", String(summary.baby.bottles));
  row("Banhos", String(summary.baby.baths));
  row("Vacinas aplicadas", String(summary.baby.vaccines));
  row("Amamentações", String(summary.baby.breastfeedings));
  row("Registros de sono", String(summary.baby.sleep));

  ensure(18);
  y += 4;
  doc.setDrawColor(line);
  doc.line(left, y, right, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(muted);
  doc.text(
    pdfText(
      "Relatório gerado pelo app da família. Os dados seguem as permissões de acesso (RLS) da família.",
    ),
    left,
    y,
  );

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(7.5);
    doc.setTextColor(muted);
    doc.text(`${page}/${pageCount}`, right, 288, { align: "right" });
  }

  doc.save(`relatorio-${summary.period.from}-a-${summary.period.to}.pdf`);
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}
