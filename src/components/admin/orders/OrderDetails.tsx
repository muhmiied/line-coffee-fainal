import { ExternalLink, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import {
  ADMIN_ORDER_STATUS_LABELS,
  ADMIN_PAYMENT_METHOD_LABELS,
  type AdminOrderDetail,
} from "@/lib/admin/admin-orders";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

const DELIVERY_ZONE_LABELS: Record<string, string> = {
  shorouk_madinaty: "Shorouk / Madinaty",
  haram_october_zayed: "Haram / 6 October / Sheikh Zayed",
  cairo_giza: "Cairo / Giza",
  governorate_courier: "Governorate (courier-paid)",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSafeExternalUrl(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-surface p-4">
      <h3 className="admin-label !text-[10px] mb-3" style={{ color: "var(--admin-hazelnut)" }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function ValueRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="admin-faint">{label}</span>
      <span className="text-right admin-text">{value}</span>
    </div>
  );
}

export default function OrderDetails({ order }: { order: AdminOrderDetail }) {
  const { language } = useAdminLanguage();
  const whatsappDigits = order.customer.whatsapp.replace(/\D/g, "");
  const addressLine = [
    order.address.street,
    order.address.building && `Building ${order.address.building}`,
    order.address.floor && `Floor ${order.address.floor}`,
    order.address.apartment && `Apartment ${order.address.apartment}`,
  ]
    .filter(Boolean)
    .join(", ");
  const cityLine = [order.address.area, order.address.city, order.address.governorate]
    .filter(Boolean)
    .join(", ");
  const zoneLabel = order.deliveryZone
    ? DELIVERY_ZONE_LABELS[order.deliveryZone] ?? order.deliveryZone
    : null;
  const googleMapsUrl = getSafeExternalUrl(order.address.googleMapsUrl);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <DetailCard title="Customer">
          <div className="space-y-2.5">
            <ValueRow label="Name" value={order.customer.name} />
            <ValueRow label="Type" value={order.customer.type === "registered" ? "Registered" : "Guest"} />
            {order.customer.email && (
              <a
                href={`mailto:${order.customer.email}`}
                className="flex items-center gap-2 text-xs text-[#F5E6D8]/72 hover:text-[#D6A373]"
              >
                <Mail className="h-3.5 w-3.5 text-[#D6A373]/65" />
                {order.customer.email}
              </a>
            )}
            {order.customer.phone && (
              <a
                href={`tel:${order.customer.phone}`}
                className="flex items-center gap-2 text-xs text-[#F5E6D8]/72 hover:text-[#D6A373]"
              >
                <Phone className="h-3.5 w-3.5 text-[#D6A373]/65" />
                {order.customer.phone}
              </a>
            )}
            {whatsappDigits && (
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs text-[#F5E6D8]/72 hover:text-[#D6A373]"
              >
                <MessageCircle className="h-3.5 w-3.5 text-[#D6A373]/65" />
                {order.customer.whatsapp}
              </a>
            )}
          </div>
        </DetailCard>

        <DetailCard title="Delivery Address">
          <div className="flex items-start gap-2 text-xs leading-5 text-[#F5E6D8]/72">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D6A373]/65" />
            <div>
              {order.address.recipientName && <p>{order.address.recipientName}</p>}
              {addressLine && <p>{addressLine}</p>}
              {cityLine && <p>{cityLine}</p>}
              {order.address.landmark && (
                <p className="text-[#D6B79A]/65">Landmark: {order.address.landmark}</p>
              )}
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[#D6A373]/75 hover:text-[#D6A373]"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Google Maps
                </a>
              )}
            </div>
          </div>
        </DetailCard>
      </div>

      <DetailCard title="Payment">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <ValueRow
            label="Method"
            value={ADMIN_PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
          />
          <ValueRow label="Reference" value={order.paymentReference} />
          <ValueRow label="Payment phone" value={order.paymentPhone} />
        </div>
      </DetailCard>

      <DetailCard title="Order Items">
        <div className="divide-y divide-[#B6885E]/10">
          {order.items.map((item) => (
            <div key={item.id} className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F5E6D8]/88" data-admin-no-translate>
                  {language === "ar" ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
                </p>
                <p className="mt-0.5 text-xs text-[#D6B79A]/65">
                  {[item.variantSize, item.detailEn, item.sku].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center justify-between gap-6 text-xs sm:justify-end">
                <span className="text-[#D6B79A]/55">
                  {item.unitPrice.toLocaleString()} EGP × {item.quantity}
                </span>
                <span className="min-w-20 text-right font-bold text-[#D6A373]">
                  {item.lineTotal.toLocaleString()} EGP
                </span>
              </div>
            </div>
          ))}
        </div>
      </DetailCard>

      <DetailCard title="Totals">
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between text-[#D6B79A]/58">
            <dt>Subtotal</dt>
            <dd>{order.subtotal.toLocaleString()} EGP</dd>
          </div>
          <div className="flex justify-between text-[#D6B79A]/58">
            <dt>
              Delivery
              {zoneLabel ? ` · ${zoneLabel}` : ""}
              {order.deliveryFeeOverridden ? " (overridden)" : ""}
            </dt>
            <dd>
              {order.deliveryFee
                ? `${order.deliveryFee.toLocaleString()} EGP`
                : order.deliveryZone === "governorate_courier"
                  ? "Paid to courier"
                  : "Free"}
            </dd>
          </div>
          {order.deliveryNote && (
            <p className="text-[11px] leading-4 text-[#D6B79A]/65">{order.deliveryNote}</p>
          )}
          {order.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-300/80">
              <dt>Discount {order.promoCode ? `(${order.promoCode})` : ""}</dt>
              <dd>-{order.discountTotal.toLocaleString()} EGP</dd>
            </div>
          )}
          <div className="flex justify-between pt-2 text-sm font-bold" style={{ borderTop: "1px solid var(--admin-border)", color: "var(--admin-heading)" }}>
            <dt>Total</dt>
            <dd style={{ color: "var(--admin-hazelnut)" }}>{order.total.toLocaleString()} EGP</dd>
          </div>
        </dl>
      </DetailCard>

      {(order.customerNote || order.adminNote) && (
        <DetailCard title="Notes">
          <div className="space-y-3 text-xs leading-5">
            {order.customerNote && (
              <div>
                <p className="text-[#D6B79A]/65">Customer</p>
                <p className="text-[#F5E6D8]/72">{order.customerNote}</p>
              </div>
            )}
            {order.adminNote && (
              <div>
                <p className="text-[#D6B79A]/65">Admin</p>
                <p className="text-[#F5E6D8]/72">{order.adminNote}</p>
              </div>
            )}
          </div>
        </DetailCard>
      )}

      <DetailCard title="Timeline">
        {order.events.length === 0 ? (
          <p className="text-xs text-[#D6B79A]/65">No status events recorded.</p>
        ) : (
          <ol className="space-y-3">
            {order.events.map((event, index) => (
              <li key={event.id} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ background: "var(--admin-hazelnut)", boxShadow: "0 0 6px rgb(198 153 116 / 0.5)" }} />
                  {index < order.events.length - 1 && (
                    <span className="mt-1 h-full min-h-8 w-px" style={{ background: "var(--admin-border)" }} />
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-xs font-semibold text-[#F5E6D8]/82">
                    {ADMIN_ORDER_STATUS_LABELS[event.status]}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#D6B79A]/65">
                    {formatDateTime(event.changedAt)}
                    {event.changedBy ? ` · ${event.changedBy}` : ""}
                  </p>
                  {event.note && (
                    <p className="mt-1 text-xs leading-5 text-[#D6B79A]/58">{event.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </DetailCard>
    </div>
  );
}
