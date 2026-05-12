import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf-8");
const url = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
const key = env.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim();

if (!url || !key) {
  console.error("Missing env vars");
  process.exit(1);
}

const cookies = new Map();
const supabase = createServerClient(url, key, {
  cookies: {
    getAll() {
      return Array.from(cookies.entries()).map(([name, value]) => ({
        name,
        value,
      }));
    },
    setAll(toSet) {
      toSet.forEach(({ name, value }) => cookies.set(name, value));
    },
  },
});

const { error } = await supabase.auth.signInWithPassword({
  email: "user.test@interno.angelicais.app",
  password: "123456",
});

if (error) {
  console.error("LOGIN_ERROR:", error.message);
  process.exit(1);
}

const cookieHeader = Array.from(cookies.entries())
  .map(([n, v]) => `${n}=${v}`)
  .join("; ");

console.log("=== MARKER_BEFORE_REQUEST ===");

const start = Date.now();
const ctrl = new AbortController();
const timeout = setTimeout(() => ctrl.abort(), 45000);
let status = "TIMEOUT";
let elapsed = 0;
try {
  const res = await fetch("http://localhost:3004/d-1", {
    headers: { Cookie: cookieHeader },
    redirect: "manual",
    signal: ctrl.signal,
  });
  status = res.status;
  elapsed = Date.now() - start;
} catch (e) {
  elapsed = Date.now() - start;
  status = `ERR ${e.message}`;
} finally {
  clearTimeout(timeout);
}

console.log("=== MARKER_AFTER_REQUEST ===");
console.log(`STATUS=${status} ELAPSED=${elapsed}ms`);
