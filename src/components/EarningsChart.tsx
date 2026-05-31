import React, { useMemo, memo } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Transaction } from "@/types/database";

interface EarningsChartProps {
  transactions: Transaction[];
}

const EarningsChart = memo(function EarningsChart({ transactions }: EarningsChartProps) {
  // Memoize the chart data calculation to prevent expensive re-computations and DOM updates on every re-render
  // Recharts components are computationally expensive, so we only want to derive the data when 'transactions' reference changes.
  const chartData = useMemo(() => {
    // Group transactions by month
    const monthlyData: Record<string, { credits: number; debits: number }> = {};

    transactions.forEach((tx) => {
      const date = new Date(tx.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[key]) monthlyData[key] = { credits: 0, debits: 0 };
      if (tx.type === "credit") monthlyData[key].credits += tx.amount;
      else if (tx.type === "debit") monthlyData[key].debits += tx.amount;
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short" }),
        earnings: data.credits,
        spent: data.debits,
      }));
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-3">Earnings Overview</h3>
        <p className="text-sm text-muted-foreground">No transaction data yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Earnings Overview</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="spent" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});

export default EarningsChart;
