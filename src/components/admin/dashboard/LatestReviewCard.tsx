import Link from "next/link";
import { Star, ArrowRight, MessageSquare } from "lucide-react";
import type { DashboardLatestReview } from "@/lib/admin/admin-dashboard";
import { useAdminLanguage } from "@/components/admin/layout/AdminLanguageProvider";

export default function LatestReviewCard({ review }: { review: DashboardLatestReview }) {
  const { language, dir, t } = useAdminLanguage();

  return (
    <div className="admin-surface flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--admin-border)" }}
      >
        <div>
          <p className="admin-card-title font-serif">
            {t("Latest Review")}
          </p>
          <p className="text-[11px] mt-0.5 admin-faint">
            {review
              ? language === "ar"
                ? <><bdi dir="ltr">{review.avgRating}/5</bdi> متوسط · <bdi dir="ltr">{review.totalReviews}</bdi> مقبول</>
                : `${review.avgRating}/5 avg · ${review.totalReviews} approved`
              : t("Approved reviews only")}
          </p>
        </div>
        <Link href="/admin/cms" className="admin-link flex items-center gap-1 text-[12px]">
          {t("View all")}
          <ArrowRight size={12} className={dir === "rtl" ? "rotate-180" : undefined} />
        </Link>
      </div>

      {/* Review content / empty state */}
      {!review ? (
        <div className="admin-empty-state m-4 flex-1">
          <span className="admin-empty-icon"><MessageSquare size={22} /></span>
          <p className="text-[12.5px] text-center admin-muted">
            {t("No approved reviews yet")}
          </p>
        </div>
      ) : (
        <div className="flex-1 px-5 py-4 flex flex-col gap-4">
          {/* Stars */}
          <div className="flex gap-0.5">
            {Array.from({ length: Math.max(1, Math.min(5, review.rating)) }).map((_, i) => (
              <Star
                key={i}
                size={14}
                style={{ color: "var(--admin-hazelnut)", fill: "var(--admin-hazelnut)" }}
              />
            ))}
          </div>

          {/* Quote */}
          <blockquote
            className="text-[13.5px] leading-relaxed italic flex-1"
            style={{ color: "var(--admin-heading)", fontFamily: "var(--font-playfair)" }}
            data-admin-no-translate
          >
            &ldquo;{review.text}&rdquo;
          </blockquote>

          {/* Author row */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
              style={{
                background: "linear-gradient(150deg, #dcab7b, #a16e41)",
                color: "var(--admin-button-text)",
                boxShadow: "0 3px 8px rgb(5 3 2 / 0.4)",
              }}
            >
              {review.initials || "—"}
            </div>
            <div>
              <p
                className="text-[12.5px] font-semibold leading-tight admin-text"
                data-admin-no-translate
              >
                {review.author}
              </p>
              <p className="text-[11px] leading-tight admin-faint" data-admin-no-translate>
                {review.product} · {review.date}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
