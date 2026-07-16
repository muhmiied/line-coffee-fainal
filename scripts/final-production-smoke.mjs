import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3001";
const artifactsDir =
  process.env.TEST_ARTIFACTS_DIR ?? path.join(process.cwd(), ".test-artifacts");
const failures = [];
const warnings = [];

function fail(scope, message) {
  failures.push({ scope, message });
}

async function fetchWithTimeout(url, init = {}) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(30_000),
  });
}

async function sweepSitemap() {
  const response = await fetchWithTimeout(`${baseUrl}/sitemap.xml`);
  if (!response.ok) {
    fail("route-sweep", `sitemap.xml returned ${response.status}`);
    return { discovered: 0, checked: 0 };
  }

  const xml = await response.text();
  const discovered = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => {
    const url = new URL(match[1]);
    return `${url.pathname}${url.search}`;
  });
  const paths = [...new Set([
    ...discovered,
    "/robots.txt",
    "/llms.txt",
    "/cart",
    "/checkout",
    "/auth/login",
    "/auth/signup",
    "/auth/forgot-password",
    "/admin/dashboard",
    "/account/profile",
  ])];

  let cursor = 0;
  const workers = Array.from({ length: 8 }, async () => {
    while (cursor < paths.length) {
      const current = paths[cursor++];
      try {
        const routeResponse = await fetchWithTimeout(`${baseUrl}${current}`, {
          redirect: "manual",
        });
        if (routeResponse.status >= 400) {
          fail("route-sweep", `${current} returned ${routeResponse.status}`);
        }
      } catch (error) {
        fail("route-sweep", `${current} failed: ${error.message}`);
      }
    }
  });
  await Promise.all(workers);

  const adminResponse = await fetchWithTimeout(`${baseUrl}/admin/dashboard`, {
    headers: { cookie: "line-auth=1" },
    redirect: "manual",
  });
  const adminHtml = await adminResponse.text();
  if (adminResponse.status >= 400) {
    fail("admin-boundary", `/admin/dashboard with presence cookie returned ${adminResponse.status}`);
  }
  if (/\"@type\"\s*:\s*\"(?:Organization|WebSite|LocalBusiness)\"/.test(adminHtml)) {
    fail("admin-boundary", "public business JSON-LD leaked into the admin response");
  }

  return { discovered: discovered.length, checked: paths.length };
}

function attachDiagnostics(page, scope) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      fail(scope, `console error: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => fail(scope, `page error: ${error.message}`));
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText ?? "unknown";
    // Next.js cancels speculative RSC prefetches when navigation makes them
    // obsolete. They are not failed user-visible requests.
    if (errorText.includes("ERR_ABORTED")) return;
    fail(scope, `request failed: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && response.request().resourceType() !== "fetch") {
      fail(scope, `resource ${response.status()}: ${response.url()}`);
    }
  });
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {
    warnings.push({ scope: page.url(), message: "networkidle timeout; DOM checks continued" });
  });
  await page.waitForTimeout(250);
}

async function scrollThrough(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(250);
}

async function inspectPage(page, route, language) {
  const scope = `${language}:${route}`;
  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await settle(page);

  if (!response || response.status() >= 400) {
    fail(scope, `navigation returned ${response?.status() ?? "no response"}`);
    return;
  }

  const expectedDir = language === "ar" ? "rtl" : "ltr";
  const snapshot = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const controls = [...document.querySelectorAll("button, input:not([type=hidden]), select, textarea")]
      .filter(visible)
      .filter((element) => {
        const text = element.textContent?.trim();
        const labels = "labels" in element ? [...element.labels].map((label) => label.textContent?.trim()).join(" ") : "";
        return !text && !labels && !element.getAttribute("aria-label") && !element.getAttribute("aria-labelledby") && !element.getAttribute("title");
      })
      .map((element) => element.outerHTML.slice(0, 180));
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id).filter(Boolean);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      mainCount: document.querySelectorAll("main").length,
      h1Count: document.querySelectorAll("h1").length,
      title: document.title.trim(),
      description: document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "",
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      controls,
      duplicateIds,
      hasMojibake: /(?:Ã.|Â.|Ø.|Ù.)/.test(document.body.innerText),
      hasArabic: /[\u0600-\u06ff]/.test(document.body.innerText),
    };
  });

  if (snapshot.lang !== language) fail(scope, `html lang=${snapshot.lang}, expected ${language}`);
  if (snapshot.dir !== expectedDir) fail(scope, `html dir=${snapshot.dir}, expected ${expectedDir}`);
  if (snapshot.mainCount !== 1) fail(scope, `expected one main landmark, found ${snapshot.mainCount}`);
  if (snapshot.h1Count < 1) fail(scope, "missing h1");
  if (!snapshot.title) fail(scope, "missing document title");
  if (!snapshot.description) fail(scope, "missing meta description");
  if (snapshot.horizontalOverflow > 1) {
    fail(scope, `horizontal overflow by ${snapshot.horizontalOverflow}px`);
  }
  if (snapshot.controls.length) {
    fail(scope, `unnamed visible controls: ${snapshot.controls.join(" | ")}`);
  }
  if (snapshot.duplicateIds.length) {
    fail(scope, `duplicate ids: ${snapshot.duplicateIds.join(", ")}`);
  }
  if (snapshot.hasMojibake) fail(scope, "visible mojibake marker detected");
  if (language === "ar" && !snapshot.hasArabic) fail(scope, "Arabic mode has no Arabic text");
}

