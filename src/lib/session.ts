// Pure, runtime-agnostic session helpers — no next/headers, no "server-only".
// Safe to import from both Server Components/Actions (Node runtime) and
// middleware (Edge runtime), since it only uses Web Crypto (`crypto.subtle`),
// which both environments provide.

export const ADMIN_COOKIE_NAME = "shokakko_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Not cryptographically bulletproof, but avoids an obvious short-circuit
// string compare for a single-admin password/cookie check.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set — add it to .env.local (see .env.example).",
    );
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(payload: string): Promise<string> {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return bytesToHex(signature);
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error(
      "ADMIN_PASSWORD is not set — add it to .env.local (see .env.example).",
    );
  }
  return safeEqual(password, expected);
}

export async function createSessionCookieValue(): Promise<string> {
  const expires = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `admin.${expires}`;
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export async function isSessionValueValid(
  raw: string | undefined | null,
): Promise<boolean> {
  if (!raw) return false;
  const lastDot = raw.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = raw.slice(0, lastDot);
  const signature = raw.slice(lastDot + 1);

  let expectedSignature: string;
  try {
    expectedSignature = await sign(payload);
  } catch {
    return false;
  }
  if (!safeEqual(signature, expectedSignature)) return false;

  const [marker, expiresRaw] = payload.split(".");
  if (marker !== "admin") return false;
  const expires = Number(expiresRaw);
  return Number.isFinite(expires) && expires >= Date.now();
}
