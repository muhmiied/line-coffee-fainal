import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { TOP_REVIEW } from "@/lib/mock-data/admin/dashboard-mock";

export default function LatestReviewCard() {
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
            {TOP_REVIEW.avgRating}/5 avg · {TOP_REVIEW.totalReviews} reviews
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

      {/* Review content */}
      <div className="flex-1 px-5 py-4 flex flex-col gap-4">
        {/* Stars */}
        <div className="flex gap-0.5">
          {Array.from({ length: TOP_REVIEW.rating }).map((_, i) => (
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
          &ldquo;{TOP_REVIEW.text}&rdquo;
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
            {TOP_REVIEW.initials}
          </div>
          <div>
            <p
              className="text-[12.5px] font-semibold leading-tight"
              style={{ color: "var(--cream)" }}
            >
              {TOP_REVIEW.author}
            </p>
            <p
              className="text-[11px] leading-tight"
              style={{ color: "var(--cream-dim)", opacity: 0.55 }}
            >
              {TOP_REVIEW.product} · {TOP_REVIEW.time}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
