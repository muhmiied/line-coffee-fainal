import { Eye } from "lucide-react";
import { VISITORS_DATA } from "@/lib/mock-data/admin/dashboard-mock";

export default function VisitorsCard() {
  const { total, guests, registered } = VISITORS_DATA;
  const guestPct = Math.round((guests / total) * 100);
  const regPct   = 100 - guestPct;

  return (
    <div className="admin-kpi-card flex flex-col gap-3 min-h-[130px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <p
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "var(--cream-dim)" }}
        >
          Visitors Today
        </p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(182,136,94,0.10)" }}
        >
          <Eye size={15} style={{ color: "var(--gold)" }} />
        </div>
      </div>

      {/* Total */}
      <div className="flex-1">
        <span
          className="text-[26px] font-bold leading-none tabular-nums"
          style={{ color: "var(--cream)" }}
        >
          {total}
        </span>
        <span className="ml-1.5 text-[12px]" style={{ color: "var(--cream-dim)" }}>
          sessions
        </span>
      </div>

      {/* Split */}
      <div className="flex flex-col gap-1.5">
        {/* Bar */}
        <div className="flex rounded-full overflow-hidden h-[5px]">
          <div
            style={{ width: `${guestPct}%`, background: "var(--gold)", opacity: 0.55 }}
          />
          <div
            style={{ width: `${regPct}%`, background: "#60a5fa" }}
          />
        </div>
        {/* Labels */}
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: "var(--cream-dim)" }}>
            <span className="font-semibold" style={{ color: "var(--cream)" }}>
              {guests}
            </span>{" "}
            guest
          </span>
          <span className="text-[11px]" style={{ color: "var(--cream-dim)" }}>
            <span className="font-semibold" style={{ color: "#60a5fa" }}>
              {registered}
            </span>{" "}
            member
          </span>
        </div>
      </div>
    </div>
  );
}
