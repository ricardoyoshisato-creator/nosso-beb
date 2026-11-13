import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";

import { growthChartData, growthMetricMeta } from "@/lib/growth";
import type { GrowthMetric } from "@/lib/growth";
import { cn } from "@/lib/utils";
import type { GrowthRecord } from "@/types/database";

/** Gráfico de linha das medidas do bebê (peso em kg, altura e perímetro em cm). */
export function GrowthChart({ records }: { records: GrowthRecord[] }) {
  const [visible, setVisible] = useState<GrowthMetric[]>(["weight", "height"]);

  const data = useMemo(() => growthChartData(records), [records]);

  const toggle = (metric: GrowthMetric) => {
    setVisible((current) => {
      if (current.includes(metric)) {
        // Mantém sempre pelo menos uma linha visível.
        return current.length === 1 ? current : current.filter((item) => item !== metric);
      }
      return [...current, metric];
    });
  };

  const showWeight = visible.includes("weight");
  const showCentimeters = visible.includes("height") || visible.includes("head");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {growthMetricMeta.map((meta) => {
          const active = visible.includes(meta.key);

          return (
            <button
              key={meta.key}
              type="button"
              onClick={() => toggle(meta.key)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                active
                  ? "border-border bg-card text-foreground shadow-soft"
                  : "border-border/70 bg-muted/60 text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: active ? meta.color : "hsl(28 15% 75%)" }}
              />
              {meta.shortLabel}
            </button>
          );
        })}
      </div>

      {data.length < 2 && (
        <p className="flex items-center gap-1.5 rounded-2xl bg-muted/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <LineChartIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
          Registre pelo menos duas medições para ver a linha do crescimento evoluir.
        </p>
      )}

      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EFE4DB" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#8C7B71" }}
              tickLine={false}
              axisLine={{ stroke: "#EFE4DB" }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            {showWeight && (
              <YAxis
                yAxisId="kg"
                tick={{ fontSize: 10, fill: "#8C7B71" }}
                tickLine={false}
                axisLine={false}
                width={44}
                domain={["auto", "auto"]}
                tickFormatter={(value: number) => `${value}`}
              />
            )}
            {showCentimeters && (
              <YAxis
                yAxisId="cm"
                orientation="right"
                tick={{ fontSize: 10, fill: "#8C7B71" }}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={["auto", "auto"]}
              />
            )}
            <Tooltip
              contentStyle={{
                borderRadius: 16,
                border: "1px solid #EFE4DB",
                fontSize: 12,
                boxShadow: "0 18px 40px -26px rgba(90, 60, 45, 0.35)",
              }}
              labelStyle={{ color: "#6C5B52", fontWeight: 600 }}
            />
            {growthMetricMeta.map((meta) =>
              visible.includes(meta.key) ? (
                <Line
                  key={meta.key}
                  yAxisId={meta.unit === "kg" ? "kg" : "cm"}
                  type="monotone"
                  dataKey={meta.key}
                  name={meta.shortLabel}
                  unit={` ${meta.unit}`}
                  stroke={meta.color}
                  strokeWidth={2.4}
                  dot={{ r: 3, strokeWidth: 0, fill: meta.color }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ) : null,
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
