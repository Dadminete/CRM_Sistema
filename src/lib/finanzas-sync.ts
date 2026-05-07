const FINANZAS_CHANNEL = "contabilidad-finanzas-sync";
const FINANZAS_STORAGE_KEY = "contabilidad-finanzas-sync-ts";

export function notifyFinanzasDataChanged() {
  if (typeof window === "undefined") return;

  const payload = Date.now().toString();

  try {
    const channel = new BroadcastChannel(FINANZAS_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // Ignore when BroadcastChannel is unavailable.
  }

  try {
    window.localStorage.setItem(FINANZAS_STORAGE_KEY, payload);
  } catch {
    // Ignore storage quota/private mode errors.
  }
}

export function subscribeFinanzasUpdates(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  let channel: BroadcastChannel | null = null;

  const onStorage = (event: StorageEvent) => {
    if (event.key === FINANZAS_STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener("storage", onStorage);

  try {
    channel = new BroadcastChannel(FINANZAS_CHANNEL);
    channel.onmessage = () => callback();
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    if (channel) {
      channel.close();
    }
  };
}
