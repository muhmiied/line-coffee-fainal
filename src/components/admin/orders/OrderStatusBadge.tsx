import type { AdminOrderStatus } from "@/lib/admin/admin-orders";
import { ADMIN_ORDER_STATUS_LABELS } from "@/lib/admin/admin-orders";

const STATUS_STYLE: Record<
  AdminOrderStatus,
  { color: string; background: string; border: string }
> = {
  pending: {
    color: "#fbbf24",
    background: "rgba(251,191,36,0.10)",
    border: "rgba(251,191,36,0.24)",
  },
  preparing: {
    color: "#60a5fa",
    background: "rgba(96,165,250,0.10)",
    border: "rgba(96,165,250,0.24)",
  },
  shipped: {
    color: "#a78bfa",
    background: "rgba(167,139,250,0.10)",
    border: "rgba(167,139,250,0.24)",
  },
  delivered: {
    color: "#4ade80",
    background: "rgba(74,222,128,0.10)",
    border: "rgba(74,222,128,0.24)",
  },
  cancelled: {
    color: "#f87171",
    background: "rgba(248,113,113,0.10)",
    border: "rgba(248,113,113,0.24)",
  },
  returned: {
    color: "#c4b5a7",
    background: "rgba(196,181,167,0.09)",
    border: "rgba(196,181,167,0.20)",
  },
};

export default function OrderStatusBadge({
  status,
  size = "sm",
}: {
  status: AdminOrderStatus;
  size?: "sm" | "md";
}) {
  const style = STATUS_STYLE[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.color,
        fontSize: size === "md" ? 12 : 10.5,
        fontWeight: 700,
        padding: size === "md" ? "4px 10px" : "3px 8px",
      }}
    >
      {ADMIN_ORDER_STATUS_LABELS[status]}
    </span>
  );
}
