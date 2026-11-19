import assert from 'node:assert/strict'
import { formatUsdPrice } from '../src/lib/formatPrice.ts'

assert.equal(formatUsdPrice(0.000004237), '$0.000004237')
assert.equal(formatUsdPrice(0.00442378), '$0.004424')
assert.equal(formatUsdPrice(0.123456), '$0.1235')
assert.equal(formatUsdPrice(1e-8), '$0.00000001')
assert.equal(formatUsdPrice(1e-12), '$1.000e-12')
assert.equal(formatUsdPrice(63730), '$63,730.00')
assert.equal(formatUsdPrice(1.234), '$1.23')
assert.equal(formatUsdPrice(0), '$0.00')
for (const invalid of [NaN, Infinity, -Infinity, -1]) assert.equal(formatUsdPrice(invalid), '—')
console.log('Price display regressions passed: small assets, bounded width, USD values, invalid data.')
