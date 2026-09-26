export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startPriceScheduler } = await import('./server/price-scheduler');
  startPriceScheduler();
}
