// Currency conversion utilities
export const USD_EXCHANGE_RATE = 1600; // ₦1600 = $1

export function formatNGNWithUSD(amount: number): string {
  const usdAmount = amount / USD_EXCHANGE_RATE;
  return `₦${amount.toLocaleString()} ($${usdAmount.toFixed(2)})`;
}

export function formatNGNWithUSDFixed(amount: number, decimals: number = 2): string {
  const usdAmount = amount / USD_EXCHANGE_RATE;
  return `₦${amount.toFixed(decimals)} ($${usdAmount.toFixed(2)})`;
}

export function toUSD(ngnAmount: number): number {
  return ngnAmount / USD_EXCHANGE_RATE;
}