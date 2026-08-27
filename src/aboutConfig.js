import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Read-only fetch of this app's global About/Donate config, identified by
 * appId (e.g. "parauy"). Multiple independent apps can share the same
 * Supabase project/table (app_config) — each app only ever reads its own
 * row and never sees another app's data.
 *
 * - Returns the live row from Supabase when online and reachable.
 * - Falls back to the last successfully cached copy (localStorage, keyed
 *   per appId) when offline or Supabase isn't configured — the main app
 *   is local-only for user data, so this must never block or crash
 *   without a network.
 * - Returns null if there is neither a live value nor a cached one yet,
 *   letting the caller fall back to a bundled default.
 */
export async function fetchAboutConfig(appId) {
  const cacheKey = `parauy:about-config-cache:${appId}`;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("app_config")
        .select("developer_name, about_text, promptpay, bank_name, bank_account_no, bank_account_name, donate_link")
        .eq("app_id", appId)
        .single();
      if (!error && data) {
        try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
        return data;
      }
    } catch (e) {
      // offline or unreachable — fall through to cache
    }
  }
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {}
  return null;
}
