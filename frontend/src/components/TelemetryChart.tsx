"use client";

import React, { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Activity, Zap, TrendingUp } from "lucide-react";

const chartData = [
  { day: "Mon", solves: 42, latency: 124, successRate: 98 },
  { day: "Tue", solves: 78, latency: 118, successRate: 99 },
  { day: "Wed", solves: 115, latency: 112, successRate: 97 },
  { day: "Thu", solves: 89, latency: 130, successRate: 100 },
  { day: "Fri", solves: 142, latency: 108, successRate: 99 },
  { day: "Sat", solves: 96, latency: 115, successRate: 100 },
  { day: "Sun", solves: 64, latency: 120, successRate: 98 },
];

const chartConfig = {
  solves: {
    label: "AI Solves",
    color: "#6366f1",
  },
  latency: {
    label: "Latency (ms)",
    color: "#a855f7",
  },
} satisfies ChartConfig;

export function TelemetryChart() {
  const [metric, setMetric] = useState<"solves" | "latency">("solves");

  return (
    <Card className="bg-zinc-950/80 border-white/[0.08] shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <CardTitle className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Telemetry &amp; Execution Analytics</span>
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400 mt-0.5">
            Real-time multi-file completions and sub-second judge compilation telemetry
          </CardDescription>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] rounded-lg border border-white/[0.08] text-xs">
          <button
            onClick={() => setMetric("solves")}
            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
              metric === "solves"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Solve Volume
          </button>
          <button
            onClick={() => setMetric("latency")}
            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
              metric === "latency"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Latency (ms)
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          {metric === "solves" ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#71717a", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#71717a", fontSize: 11 }}
              />
              <ChartTooltip
                cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                content={<ChartTooltipContent />}
              />
              <Bar
                dataKey="solves"
                fill="var(--color-solves)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#71717a", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#71717a", fontSize: 11 }}
                domain={[90, 150]}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="#a855f7"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#latencyGradient)"
              />
            </AreaChart>
          )}
        </ChartContainer>

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>99.2% Test Verification Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-zinc-500">Gemini 2.5 Flash</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">Avg 118ms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

