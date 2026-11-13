import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

import { formatCents } from "@/lib/expenses";
import type { ReportCategoryTotal } from "@/lib/reports";

type ExpenseCategoryChartProps = {
  categories: ReportCategoryTotal[];
  totalCents: number;
};

/** Rosca dos gastos por categoria com legenda de valores e participação. */
export function ExpenseCategoryChart({ categories, totalCents }: ExpenseCategoryChartProps) {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
        <PieChartIcon className="h-6 w-6 text-primary" />
        <p className="mt-2 text-xs font-semibold text-foreground">Sem gastos no período</p>
        <p className="mt-1 max-w-[16rem] text-[11px] leading-relaxed text-muted-foreground">
          Registre despesas no Financeiro para ver a distribuição por categoria aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative mx-auto h-52 w-full max-w-[19rem]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categories}
              dataKey="cents"
              nameKey="label"
              innerRadius="62%"
              outerRadius="94%"
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
            >
              {categories.map((category) => (
                <Cell key={category.category} fill={category.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCents(value)}
              contentStyle={{
                borderRadius: 16,
                border: "1px solid hsl(var(--border))",
                fontSize: 12,
                boxShadow: "0 18px 40px -26px rgba(90, 60, 45, 0.35)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Total
          </span>
          <span className="mt-0.5 font-display text-lg font-semibold text-foreground">
            {formatCents(totalCents)}
          </span>
        </div>
      </div>

      <ul className="space-y-2">
        {categories.map((category) => (
          <li key={category.category} className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">
                {category.label}
              </span>
              <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                {Math.round(category.share * 100)}%
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-foreground">
                {formatCents(category.cents)}
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(3, Math.round(category.share * 100))}%`,
                  backgroundColor: category.color,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
