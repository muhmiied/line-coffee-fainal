#!/usr/bin/env node
// Deterministic regression guard for the Group 2 follow-up 404 fix
// (e2e7474), re-verified in the Phase 8 review and the subsequent pre-push
// patch. Two independent checks, both run with zero live Supabase project,
// zero credentials, and zero data mutation:
//
//   1. STRUCTURAL — no `loading.tsx` exists at any ancestor path above
//      products/[slug], products/category/[slug], or blog/[slug]. An
//      ancestor loading.tsx creates an implicit Suspense boundary that lets
//      Next.js stream a 200 status before `notFound()` resolves, silently
//      reverting every unknown-slug route back to HTTP 200 with no build
//      error of any kind. This was the actual root cause of the original bug
//      and remains the single easiest way to reintroduce it.
//
//   2. LIVE HTTP STATUS — builds and starts the real production server
//      against a local, in-process mock REST endpoint (plain Node `http`,
//      no network, no real Supabase project) seeded with exactly one
//      known-good product/category/blog-post fixture, then makes real HTTP
//      requests and asserts a genuine 404 for nonexistent slugs and 200 for
//      the known ones and the listing pages.
//
// Run: `node scripts/route-status-check.mjs` (expects to run from the repo
// root; performs its own `next build` + `next start` against the mock, does
// not require the main CI build step to have run first).

import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const failures = [];
function fail(scope, message) {
  failures.push(`[${scope}] ${message}`);
  console.error(`FAIL [${scope}] ${message}`);
}
function pass(scope, message) {
  console.log(`ok   [${scope}] ${message}`);
}

// ── 1. Structural guard ──────────────────────────────────────────────────────

const DANGEROUS_LOADING_PATHS = [
  "src/app/loading.tsx",
  "src/app/(public)/loading.tsx",
  "src/app/(public)/products/loading.tsx",
  "src/app/(public)/blog/loading.tsx",
];

function checkNoAncestorLoadingFiles() {
  let ok = true;
  for (const rel of DANGEROUS_LOADING_PATHS) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) {
      fail(
        "structural",
        `${rel} exists — an ancestor loading.tsx re-creates the implicit Suspense boundary that lets Next.js stream a 200 status before notFound() resolves, silently breaking real 404s for unknown product/category/blog slugs.`,
      );
      ok = false;
    }
  }
  if (ok) pass("structural", "no loading.tsx exists at any of the 4 dangerous ancestor paths");
  return ok;
}

// ── 2. Mock PostgREST-shaped fixture server ─────────────────────────────────

const FIXTURE = {
  category: {
    id: "10000000-0000-0000-0000-000000000001",
    slug: "known-category",
    name_en: "Known Category",
    name_ar: "فئة معروفة",
    description_en: "Fixture category for the route-status smoke check.",
    description_ar: "فئة اختبار للتحقق من حالة المسارات.",
    image_url: null,
    sort_order: 1,
  },
  product: {
    id: "20000000-0000-0000-0000-000000000001",
    slug: "known-product",
    category_id: "10000000-0000-0000-0000-000000000001",
    category_slug: "known-category",
    name_en: "Known Product",
    name_ar: "منتج معروف",
    subtitle_en: null,
    subtitle_ar: null,
    description_en: "Fixture product for the route-status smoke check.",
    description_ar: "منتج اختبار للتحقق من حالة المسارات.",
    notes_en: null,
    notes_ar: null,
    pricing_model: "fixed",
    sale_price_per_kg: 500,
    featured: false,
    best_seller: false,
    blend: null,
    image_url: null,
    gallery: null,
    is_new: false,
    is_available: true,
  },
  blogPost: {
    id: "30000000-0000-0000-0000-000000000001",
    slug: "known-blog-post",
    title_en: "Known Post",
    title_ar: "مقال معروف",
    excerpt_en: "Fixture excerpt for the route-status smoke check.",
    excerpt_ar: "مقتطف اختبار للتحقق من حالة المسارات.",
    content_en: "Paragraph one.\n\nParagraph two.",
    content_ar: "الفقرة الأولى.\n\nالفقرة الثانية.",
    category_en: "Guides",
    category_ar: "أدلة",
    featured: false,
    published_at: "2026-01-01T00:00:00.000Z",
    read_time_en: "3 min",
    read_time_ar: "٣ دقائق",
    tags: [],
    hero_image: null,
    card_image: null,
  },
};

