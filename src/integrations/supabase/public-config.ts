// Public Supabase settings. The URL and the *publishable* key are meant to be public
// (they ship to every browser anyway and access is enforced by Row Level Security),
// so they are kept here as a fallback in case the hosting env vars are missing.
// Never put the sb_secret_… key in this file.
const DEFAULT_SUPABASE_URL = "https://cjrxwuebebysgjaojapy.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Y_3S9YEA2ebbrgQR2TGz2w_sJNjSqyO";

const serverEnv = (name: string): string | undefined =>
  typeof process !== "undefined" && process.env ? process.env[name] : undefined;

export function supabasePublicConfig() {
  const url =
    import.meta.env.VITE_SUPABASE_URL || serverEnv("SUPABASE_URL") || serverEnv("VITE_SUPABASE_URL") || DEFAULT_SUPABASE_URL;
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    serverEnv("SUPABASE_PUBLISHABLE_KEY") ||
    serverEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url: String(url).trim(), key: String(key).trim() };
}
