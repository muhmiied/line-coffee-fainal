const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * Returns a same-origin path suitable for the public post-login fallback.
 * The admin dashboard is intentionally collapsed to `/`: the existing
 * resolvePostLoginDestination() gate independently sends verified admins to it.
 */
export function safePostLoginPath(value: string | null | undefined) {
  if (!value || CONTROL_CHARACTERS.test(value) || value.includes("\\")) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  try {
    let decoded = value;
    for (let pass = 0; pass < 2; pass += 1) decoded = decodeURIComponent(decoded);
    if (CONTROL_CHARACTERS.test(decoded) || decoded.includes("\\") || decoded.startsWith("//")) {
      return "/";
    }
  } catch {
    return "/";
  }

  if (value === "/admin/dashboard") return "/";
  if (value === "/admin" || value.startsWith("/admin/")) return "/";

  try {
    const parsed = new URL(value, "https://line-coffee.invalid");
    if (parsed.origin !== "https://line-coffee.invalid") return "/";
  } catch {
    return "/";
  }

  return value;
}
