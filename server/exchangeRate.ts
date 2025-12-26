let cachedRate: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000;

export async function getUsdToNgnRate(): Promise<number> {
  const now = Date.now();
  
  if (cachedRate !== null && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    return cachedRate;
  }
  
  try {
    const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=NGN');
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }
    
    const data = await response.json() as { rates: { NGN: number } };
    const rate = data.rates.NGN;
    
    if (typeof rate !== 'number' || rate <= 0) {
      throw new Error('Invalid exchange rate received');
    }
    
    cachedRate = rate;
    cacheTimestamp = now;
    
    console.log(`[Exchange Rate] Updated USD/NGN rate: ${rate}`);
    return rate;
  } catch (error) {
    console.error('[Exchange Rate] Failed to fetch rate:', error);
    
    if (cachedRate !== null) {
      console.log('[Exchange Rate] Using stale cached rate:', cachedRate);
      return cachedRate;
    }
    
    const fallbackRate = 1600;
    console.log('[Exchange Rate] Using fallback rate:', fallbackRate);
    return fallbackRate;
  }
}

export async function convertUsdToNgnKobo(usdCents: number): Promise<number> {
  const rate = await getUsdToNgnRate();
  const usd = usdCents / 100;
  const ngn = usd * rate;
  const kobo = Math.round(ngn * 100);
  return kobo;
}