async function runBrowserChecks() {
  await fs.mkdir(artifactsDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "en-US",
      colorScheme: "dark",
    });
    await desktop.addCookies([{
      name: "line-coffee-language",
      value: "en",
      url: baseUrl,
      sameSite: "Lax",
    }]);
    const desktopPage = await desktop.newPage();
    attachDiagnostics(desktopPage, "desktop");

    const enRoutes = ["/", "/products", "/contact", "/blog", "/cart", "/checkout", "/auth/login"];
    for (const route of enRoutes) await inspectPage(desktopPage, route, "en");

    await desktopPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await settle(desktopPage);
    const languageToggle = desktopPage.locator("button.line-language-toggle:visible").first();
    if (await languageToggle.count()) {
      await languageToggle.click();
      await desktopPage.waitForFunction(() => document.documentElement.dir === "rtl");
      if ((await desktopPage.locator("html").getAttribute("lang")) !== "ar") {
        fail("language-toggle", "desktop language toggle changed dir but not lang");
      }
    } else {
      fail("language-toggle", "desktop language toggle not found");
    }

    await desktopPage.goto(`${baseUrl}/products`, { waitUntil: "domcontentloaded" });
    await settle(desktopPage);
    const quickAdd = desktopPage.getByRole("button", { name: /Quick Add|إضافة سريعة/i }).first();
    if (await quickAdd.count()) {
      await quickAdd.click();
      await desktopPage.waitForTimeout(300);
      const cartKeys = await desktopPage.evaluate(() =>
        Object.keys(localStorage).filter((key) => key.startsWith("line-cart-v1:")),
      );
      if (!cartKeys.length) {
        fail("cart-flow", "quick add did not persist a scoped guest cart");
      }
      await desktopPage.goto(`${baseUrl}/cart`, { waitUntil: "domcontentloaded" });
      await settle(desktopPage);
      const checkoutLink = desktopPage.locator('a[href="/checkout"]:visible').first();
      if (!(await checkoutLink.count())) fail("cart-flow", "cart has no visible checkout link after quick add");
    } else {
      fail("cart-flow", "no available Quick Add control found on products page");
    }

    await desktopPage.goto(`${baseUrl}/admin/dashboard`, { waitUntil: "domcontentloaded" });
    await settle(desktopPage);
    const redirected = new URL(desktopPage.url());
    if (redirected.pathname !== "/auth/login" || !redirected.searchParams.get("next")?.startsWith("/admin/dashboard")) {
      fail("admin-redirect", `signed-out admin navigation ended at ${redirected.pathname}${redirected.search}`);
    }

    await desktopPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await settle(desktopPage);
    if ((await desktopPage.locator("html").getAttribute("dir")) === "rtl") {
      await desktopPage.locator("button.line-language-toggle:visible").first().click();
      await desktopPage.waitForFunction(() => document.documentElement.dir === "ltr");
    }
    await scrollThrough(desktopPage);
    await desktopPage.screenshot({
      path: path.join(artifactsDir, "home-en-desktop.png"),
      fullPage: true,
    });
    await desktop.close();

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "ar-EG",
      colorScheme: "dark",
    });
    await mobile.addCookies([{
      name: "line-coffee-language",
      value: "ar",
      url: baseUrl,
      sameSite: "Lax",
    }]);
    const mobilePage = await mobile.newPage();
    attachDiagnostics(mobilePage, "mobile-ar");
    const arRoutes = ["/", "/products", "/contact", "/cart", "/checkout"];
    for (const route of arRoutes) await inspectPage(mobilePage, route, "ar");

    await mobilePage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await settle(mobilePage);
    const menuButton = mobilePage.getByRole("button", { name: /فتح القائمة|Open menu/ }).first();
    if (await menuButton.count()) {
      await menuButton.click();
      const dialog = mobilePage.getByRole("dialog", { name: /القائمة|Menu/ });
      await dialog.waitFor({ state: "visible" });
      if ((await menuButton.getAttribute("aria-expanded")) !== "true") {
        fail("mobile-menu", "hamburger aria-expanded did not become true");
      }
      await mobilePage.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
      if (!(await menuButton.evaluate((button) => button === document.activeElement))) {
        fail("mobile-menu", "focus did not return to hamburger after Escape");
      }
    } else {
      fail("mobile-menu", "mobile menu button not found");
    }

    await mobilePage.goto(`${baseUrl}/products`, { waitUntil: "domcontentloaded" });
    await settle(mobilePage);
    await mobilePage.screenshot({
      path: path.join(artifactsDir, "products-ar-mobile.png"),
      fullPage: true,
    });
    await mobile.close();
  } finally {
    await browser.close();
  }
}

const routeSweep = await sweepSitemap();
await runBrowserChecks();

const summary = {
  baseUrl,
  routeSweep,
  failures,
  warnings,
  artifactsDir,
};
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;
