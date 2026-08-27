/**
 * Drop-in replacement for the Claude-artifact `window.storage` API,
 * backed by the browser's real localStorage so the app works as a
 * standalone installable PWA with no external dependency.
 * Same method shapes: get/set/delete/list, all returning promises.
 */
const PREFIX = "parauy:";

function installLocalStorage() {
  if (typeof window === "undefined") return;
  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return null;
      return { key, value: raw, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      const existed = localStorage.getItem(PREFIX + key) !== null;
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: existed, shared: false };
    },
    async list(prefix = "") {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX + prefix)) keys.push(k.slice(PREFIX.length));
      }
      return { keys, prefix, shared: false };
    },
  };
}

export default installLocalStorage;
