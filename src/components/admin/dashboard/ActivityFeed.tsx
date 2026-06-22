import { ACTIVITY_FEED, type ActivityType } from "@/lib/mock-data/admin/dashboard-mock";

const DOT_COLOR: Record<ActivityType, string> = {
  order:     "var(--gold)",
  inventory: "#60a5fa",
  marketing: "#4ade80",
  customer:  "var(--cream-dim)",
  alert:     "#ef4444",
};

const DOT_BG: Record<ActivityType, string> = {
  order:     "rgba(182,136,94,0.15)",
  inventory: "rgba(96,165,250,0.15)",
  marketing: "rgba(74,222,128,0.15)",
  customer:  "rgba(181,155,133,0.15)",
  alert:     "rgba(239,68,68,0.15)",
};

export default function ActivityFeed() {
  return (
    <div className="admin-surface p-5">
      <p
        className="text-sm font-semibold mb-5"
        style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
      >
        Activity Feed
      </p>

      <div className="flex flex-col gap-0">
        {ACTIVITY_FEED.map((entry, i) => {
          const isLast = i === ACTIVITY_FEED.length - 1;
          return (
            <div key={entry.id} className="flex gap-3.5">
              {/* Timeline left column */}
              <div className="flex flex-col items-center flex-shrink-0">
                {/* Dot */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                  style={{ background: DOT_BG[entry.type] }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: DOT_COLOR[entry.type] }}
                  />
                </div>
                {/* Connecting line */}
                {!isLast && (
                  <div
                    className="w-px flex-1 my-1"
                    style={{ background: "rgba(182,136,94,0.10)", minHeight: 20 }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 flex items-start justify-between gap-3 pb-4 ${isLast ? "pb-0" : ""}`}>
                <p
                  className="text-[12.5px] leading-relaxed"
                  style={{ color: "var(--cream-dim)" }}
                >
                  {entry.action}
                </p>
                <span
                  className="text-[11px] whitespace-nowrap flex-shrink-0 mt-0.5"
                  style={{ color: "var(--cream-dim)", opacity: 0.45 }}
                >
                  {entry.time}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
