type DashboardMetricCardProps = {
  label: string;
  value: string;
  delta?: string;
};

export function DashboardMetricCard({ label, value, delta }: DashboardMetricCardProps) {
  return (
    <div className="rounded border p-4">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="mt-2 flex items-end justify-between gap-3">
        <strong className="text-3xl font-semibold">{value}</strong>
        {delta ? <span className="text-sm">{delta}</span> : null}
      </div>
    </div>
  );
}
