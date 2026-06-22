"use client";

import { useState } from "react";
import { Star, FileText, Check, X } from "lucide-react";
import {
  ADMIN_REVIEWS,
  BLOG_ADMIN_ENTRIES,
  CMS_SUMMARY,
  type ReviewStatus,
} from "@/lib/mock-data/admin/cms-mock";

const STATUS_STYLE: Record<ReviewStatus, { bg: string; text: string }> = {
  Approved: { bg: "rgba(74,222,128,0.12)",  text: "#4ade80" },
  Pending:  { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24" },
  Rejected: { bg: "rgba(239,68,68,0.12)",   text: "#ef4444" },
};

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} size={11} fill={i <= n ? "#b6885e" : "none"} style={{ color: i <= n ? "#b6885e" : "rgba(182,136,94,0.25)" }} />
      ))}
    </span>
  );
}

export default function CmsPage() {
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, ReviewStatus>>(
    Object.fromEntries(ADMIN_REVIEWS.map((r) => [r.id, r.status]))
  );
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | "All">("All");

  const filteredReviews = ADMIN_REVIEWS.filter((r) =>
    reviewFilter === "All" || reviewStatuses[r.id] === reviewFilter
  );

  const approve = (id: string) => setReviewStatuses((p) => ({ ...p, [id]: "Approved" }));
  const reject  = (id: string) => setReviewStatuses((p) => ({ ...p, [id]: "Rejected" }));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--cream)", fontFamily: "var(--font-playfair)" }}>
          CMS
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--cream-dim)", opacity: 0.6 }}>
          Content management · {CMS_SUMMARY.pendingReviews} reviews pending
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Reviews", value: CMS_SUMMARY.totalReviews,   color: "var(--cream)" },
          { label: "Pending",       value: CMS_SUMMARY.pendingReviews, color: "#fbbf24"      },
          { label: "Avg Rating",    value: `★ ${CMS_SUMMARY.avgRating}`, color: "var(--gold)" },
          { label: "Blog Posts",    value: CMS_SUMMARY.blogPosts,      color: "#60a5fa"      },
        ].map(({ label, value, color }) => (
          <div key={label} className="admin-kpi-card py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--cream-dim)", opacity: 0.45 }}>
              {label}
            </p>
            <p className="text-[22px] font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Reviews */}
      <div className="admin-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 gap-3 flex-wrap" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
          <div className="flex items-center gap-2">
            <Star size={13} style={{ color: "var(--gold)", opacity: 0.7 }} />
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
              Customer Reviews
            </p>
          </div>
          <div className="flex gap-1.5">
            {(["All", "Pending", "Approved", "Rejected"] as const).map((s) => {
              const active = reviewFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReviewFilter(s)}
                  className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-all"
                  style={{
                    background: active ? "rgba(182,136,94,0.15)" : "rgba(255,255,255,0.03)",
                    color:      active ? "var(--gold)"           : "var(--cream-dim)",
                    border:     active ? "1px solid rgba(182,136,94,0.25)" : "1px solid rgba(182,136,94,0.08)",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {filteredReviews.map((r, i) => {
            const st = reviewStatuses[r.id];
            return (
              <div
                key={r.id}
                className="px-5 py-4"
                style={i < filteredReviews.length - 1 ? { borderBottom: "1px solid rgba(182,136,94,0.06)" } : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[13px] font-semibold" style={{ color: "var(--cream)" }}>{r.author}</span>
                      <span className="text-[11.5px]" style={{ color: "var(--gold)", opacity: 0.7 }}>{r.product}</span>
                      <Stars n={r.rating} />
                      <span className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>{r.date}</span>
                    </div>
                    <p className="text-[12.5px] italic" style={{ color: "var(--cream-dim)", opacity: 0.75 }}>
                      &ldquo;{r.text}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                      style={{ background: STATUS_STYLE[st].bg, color: STATUS_STYLE[st].text }}
                    >
                      {st}
                    </span>
                    {st === "Pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => approve(r.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-green-500/10"
                          style={{ color: "#4ade80" }}
                          title="Approve"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(r.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10"
                          style={{ color: "#ef4444" }}
                          title="Reject"
                        >
                          <X size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Blog posts */}
      <div className="admin-surface overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: "1px solid rgba(182,136,94,0.08)" }}>
          <FileText size={13} style={{ color: "var(--gold)", opacity: 0.7 }} />
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cream-dim)", opacity: 0.55 }}>
            Blog Posts
          </p>
        </div>
        <div>
          {BLOG_ADMIN_ENTRIES.map((post, i) => (
            <div
              key={post.slug}
              className="flex items-center justify-between gap-4 px-5 py-4"
              style={i < BLOG_ADMIN_ENTRIES.length - 1 ? { borderBottom: "1px solid rgba(182,136,94,0.06)" } : undefined}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: "var(--cream)" }}>{post.title.en}</p>
                <p className="text-[11px] mt-0.5 truncate" dir="rtl" style={{ color: "var(--cream-dim)", opacity: 0.4 }}>{post.title.ar}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[11.5px]" style={{ color: "var(--gold)", opacity: 0.6 }}>{post.category.en}</span>
                <span className="text-[11px]" style={{ color: "var(--cream-dim)", opacity: 0.35 }}>{post.date}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                  style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}
                >
                  {post.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
