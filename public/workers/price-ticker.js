const INTERVAL_MS = 30_000;

async function pull() {
  try {
    const response = await fetch('/api/market-prices', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.items)) postMessage({ items: data.items });
  } catch {
    // The next tick tries again. A failed poll must not touch the page thread.
  }
}

pull();
setInterval(pull, INTERVAL_MS);
