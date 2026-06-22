import { type LucideIcon } from "lucide-react";

interface AdminPlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
  items?: string[];
}

export default function AdminPlaceholder({
  icon: Icon,
  title,
  description,
  phase,
  items,
}: AdminPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon circle */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: "rgba(182,136,94,0.08)",
          border: "1px solid rgba(182,136,94,0.15)",
        }}
      >
        <Icon size={28} style={{ color: "var(--gold)" }} />
      </div>

      {/* Phase badge */}
      <span
        className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest mb-3"
        style={{
          background: "rgba(182,136,94,0.08)",
          color: "var(--gold)",
          border: "1px solid rgba(182,136,94,0.14)",
        }}
      >
        {phase}
      </span>

      <h1
        className="text-2xl font-semibold mb-2"
        style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
      >
        {title}
      </h1>
      <p
        className="text-sm max-w-sm leading-relaxed mb-6"
        style={{ color: "var(--cream-dim)" }}
      >
        {description}
      </p>

      {/* Feature preview list */}
      {items && items.length > 0 && (
        <div
          className="admin-surface px-6 py-4 max-w-sm w-full text-left"
          style={{ borderRadius: "0.875rem" }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--gold)", opacity: 0.75 }}
          >
            Will include
          </p>
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-[13px]"
                style={{ color: "var(--cream-dim)" }}
              >
                <span
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background: "var(--gold)" }}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
