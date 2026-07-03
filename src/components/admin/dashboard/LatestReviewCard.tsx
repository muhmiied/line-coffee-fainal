import Link from "next/link";
import { Star, ArrowRight, MessageSquare } from "lucide-react";
import type { DashboardLatestReview } from "@/lib/admin/admin-dashboard";

export default function LatestReviewCard({ review }: { review: DashboardLatestReview }) {
  return (
    <div className="admin-surface flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}
      >
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
          >
            Latest Review
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
            {review
              ? `${review.avgRating}/5 avg · ${review.totalReviews} approved`
              : "Approved reviews only"}
          </p>
        </div>
        <Link
          href="/admin/cms"
          className="flex items-center gap-1 text-[12px] font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--gold)" }}
        >
          View all
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Review content / empty state */}
      {!review ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-5 py-10">
          <MessageSquare size={26} style={{ color: "var(--cream-dim)", opacity: 0.25 }} />
          <p className="text-[12.5px] text-center" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
            No approved reviews yet
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
                style={{ color: "var(--gold)", fill: "var(--gold)" }}
              />
            ))}
          </div>

          {/* Quote */}
          <blockquote
            className="text-[13px] leading-relaxed italic flex-1"
            style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}
          >
            &ldquo;{review.text}&rdquo;
          </blockquote>

          {/* Author row */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #a8744e, #d6a373)",
                color: "var(--coffee-black)",
              }}
            >
              {review.initials || "—"}
            </div>
            <div>
              <p
                className="text-[12.5px] font-semibold leading-tight"
                style={{ color: "var(--cream)" }}
              >
                {review.author}
              </p>
              <p
                className="text-[11px] leading-tight"
                style={{ color: "var(--cream-dim)", opacity: 0.55 }}
              >
                {review.product} · {review.date}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
