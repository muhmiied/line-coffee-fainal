import type { OrderStatus } from "@/lib/mock-data/admin/orders-mock";

const STATUS_STYLE: Record<OrderStatus, { bg: string; text: string }> = {
  New:       { bg: "rgba(251,191,36,0.14)",  text: "#fbbf24" },
  Preparing: { bg: "rgba(96,165,250,0.14)",  text: "#60a5fa" },
  Shipped:   { bg: "rgba(167,139,250,0.14)", text: "#a78bfa" },
  Delivered: { bg: "rgba(74,222,128,0.14)",  text: "#4ade80" },
  Cancelled: { bg: "rgba(239,68,68,0.14)",   text: "#ef4444" },
  Returned:  { bg: "rgba(156,163,175,0.14)", text: "#9ca3af" },
};

export default function OrderStatusBadge({
  status,
  size = "sm",
}: {
  status: OrderStatus;
  size?: "sm" | "md";
}) {
  const { bg, text } = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${
        size === "md" ? "px-3 py-1 text-[13px]" : "px-2 py-0.5 text-[11px]"
      }`}
      style={{ background: bg, color: text }}
    >
      {status}
    </span>
  );
}
