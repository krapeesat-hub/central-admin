import { supabase } from "./aboutConfig.js";

const DEVICE_ID_KEY = "parauy:device-id";

function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (id) return id;
    id = (crypto.randomUUID && crypto.randomUUID()) || `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch (e) {
    // localStorage unavailable — fall back to a per-session id (won't persist, acceptable)
    return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Records an anonymous "this device is using this app" ping — no name, no
 * email, no phone number, nothing identifying. Safe to call on every app
 * load; failures (offline, not configured) are silently ignored since this
 * is a nice-to-have metric, never something the app depends on.
 *
 * Uses insert-then-update instead of a single upsert(): PostgREST's
 * INSERT ... ON CONFLICT DO UPDATE evaluates RLS in a way that can reject
 * even a permissive policy set, so we avoid it entirely here.
 */
export async function pingUsage(appId) {
  if (!supabase) return;
  const deviceId = getOrCreateDeviceId();
  try {
    const { error: insertError } = await supabase
      .from("device_pings")
      .insert({ app_id: appId, device_id: deviceId });
    if (insertError) {
      // row already exists for this device — just bump last_seen instead
      await supabase
        .from("device_pings")
        .update({ last_seen: new Date().toISOString() })
        .eq("app_id", appId)
        .eq("device_id", deviceId);
    }
  } catch (e) {
    // best-effort only
  }
}
