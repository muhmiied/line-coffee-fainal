import type { AdminOrderStatus } from "@/lib/admin/admin-orders";
import { ADMIN_ORDER_STATUS_LABELS } from "@/lib/admin/admin-orders";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

// Canonical order-status palette — warmed to the coffee dashboard, shared by
// every order-status display (dashboard cards, orders table, drawers, detail page).
export const ORDER_STATUS_STYLE: Record<
  AdminOrderStatus,
  { color: string; background: string; border: string }
> = {
  pending: {
    color: "#e3b673",
    background: "rgba(227,182,115,0.12)",
    border: "rgba(227,182,115,0.30)",
  },
  preparing: {
    color: "#8fb0d9",
    background: "rgba(143,176,217,0.12)",
    border: "rgba(143,176,217,0.30)",
  },
  shipped: {
    color: "#b79bd9",
    background: "rgba(183,155,217,0.12)",
    border: "rgba(183,155,217,0.30)",
  },
  delivered: {
    color: "#8fcf9a",
    background: "rgba(143,207,154,0.12)",
    border: "rgba(143,207,154,0.30)",
  },
  cancelled: {
    color: "#e39a8c",
    background: "rgba(227,154,140,0.12)",
    border: "rgba(227,154,140,0.30)",
  },
  returned: {
    color: "#c9b8a3",
    background: "rgba(201,184,163,0.12)",
    border: "rgba(201,184,163,0.28)",
  },
};

export default function OrderStatusBadge({
  status,
  size = "sm",
}: {
  status: AdminOrderStatus;
  size?: "sm" | "md";
}) {
  const { t } = useAdminLanguage();
  const style = ORDER_STATUS_STYLE[status];
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
        letterSpacing: "0.01em",
        padding: size === "md" ? "4px 10px" : "3px 8px",
        boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.06)",
      }}
    >
      {t(ADMIN_ORDER_STATUS_LABELS[status])}
    </span>
  );
}
