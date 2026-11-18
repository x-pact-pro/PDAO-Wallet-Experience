# Design system

## Visual direction

A private banking instrument with the precision of a market terminal. The central signature is a deep-navy metal card form held inside a quiet orbital field. The shell stays spare; live market pages gain color from actual movement.

## Tokens

- Ink `#07101C`: application canvas.
- Midnight `#101C2B`: navigation and work surfaces.
- Porcelain `#EEF1F3`: primary type and bright surfaces.
- Champagne `#C8B47E`: selected state, fine rules, and focus accents.
- Signal aqua `#71E6D1`: positive movement and live connections.
- Ember `#FF806E`: negative movement and risk evidence.
- Electric blue `#2489F5`: primary actions and PDAO identity.

Typography: Cormorant Garamond for the welcome statement and large asset values; DM Sans for controls and body; IBM Plex Mono with tabular numerals for prices, balances, and addresses.

## Layout

Desktop: 248px quiet side rail; a 56px top instrument bar; content up to 1440px; markets use a chart-first 8/4 split. Wallet actions stay near the current asset.

Tablet: compact icon rail, collapsible market detail, two-column cards where the content permits.

Phone: one-column views, a safe-area aware bottom navigation, full-screen focused tasks, sticky contextual confirmation. No desktop-sized canvas scaled down.

## Motion

One gentle welcome reveal. Card tilt responds to pointer only on capable devices. Price pulses occur only when a fresh quote changes; animation duration is brief and motion is disabled for `prefers-reduced-motion`.

## Language

Sentence case, specific outcomes, no fabricated market narratives, no urgency copy, no claims that a transaction settled before chain confirmation.
