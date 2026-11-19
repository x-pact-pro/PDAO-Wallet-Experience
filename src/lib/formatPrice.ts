const standardPrice = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
})
const fractionalPrice = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumSignificantDigits: 4,
})

/** Preserve meaningful digits for low-priced assets without widening mobile tables indefinitely. */
export function formatUsdPrice(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '—'
  if (value === 0 || value >= 1) return standardPrice.format(value)
  if (value < 1e-8) return `$${value.toExponential(3)}`
  return fractionalPrice.format(value)
}
