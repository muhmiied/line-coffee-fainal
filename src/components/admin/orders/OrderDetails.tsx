import { AlertTriangle, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import {
  ADMIN_ORDER_STATUS_LABELS,
  ADMIN_PAYMENT_METHOD_LABELS,
  ADMIN_PAYMENT_STATUS_LABELS,
  OUTSTANDING_PAYMENT_STATUSES,
  type AdminOrderDetail,
} from "@/lib/admin/admin-orders";

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

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#B6885E]/12 bg-white/[0.018] p-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6A373]/65">
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
      <span className="text-[#D6B79A]/48">{label}</span>
      <span className="text-right text-[#F5E6D8]/78">{value}</span>
    </div>
  );
}

export default function OrderDetails({ order }: { order: AdminOrderDetail }) {
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
  const deliveredUnpaid =
    order.status === "delivered" &&
    OUTSTANDING_PAYMENT_STATUSES.includes(order.paymentStatus);

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
                <p className="text-[#D6B79A]/48">Landmark: {order.address.landmark}</p>
              )}
            </div>
          </div>
        </DetailCard>
      </div>

      <DetailCard title="Payment">
        {deliveredUnpaid && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] font-semibold text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Delivered but Unpaid — payment is still {ADMIN_PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}.
          </div>
        )}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <ValueRow
            label="Method"
            value={ADMIN_PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
          />
          <ValueRow
            label="Status"
            value={ADMIN_PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
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
                <p className="text-sm font-semibold text-[#F5E6D8]/88">{item.nameEn}</p>
                <p className="mt-0.5 text-xs text-[#D6B79A]/48">
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
            <p className="text-[11px] leading-4 text-[#D6B79A]/42">{order.deliveryNote}</p>
          )}
          {order.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-300/80">
              <dt>Discount {order.promoCode ? `(${order.promoCode})` : ""}</dt>
              <dd>-{order.discountTotal.toLocaleString()} EGP</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-[#B6885E]/12 pt-2 text-sm font-bold text-[#F5E6D8]">
            <dt>Total</dt>
            <dd className="text-[#D6A373]">{order.total.toLocaleString()} EGP</dd>
          </div>
        </dl>
      </DetailCard>

      {(order.customerNote || order.adminNote) && (
        <DetailCard title="Notes">
          <div className="space-y-3 text-xs leading-5">
            {order.customerNote && (
              <div>
                <p className="text-[#D6B79A]/45">Customer</p>
                <p className="text-[#F5E6D8]/72">{order.customerNote}</p>
              </div>
            )}
            {order.adminNote && (
              <div>
                <p className="text-[#D6B79A]/45">Admin</p>
                <p className="text-[#F5E6D8]/72">{order.adminNote}</p>
              </div>
            )}
          </div>
        </DetailCard>
      )}

      <DetailCard title="Timeline">
        {order.events.length === 0 ? (
          <p className="text-xs text-[#D6B79A]/45">No status events recorded.</p>
        ) : (
          <ol className="space-y-3">
            {order.events.map((event, index) => (
              <li key={event.id} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#D6A373]" />
                  {index < order.events.length - 1 && (
                    <span className="mt-1 h-full min-h-8 w-px bg-[#B6885E]/20" />
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-xs font-semibold text-[#F5E6D8]/82">
                    {ADMIN_ORDER_STATUS_LABELS[event.status]}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#D6B79A]/44">
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