const UNKNOWN_SLUG = "this-definitely-does-not-exist-9x7z";

function matchesEq(params, key, value) {
  return params.get(key) === `eq.${value}`;
}

function startMockRestServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://mock-supabase.local");
      const table = url.pathname.replace(/^\/rest\/v1\//, "");
      const params = url.searchParams;
      let rows = [];

      if (table === "public_categories") {
        // Always the full (one-item) list — the real query has no slug
        // filter; the page finds/misses the requested slug itself.
        rows = [FIXTURE.category];
      } else if (table === "public_products") {
        if (matchesEq(params, "slug", FIXTURE.product.slug)) {
          rows = [FIXTURE.product];
        } else if (matchesEq(params, "category_slug", FIXTURE.category.slug)) {
          rows = [FIXTURE.product];
        } else {
          rows = [];
        }
      } else if (table === "blog_posts") {
        rows = matchesEq(params, "slug", FIXTURE.blogPost.slug) ? [FIXTURE.blogPost] : [];
      } else {
        // public_product_variants, site_settings, reviews, etc. — every real
        // consumer of these already degrades to an empty/default result on
        // any unexpected response, so a safe empty array is sufficient here.
        rows = [];
      }

      const body = JSON.stringify(rows);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}`,
      });
      res.end(req.method === "HEAD" ? undefined : body);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      fetch(url, { redirect: "manual" })
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`server at ${url} did not become ready within ${timeoutMs}ms`));
          } else {
            setTimeout(tryOnce, 500);
          }
        });
    };
    tryOnce();
  });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: "inherit", shell: true, ...options });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function expectStatus(baseUrl, routePath, expected, scope) {
  const response = await fetch(`${baseUrl}${routePath}`, { redirect: "manual" });
  if (response.status === expected) {
    pass(scope, `${routePath} -> ${response.status} (expected ${expected})`);
  } else {
    fail(scope, `${routePath} -> ${response.status} (expected ${expected})`);
  }
}

async function main() {
  const structuralOk = checkNoAncestorLoadingFiles();

  console.log("Starting mock Supabase REST fixture server...");
  const mockServer = await startMockRestServer();
  const mockPort = mockServer.address().port;
  const mockUrl = `http://127.0.0.1:${mockPort}`;
  console.log(`Mock server listening at ${mockUrl}`);

  const appPort = 4173;
  const appUrl = `http://127.0.0.1:${appPort}`;
  const buildEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: mockUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "route-status-check-mock-key",
    NEXT_PUBLIC_SITE_URL: appUrl,
    PORT: String(appPort),
  };

  let appProcess;
  try {
    console.log("Building against the mock fixture server (dedicated build, isolated from the main CI build)...");
    await run("npx", ["next", "build", "--webpack"], { env: buildEnv });

    console.log(`Starting the production server on ${appUrl}...`);
    appProcess = spawn("npx", ["next", "start", "-p", String(appPort)], {
      cwd: ROOT,
      env: buildEnv,
      stdio: "inherit",
      shell: true,
    });

    await waitForServer(appUrl);

    // Real HTTP status assertions — genuine network requests, no live data.
    await expectStatus(appUrl, "/products", 200, "http-status");
    await expectStatus(appUrl, "/blog", 200, "http-status");
    await expectStatus(appUrl, `/products/${FIXTURE.product.slug}`, 200, "http-status");
    await expectStatus(appUrl, `/products/${UNKNOWN_SLUG}`, 404, "http-status");
    await expectStatus(appUrl, `/products/category/${FIXTURE.category.slug}`, 200, "http-status");
    await expectStatus(appUrl, `/products/category/${UNKNOWN_SLUG}`, 404, "http-status");
    await expectStatus(appUrl, `/blog/${FIXTURE.blogPost.slug}`, 200, "http-status");
    await expectStatus(appUrl, `/blog/${UNKNOWN_SLUG}`, 404, "http-status");
  } finally {
    if (appProcess) appProcess.kill();
    mockServer.close();
  }

  if (failures.length > 0 || !structuralOk) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll route-status checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
