import { useEffect, useMemo, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { checkRecoveryPhrase, createRecoveryPhrase } from './lib/mnemonic'
import type { WalletRecord } from './lib/walletVault'
import {
  Activity, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight,
  Bell, Bot, ChevronDown, CircleHelp, Command, Compass, ExternalLink,
  Eye, EyeOff, Fingerprint, LayoutDashboard, LockKeyhole, Menu,
  MessageCircle, PanelLeftClose, Plus, RefreshCw, Search, ShieldCheck,
  Sparkles, Star, Trash2, Wallet, X,
  type LucideIcon,
} from 'lucide-react'
import './App.css'

type Section = 'overview' | 'markets' | 'trade' | 'alpha' | 'exchange' | 'wallet' | 'bots' | 'payments' | 'ask'
type Market = { id: string; symbol: string; name: string; image: string; price: number; change: number; volume: number; sparkline?: number[] }
type NetworkStatus = { network: string; label?: string; status: string; latency_ms?: number; provider?: string; cluster?: string; block_number?: string }
type Service = { id?: string; name?: string; title?: string; description?: string; summary?: string; category?: string; price?: number | string; currency?: string; pricing?: unknown }
type PrivatePayAccept = { scheme?: string; network?: string; asset?: string; amount?: string; payTo?: string; maxTimeoutSeconds?: number; extra?: Record<string, unknown> }
type PrivatePayQuote = { request_id?: string; expires_at?: string; requirements?: { accepts?: PrivatePayAccept[]; resource?: { url?: string; description?: string } }; pdao?: { required?: boolean; selected?: boolean; status?: string } }

const marketUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h'
const navItems: { id: Section; label: string; icon: LucideIcon; group?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Workspace' },
  { id: 'markets', label: 'Markets', icon: Activity },
  { id: 'trade', label: 'Trade', icon: ArrowLeftRight },
  { id: 'alpha', label: 'Alpha', icon: Sparkles, group: 'Discover' },
  { id: 'exchange', label: 'Agent exchange', icon: Compass },
  { id: 'bots', label: 'Bots', icon: Bot, group: 'Automate' },
  { id: 'wallet', label: 'Wallets', icon: Wallet, group: 'Manage' },
  { id: 'payments', label: 'PrivatePAY', icon: LockKeyhole },
  { id: 'ask', label: 'Ask PDAO', icon: MessageCircle },
]
const sectionMeta: Record<Section, { eyebrow: string; title: string; subtitle: string }> = {
  overview: { eyebrow: 'YOUR FINANCIAL WORLD', title: 'A little more clarity.', subtitle: 'Your assets, in one considered space.' },
  markets: { eyebrow: 'MARKET INTELLIGENCE', title: 'The market, in focus.', subtitle: 'Live prices and movement, with the signal in view.' },
  trade: { eyebrow: 'EXECUTION DESK', title: 'Trade with intention.', subtitle: 'Review live quotes before you approve a transaction.' },
  alpha: { eyebrow: 'DISCOVERY', title: 'Find the signal.', subtitle: 'Explore momentum, liquidity and emerging on-chain activity.' },
  exchange: { eyebrow: 'PDAO AGENT EXCHANGE', title: 'Intelligence at your service.', subtitle: 'Discover live capabilities and their published prices.' },
  bots: { eyebrow: 'TRADING WORKSPACE', title: 'Your strategy, clearly set.', subtitle: 'Shape a policy, protect your secrets locally, and choose where to trade.' },
  wallet: { eyebrow: 'SELF CUSTODY', title: 'Your keys. Your world.', subtitle: 'Manage the wallets you control, with care.' },
  payments: { eyebrow: 'PRIVATEPAY', title: 'Payments, thoughtfully private.', subtitle: 'Prepare a payment from an exact provider quote.' },
  ask: { eyebrow: 'PDAO INTELLIGENCE', title: 'What would you like to know?', subtitle: 'Ask about markets, your wallet or the PDAO ecosystem.' },
}

function money(value: number, digits = 2) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}
function Mark({ size = 34 }: { size?: number }) {
  return <img className="brand-mark" src="/assets/PrivateDAO_Symbol_Vector_Reconstructed.svg" width={size} height={size} alt="" />
}

function Sparkline({ data, positive = true, large = false }: { data?: number[]; positive?: boolean; large?: boolean }) {
  if (!data?.length) return <span className={`trend-unavailable ${large ? 'trend-unavailable-large' : ''}`}>—</span>
  const points = data
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1
  const path = points.map((value, index) => `${index ? 'L' : 'M'} ${(index / (points.length - 1)) * 100} ${36 - ((value - min) / range) * 30}`).join(' ')
  return <svg className={`sparkline ${large ? 'sparkline-large' : ''} ${positive ? 'is-up' : 'is-down'}`} viewBox="0 0 100 40" preserveAspectRatio="none" aria-label={`Price trend ${positive ? 'up' : 'down'}`} role="img"><path className="spark-fill" d={`${path} L 100 40 L 0 40 Z`} /><path className="spark-path" d={path} /></svg>
}

function App() {
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading: authLoading } = useAuth0()
  const [section, setSection] = useState<Section>(() => (window.location.hash.replace('#', '') as Section) || 'overview')
  const [welcome, setWelcome] = useState(!sessionStorage.getItem('pdao-entered'))
  const [mobileNav, setMobileNav] = useState(false)
  const [prices, setPrices] = useState<Market[]>([])
  const [priceState, setPriceState] = useState<'loading' | 'live' | 'unavailable'>('loading')
  const [services, setServices] = useState<Service[]>([])
  const [serviceState, setServiceState] = useState<'loading' | 'live' | 'unavailable'>('loading')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All services')
  const [amount, setAmount] = useState('0.10')
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState('')

  const refreshPrices = async () => {
    setPriceState('loading')
    try {
      const response = await fetch(marketUrl, { headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error(`Market provider returned ${response.status}`)
      const rows = await response.json() as Array<Record<string, unknown>>
      setPrices(rows.map(row => ({
        id: String(row.id), symbol: String(row.symbol).toUpperCase(), name: String(row.name), image: String(row.image),
        price: Number(row.current_price), change: Number(row.price_change_percentage_24h),
        volume: Number(row.total_volume), sparkline: (row.sparkline_in_7d as { price?: number[] } | undefined)?.price,
      })))
      setPriceState('live')
    } catch { setPriceState('unavailable') }
  }
  const refreshServices = async () => {
    setServiceState('loading')
    try {
      const response = await fetch('https://agents.privatedao.org/api/services', { headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error('Agent Exchange unavailable')
      const data = await response.json() as { services?: Service[] } | Service[]
      const rows = Array.isArray(data) ? data : data.services ?? []
      setServices(rows)
      setServiceState('live')
    } catch { setServiceState('unavailable') }
  }
  useEffect(() => {
    void refreshPrices()
    void refreshServices()
    const marketRefresh = window.setInterval(() => { void refreshPrices() }, 60_000)
    const serviceRefresh = window.setInterval(() => { void refreshServices() }, 5 * 60_000)
    return () => { window.clearInterval(marketRefresh); window.clearInterval(serviceRefresh) }
  }, [])
  useEffect(() => { window.location.hash = section }, [section])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer) }, [toast])

  const filteredServices = useMemo(() => services.filter(service => {
    const name = `${service.name ?? service.title ?? ''} ${service.id ?? ''} ${service.description ?? ''}`.toLowerCase()
    const matchesQuery = name.includes(query.toLowerCase())
    const matchesCategory = category === 'All services' || String(service.category ?? '').toLowerCase().includes(category.toLowerCase().replace(' services', ''))
    return matchesQuery && matchesCategory
  }), [services, query, category])
  const featured = prices.find(coin => coin.id === 'solana')
  const currentMeta = sectionMeta[section]

  const enter = () => { sessionStorage.setItem('pdao-entered', '1'); setWelcome(false) }
  const changeSection = (id: Section) => { setSection(id); setMobileNav(false) }

  if (welcome) return <Welcome onEnter={enter} />

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><Mark size={40} /><span><b>PrivateDAO</b><small>WALLET · MAINNET</small></span><button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="workspace-select"><span className="workspace-avatar">P</span><span className="workspace-label"><b>Personal workspace</b><small>Self-custody account</small></span><ChevronDown size={15} /></div>
      <nav className="primary-nav" aria-label="Main navigation">
        {navItems.map((item, index) => <div key={item.id}>
          {item.group && <span className="nav-group">{item.group}</span>}
          <button className={`nav-link ${section === item.id ? 'active' : ''}`} onClick={() => changeSection(item.id)}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'payments' && <i className="live-tag">LIVE</i>}</button>
          {index === 0 && <div className="nav-divider" />}
        </div>)}
      </nav>
      <div className="sidebar-bottom"><div className="privacy-card"><span className="privacy-emblem"><Fingerprint size={25} /></span><div><b>Private by design</b><p>Your assets. Your decisions.</p></div><ArrowUpRight size={16} /></div><button className="help-link" onClick={() => setToast('Help center is being prepared for this new app.')}><CircleHelp size={16} /> Help & support</button></div>
    </aside>
    {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
        <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{navItems.find(item => item.id === section)?.label}</b></div>
        <div className="topbar-actions"><button className="network-pill"><i /> MAINNET</button><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setToast('You’re all caught up.')}><Bell size={18} /><i /></button><button className="account-button" onClick={() => {
          if (isAuthenticated) logout({ logoutParams: { returnTo: window.location.origin } })
          else if (window.PDAO_CONFIG.auth0.enabled) void loginWithRedirect({ appState: { returnTo: window.location.pathname + window.location.hash } })
          else setToast('Sign-in is staged until this app’s production callback is registered with Auth0.')
        }}><span className="account-dot">{isAuthenticated ? (user?.name?.slice(0, 1) ?? 'P') : 'P'}</span><span>{authLoading ? 'Loading…' : isAuthenticated ? (user?.name ?? 'Account') : 'Sign in'}</span><ChevronDown size={14} /></button></div>
      </header>
      <MarketTicker prices={prices} state={priceState} refresh={refreshPrices} />
      <div className="content-wrap">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" />{currentMeta.eyebrow}</div><h1>{currentMeta.title}</h1><p>{currentMeta.subtitle}</p></div><div className="heading-utilities"><span className="secure-caption"><ShieldCheck size={15} /> Self-custody first</span><button className="icon-button quiet-button" aria-label="Collapse sidebar" onClick={() => setToast('Navigation is ready for your workspace.')}><PanelLeftClose size={18} /></button></div></div>
        {section === 'overview' && <Overview prices={prices} priceState={priceState} onNavigate={changeSection} refresh={refreshPrices} />}
        {section === 'markets' && <Markets prices={prices} state={priceState} refresh={refreshPrices} />}
        {section === 'trade' && <Trade prices={prices} amount={amount} setAmount={setAmount} onToast={setToast} />}
        {section === 'alpha' && <Alpha prices={prices} state={priceState} onNavigate={changeSection} />}
        {section === 'exchange' && <Exchange services={filteredServices} state={serviceState} query={query} setQuery={setQuery} category={category} setCategory={setCategory} refresh={refreshServices} />}
        {section === 'wallet' && <Wallets onToast={setToast} />}
        {section === 'bots' && <BotsWorkspace prices={prices} services={services} onToast={setToast} onNavigate={changeSection} />}
        {section === 'payments' && <Payments amount={amount} setAmount={setAmount} onToast={setToast} onNavigate={setSection} />}
        {section === 'ask' && <Ask onToast={setToast} />}
        <footer className="page-footer"><span>PrivateDAO Wallet <span className="footer-dot">·</span> Private by design <span className="footer-dot">·</span> <a href="/terms.html">Terms</a> <span className="footer-dot">·</span> <a href="/privacy.html">Privacy</a></span><span>Prices from CoinGecko <span className="footer-dot">·</span> {priceState === 'live' ? 'Updated just now' : 'Market feed status shown above'}</span></footer>
      </div>
    </main>
    <nav className="mobile-tabs" aria-label="Quick navigation">{(['overview','markets','trade','wallet'] as Section[]).map(id => { const item = navItems.find(nav => nav.id === id)!; return <button key={id} className={section === id ? 'selected' : ''} onClick={() => changeSection(id)}><item.icon size={19} /><span>{item.label}</span></button> })}</nav>
    {menuOpen && <div className="floating-menu"><button onClick={() => { setMenuOpen(false); setToast('Shortcuts are ready.') }}>Keyboard shortcuts</button></div>}
    {toast && <div className="toast" role="status"><span className="toast-mark"><Mark size={20} /></span>{toast}<button aria-label="Dismiss" onClick={() => setToast('')}><X size={15} /></button></div>}
    <button className="shortcut-trigger" aria-label="Keyboard shortcuts" onClick={() => setMenuOpen(!menuOpen)}><Command size={15} /></button>
    {featured && <span className="sr-only">Solana {money(featured.price)} {featured.change.toFixed(2)} percent 24 hour change</span>}
  </div>
}

function Welcome({ onEnter }: { onEnter: () => void }) {
  return <main className="welcome-screen"><div className="welcome-grain" /><header className="welcome-top"><div className="welcome-brand"><Mark size={42} /><span><b>PrivateDAO</b><small>WALLET</small></span></div><div className="welcome-status"><i /> PRIVATE BY DESIGN</div></header><section className="welcome-content"><div className="welcome-copy"><div className="eyebrow welcome-eyebrow"><span className="eyebrow-dot" />A MORE CONSIDERED FINANCIAL WORLD</div><h1>A quieter way<br />to <em>hold value.</em></h1><p>Your assets and decisions, gathered in a private space made for clarity. Enter when you’re ready.</p><button className="welcome-cta" onClick={onEnter}>Enter your wallet <ArrowRight size={18} /></button><div className="welcome-assurance"><ShieldCheck size={16} /><span>Self-custody, at the center</span><span className="assurance-sep">·</span><span>Your keys stay yours</span></div></div><div className="welcome-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="art-glow" /><div className="welcome-plaque"><Mark size={82} /><span>PrivateDAO</span><small>Your world, in your hands.</small><div className="plaque-rule" /><div className="plaque-foot"><span>SELF CUSTODY</span><span>EST. ON CHAIN</span></div></div><div className="floating-stat stat-one"><span>ASSETS</span><b>Held by you</b><ShieldCheck size={17} /></div><div className="floating-stat stat-two"><span>DESIGNED FOR</span><b>Clarity <Sparkles size={14} /></b></div></div></section><div className="welcome-bottom"><span>PORTFOLIO <i /> MARKETS <i /> PRIVATEPAY <i /> INTELLIGENCE</span><span>SCROLL TO BEGIN <span className="scroll-line" /></span></div></main>
}

function MarketTicker({ prices, state, refresh }: { prices: Market[]; state: string; refresh: () => void }) {
  return <div className="market-ticker"><div className="ticker-status"><span className={`status-light ${state === 'live' ? 'live' : ''}`} />{state === 'live' ? 'LIVE MARKET DATA' : state === 'loading' ? 'CONNECTING TO MARKET' : 'MARKET FEED UNAVAILABLE'}</div>{(prices.length ? prices.slice(0, 4) : []).map(coin => <div className="ticker-coin" key={coin.id}><img src={coin.image} alt="" /><b>{coin.symbol}</b><span>{money(coin.price, coin.price < 1 ? 4 : 2)}</span><small className={coin.change >= 0 ? 'positive' : 'negative'}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</small></div>)}{state !== 'live' && <span className="ticker-note">{state === 'unavailable' ? 'Prices will appear when the provider responds.' : 'Fetching latest prices…'}</span>}<button className="ticker-refresh" onClick={refresh}><RefreshCw size={14} /> Refresh</button></div>
}

function Overview({ prices, priceState, onNavigate, refresh }: { prices: Market[]; priceState: string; onNavigate: (s: Section) => void; refresh: () => void }) {
  return <div className="overview-grid"><section className="balance-card"><div className="balance-top"><div><span className="small-label">TOTAL PORTFOLIO VALUE</span><div className="balance-total"><span className="currency-sign">$</span><span>—</span></div><div className="balance-note"><span className="neutral-dot" />Connect a wallet to view your holdings</div></div><button className="balance-more" onClick={refresh} aria-label="Refresh balances"><RefreshCw size={17} /></button></div><div className="balance-ambient" aria-hidden="true" /><div className="balance-bottom"><span><i className="chart-dot" /> Portfolio history appears after wallet connection</span><span className="period-chip">1D <ChevronDown size={12} /></span></div></section><section className="quick-actions card-surface"><div className="section-card-heading"><div><span className="small-label">YOUR WALLET</span><h2>Make room for possibility.</h2></div><span className="heading-icon"><Wallet size={17} /></span></div><p className="muted-paragraph">Create a self-custody wallet or connect one you already own. Your recovery phrase remains on this device.</p><div className="wallet-cta-row"><button className="button-primary" onClick={() => onNavigate('wallet')}><Plus size={16} /> Create wallet</button><button className="button-secondary" onClick={() => onNavigate('wallet')}>Connect wallet <ArrowUpRight size={15} /></button></div><div className="action-separator" /><div className="short-actions"><button onClick={() => onNavigate('trade')}><span><ArrowLeftRight size={17} /></span><b>Trade</b><small>Review a live quote</small></button><button onClick={() => onNavigate('payments')}><span><ArrowUpRight size={17} /></span><b>Pay privately</b><small>Use a provider quote</small></button><button onClick={() => onNavigate('markets')}><span><Activity size={17} /></span><b>Explore markets</b><small>Live market data</small></button></div></section><section className="market-card card-surface"><div className="section-card-heading"><div><span className="small-label">MARKET WATCH</span><h2>Today’s movement</h2></div><button className="text-action" onClick={() => onNavigate('markets')}>All markets <ArrowRight size={14} /></button></div>{priceState === 'live' ? <div className="mini-market-list">{prices.slice(0, 4).map(coin => <div className="mini-market-row" key={coin.id}><img src={coin.image} alt="" /><span className="coin-name"><b>{coin.name}</b><small>{coin.symbol}</small></span><div className="mini-spark"><Sparkline data={coin.sparkline?.slice(-24)} positive={coin.change >= 0} /></div><span className="coin-quote"><b>{money(coin.price, coin.price < 1 ? 4 : 2)}</b><small className={coin.change >= 0 ? 'positive' : 'negative'}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</small></span></div>)}</div> : <div className="empty-feed"><Activity size={20} /><span>{priceState === 'loading' ? 'Gathering market data…' : 'Market data is temporarily unavailable.'}</span><button onClick={refresh}>Try again</button></div>}</section><section className="insight-card"><div className="insight-orb"><Sparkles size={21} /></div><div><span className="small-label">A MOMENT OF CLARITY</span><h2>See the whole picture.</h2><p>Market movement and wallet intelligence, together when you’re ready.</p></div><button aria-label="Explore alpha" onClick={() => onNavigate('alpha')}><ArrowUpRight size={19} /></button></section><section className="service-preview card-surface"><div className="section-card-heading"><div><span className="small-label">PDAO ECOSYSTEM</span><h2>Intelligence, on demand.</h2></div><span className="service-live"><i /> LIVE</span></div><div className="service-preview-content"><div className="service-orbit"><div className="orbit-ring ring-a" /><div className="orbit-ring ring-b" /><div className="orbit-center"><Mark size={34} /></div><Sparkles className="orbit-spark spark-a" size={15} /><ShieldCheck className="orbit-spark spark-b" size={16} /></div><div><p>Explore privacy-first verification, research and risk services from the PDAO Agent Exchange.</p><button className="button-secondary" onClick={() => onNavigate('exchange')}>Explore services <ArrowRight size={15} /></button></div></div></section></div>
}

function Markets({ prices, state, refresh }: { prices: Market[]; state: string; refresh: () => void }) {
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'Trending' | 'Top volume' | 'Watchlist'>('Trending')
  const [watchlist, setWatchlist] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('pdao-market-watchlist') ?? '[]') as string[] } catch { return [] } })
  const toggleWatch = (id: string) => setWatchlist(current => { const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id]; localStorage.setItem('pdao-market-watchlist', JSON.stringify(next)); return next })
  const filtered = prices.filter(coin => `${coin.name} ${coin.symbol}`.toLowerCase().includes(search.toLowerCase()))
  const visible = (mode === 'Watchlist' ? filtered.filter(coin => watchlist.includes(coin.id)) : [...filtered].sort(mode === 'Top volume' ? (a, b) => b.volume - a.volume : (a, b) => Math.abs(b.change) - Math.abs(a.change)))
  return <><NetworkHealth /><section className="data-page card-surface"><div className="data-toolbar"><div className="market-tabs">{(['Trending','Top volume','Watchlist'] as const).map(tab => <button key={tab} className={mode === tab ? 'tab-active' : ''} onClick={() => setMode(tab)}>{tab}</button>)}</div><label className="search-field"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets" /><kbd>/</kbd></label></div><div className="data-table market-table"><div className="table-head"><span>ASSET</span><span>7D TREND</span><span>PRICE</span><span>24H</span><span>24H VOLUME</span><span /></div>{visible.map((coin, index) => <div className="table-row" key={coin.id}><span className="asset-cell"><span className="rank">{String(index + 1).padStart(2, '0')}</span><img src={coin.image} alt="" /><span><b>{coin.name}</b><small>{coin.symbol}</small></span></span><span className="table-spark"><Sparkline data={coin.sparkline} positive={coin.change >= 0} /></span><b className="mono-value">{money(coin.price, coin.price < 1 ? 4 : 2)}</b><span className={coin.change >= 0 ? 'positive' : 'negative'}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</span><span className="mono-value muted-value">{money(coin.volume, 0)}</span><button className="watch-toggle" onClick={() => toggleWatch(coin.id)} aria-label={`${watchlist.includes(coin.id) ? 'Remove' : 'Add'} ${coin.name} ${watchlist.includes(coin.id) ? 'from' : 'to'} watchlist`}><Star size={15} fill={watchlist.includes(coin.id) ? 'currentColor' : 'none'} /></button></div>)}{state !== 'live' && <div className="table-empty"><Activity size={19} /><b>{state === 'loading' ? 'Loading live market data' : 'Live market feed is unavailable'}</b><p>Prices are never replaced with sample values.</p><button className="button-secondary" onClick={refresh}><RefreshCw size={14} /> Refresh prices</button></div>}{state === 'live' && visible.length === 0 && <div className="table-empty">{mode === 'Watchlist' ? 'Your watchlist is ready. Star an asset to keep it here.' : 'No assets match this search.'}</div>}</div><div className="table-foot"><span><i className={`status-light ${state === 'live' ? 'live' : ''}`} />{state === 'live' ? 'Live market data' : 'Waiting for provider'}</span><span>Source: CoinGecko <span className="footer-dot">·</span> Market prices are informational</span></div></section></>
}

function NetworkHealth() {
  const [items, setItems] = useState<NetworkStatus[]>([])
  const [state, setState] = useState<'loading' | 'live' | 'unavailable'>('loading')
  const [observed, setObserved] = useState('')
  const refresh = async () => {
    setState('loading')
    try {
      const response = await fetch('https://agents.privatedao.org/api/network/health', { headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error(`Network health returned ${response.status}`)
      const body = await response.json() as { results?: NetworkStatus[] }
      const rows = body.results ?? []
      setItems(rows)
      setObserved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setState(rows.length ? 'live' : 'unavailable')
    } catch { setState('unavailable') }
  }
  useEffect(() => { void refresh() }, [])
  return <section className="network-health card-surface"><div className="network-health-head"><div><span className="small-label">NETWORK CONNECTIVITY</span><h2>Across the ecosystem.</h2></div><button className="refresh-inline" onClick={() => void refresh()}><RefreshCw size={13} /> Refresh</button></div>{state === 'live' ? <div className="network-health-grid">{items.map(item => <article key={item.network} className="network-health-item"><span className={`network-health-dot ${item.status === 'rpc_healthy' ? 'healthy' : ''}`} /><div><b>{item.label ?? item.network.replaceAll('-', ' ')}</b><small>{item.status.replaceAll('_', ' ')}{item.cluster ? ` · ${item.cluster}` : ''}</small></div><span className="network-latency">{typeof item.latency_ms === 'number' ? `${item.latency_ms} ms` : '—'}</span></article>)}</div> : <div className="network-health-empty">{state === 'loading' ? 'Checking live network endpoints…' : 'Network health is unavailable.'} <button onClick={() => void refresh()}>Retry</button></div>}<div className="network-health-foot"><span>Read-only RPC checks</span><span>{observed ? `Updated ${observed}` : 'Status pending'}</span></div></section>
}

function Trade({ prices, amount, setAmount, onToast }: { prices: Market[]; amount: string; setAmount: (s: string) => void; onToast: (s: string) => void }) {
  const [from, setFrom] = useState('SOL'), [to, setTo] = useState('USDC')
  const asset = prices.find(coin => coin.symbol === from)
  return <div className="trade-layout"><section className="trade-panel card-surface"><div className="trade-heading"><div><span className="small-label">SWAP ASSETS</span><h2>From one asset to another.</h2></div><button className="icon-button"><RefreshCw size={16} /></button></div><div className="trade-input-card"><div className="trade-input-top"><span>You pay</span><span>Available balance <b>—</b></span></div><div className="trade-input-line"><input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} aria-label="Amount to trade" /><select value={from} onChange={event => setFrom(event.target.value)} aria-label="Asset to pay">{['SOL','ETH','USDC','BTC'].map(ticker => <option key={ticker}>{ticker}</option>)}</select></div><div className="trade-fiat">{asset && Number(amount) ? `≈ ${money(Number(amount) * asset.price)}` : 'Connect a wallet to see your balance'}</div></div><button className="swap-direction" aria-label="Reverse assets" onClick={() => { setFrom(to); setTo(from) }}><ArrowDownLeft size={17} /></button><div className="trade-input-card receive-card"><div className="trade-input-top"><span>You receive</span><span>Live quote required</span></div><div className="trade-input-line"><span className="receive-placeholder">—</span><select value={to} onChange={event => setTo(event.target.value)} aria-label="Asset to receive">{['USDC','SOL','ETH','BTC'].map(ticker => <option key={ticker}>{ticker}</option>)}</select></div><div className="trade-fiat">Output appears after a verified provider quote</div></div><div className="trade-details"><span>Network <b>Solana Mainnet</b></span><span>Price impact <b>—</b></span><span>Provider <b>Jupiter quote required</b></span></div><button className="button-primary trade-submit" onClick={() => onToast('Connect a Solana wallet to request a fresh Jupiter quote.')}><ArrowLeftRight size={16} /> Connect wallet for a live quote</button><p className="trade-caption"><ShieldCheck size={14} /> No order is sent until you review and sign it in your wallet.</p></section><aside className="trade-aside card-surface"><span className="small-label">EXECUTION PRINCIPLES</span><div className="execution-item"><span><Activity size={18} /></span><div><b>Fresh quote</b><p>Route and amount come from the swap provider in real time.</p></div></div><div className="execution-item"><span><ShieldCheck size={18} /></span><div><b>You approve every step</b><p>Review the transaction and sign locally before it is submitted.</p></div></div><div className="execution-item"><span><LockKeyhole size={18} /></span><div><b>Your keys stay here</b><p>Private keys never leave your browser or device.</p></div></div><div className="aside-market"><div className="aside-market-head"><span>MARKET SNAPSHOT</span><span className="service-live"><i /> LIVE</span></div>{prices.slice(0,3).map(coin => <div className="aside-market-row" key={coin.id}><img src={coin.image} alt="" /><b>{coin.symbol}</b><span>{money(coin.price, coin.price < 1 ? 4 : 2)}</span><small className={coin.change >= 0 ? 'positive' : 'negative'}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</small></div>)}</div></aside></div>
}

function Alpha({ prices, state, onNavigate }: { prices: Market[]; state: string; onNavigate: (s: Section) => void }) {
  const movers = [...prices].sort((a,b) => Math.abs(b.change) - Math.abs(a.change)).slice(0,3)
  return <div className="alpha-page"><section className="alpha-hero"><div className="alpha-text"><span className="alpha-badge"><Sparkles size={14} /> MARKET PULSE</span><h2>Follow the current.<br /><em>Keep your course.</em></h2><p>Movement is a starting point for research. Explore live market changes and make each decision your own.</p><button className="button-bright" onClick={() => onNavigate('markets')}>Explore markets <ArrowRight size={16} /></button></div><div className="alpha-visual"><div className="alpha-sun" /><div className="alpha-grid" /><svg viewBox="0 0 480 240" preserveAspectRatio="none" className="alpha-wave"><defs><linearGradient id="wave" x1="0" x2="1"><stop stopColor="#cbb987" /><stop offset=".55" stopColor="#7fe5d0" /><stop offset="1" stopColor="#2587ee" /></linearGradient></defs><path d="M0 194 C44 184 48 90 98 119 S154 200 202 143 S257 26 304 79 S348 176 388 98 S438 70 480 24" fill="none" stroke="url(#wave)" strokeWidth="3" /><path d="M0 194 C44 184 48 90 98 119 S154 200 202 143 S257 26 304 79 S348 176 388 98 S438 70 480 24 L480 240 L0 240 Z" fill="url(#wave)" opacity=".09" /></svg><span className="wave-caption">SIGNAL · NOT A PROMISE</span></div></section><div className="alpha-metrics"><div><span>ASSETS TRACKED</span><b>{state === 'live' ? String(prices.length).padStart(2, '0') : '—'}</b></div><div><span>MARKET SOURCE</span><b>{state === 'live' ? 'LIVE' : 'CONNECTING'}</b></div><div><span>LAST REFRESH</span><b>{state === 'live' ? 'JUST NOW' : '—'}</b></div></div><section className="alpha-movers card-surface"><div className="section-card-heading"><div><span className="small-label">NOTABLE MOVEMENT</span><h2>Where attention is gathering.</h2></div><span className="muted-caption">Based on current 24h changes</span></div>{movers.length ? movers.map((coin, index) => <div className="mover-row" key={coin.id}><span className="mover-index">0{index + 1}</span><img src={coin.image} alt="" /><b>{coin.name}</b><span className="mover-chart"><Sparkline data={coin.sparkline} positive={coin.change >= 0} /></span><b className={coin.change >= 0 ? 'positive' : 'negative'}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</b></div>) : <div className="table-empty">Live data is unavailable right now.</div>}</section></div>
}

function Exchange({ services, state, query, setQuery, category, setCategory, refresh }: { services: Service[]; state: string; query: string; setQuery: (s: string) => void; category: string; setCategory: (s: string) => void; refresh: () => void }) {
  const categories = ['All services','Verification','Intelligence','Risk','Agent Services','Transactions','Financial Services']
  return <div className="exchange-page"><section className="exchange-hero"><div className="exchange-hero-copy"><span className="exchange-status"><i className={state === 'live' ? 'is-live' : ''} />{state === 'live' ? 'CONNECTED TO AGENT EXCHANGE' : state === 'loading' ? 'CONNECTING TO AGENT EXCHANGE' : 'AGENT EXCHANGE UNAVAILABLE'}</span><h2>Real services.<br /><em>Inside your wallet.</em></h2><p>Explore live capabilities and published prices. Use your wallet to authorize any payment.</p><div className="exchange-capabilities"><span><ShieldCheck size={14} /> Read-only tools</span><i /> <span><LockKeyhole size={14} /> PrivatePAY x402</span><i /> <span><Activity size={14} /> Live catalog</span></div></div><div className="exchange-orbit"><div className="exchange-orbit-ring ring1" /><div className="exchange-orbit-ring ring2" /><div className="exchange-core"><Mark size={42} /></div><div className="orbit-token token-a"><ShieldCheck size={15} /></div><div className="orbit-token token-b"><Command size={15} /></div><div className="orbit-token token-c"><Activity size={15} /></div></div></section><div className="catalog-toolbar"><div className="catalog-count"><span className="eyebrow-dot" /><b>{state === 'live' ? services.length : '—'}</b> live services <button className="refresh-inline" onClick={refresh}><RefreshCw size={13} /> Refresh</button></div><div className="catalog-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Describe what you need or filter services" /></div><div className="category-scroll">{categories.map(tab => <button key={tab} className={tab === category ? 'chosen' : ''} onClick={() => setCategory(tab)}>{tab}</button>)}</div></div>{state === 'live' ? <div className="service-grid">{services.map((service, index) => <ServiceCard key={service.id ?? index} service={service} />)}{!services.length && <div className="table-empty">No live services match this filter.</div>}</div> : <div className="service-empty card-surface"><Compass size={25} /><b>{state === 'loading' ? 'Loading live service catalog' : 'Could not reach the live catalog'}</b><p>Catalog details and prices are provided by Agent Exchange.</p><button className="button-secondary" onClick={refresh}><RefreshCw size={14} /> Try again</button></div>}</div>
}
function ServiceCard({ service }: { service: Service }) {
  const title = service.title ?? service.name ?? service.id ?? 'PDAO service'
  const price = typeof service.price === 'number' ? `${service.price} ${service.currency ?? 'USDC'}` : typeof service.price === 'string' ? service.price : 'See provider quote'
  return <article className="service-card card-surface"><div className="service-card-top"><span className="service-icon"><Command size={20} /></span><span className="service-category">{service.category ?? 'PDAO SERVICE'}</span></div><code>{service.id ?? 'agent.service'}</code><h3>{title}</h3><p>{service.summary ?? service.description ?? 'A live capability from the PDAO Agent Exchange.'}</p><div className="service-card-footer"><span>Published price <b>{price}</b></span><button aria-label={`View ${title}`}><ArrowUpRight size={17} /></button></div></article>
}

function Wallets({ onToast }: { onToast: (s: string) => void }) {
  const [records, setRecords] = useState<WalletRecord[]>([])
  const [flow, setFlow] = useState<'create' | 'import' | 'unlock' | null>(null)
  const [selected, setSelected] = useState<WalletRecord | null>(null)
  const [phrase, setPhrase] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [backupConfirmed, setBackupConfirmed] = useState(false)
  const [verifiedWalletId, setVerifiedWalletId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copyState, setCopyState] = useState('')

  const reload = async () => {
    try { const { listWallets } = await import('./lib/walletVault'); setRecords(await listWallets()) }
    catch { setError('This browser does not provide secure local wallet storage.') }
  }
  useEffect(() => { void reload() }, [])

  const closeFlow = () => { setFlow(null); setSelected(null); setPhrase(''); setPassphrase(''); setBackupConfirmed(false); setError('') }
  const beginCreate = () => { setPhrase(createRecoveryPhrase()); setFlow('create'); setError('') }
  const beginImport = () => { setPhrase(''); setFlow('import'); setError('') }
  const submitWallet = async () => {
    setBusy(true); setError('')
    try {
      const { saveWallet } = await import('./lib/walletVault')
      const record = await saveWallet(phrase, passphrase)
      setRecords(existing => [...existing, record])
      closeFlow()
      onToast('Wallet encrypted and saved on this device.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save this wallet.') }
    finally { setBusy(false) }
  }
  const unlock = async () => {
    if (!selected) return
    setBusy(true); setError('')
    try {
      const { unlockWallet } = await import('./lib/walletVault')
      await unlockWallet(selected, passphrase)
      setVerifiedWalletId(selected.id)
      setPassphrase('')
      setFlow(null)
      onToast('Passphrase verified on this device. Signing is not enabled in this build yet.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not unlock this wallet.') }
    finally { setBusy(false) }
  }
  const copyAddress = async (address: string, label: string) => {
    try { await navigator.clipboard.writeText(address); setCopyState(label); window.setTimeout(() => setCopyState(''), 1800) }
    catch { onToast('Clipboard access is unavailable in this context.') }
  }

  return <div className="wallets-layout"><section className="wallet-intro card-surface"><div className="wallet-emblem"><Mark size={50} /></div><span className="small-label">SELF CUSTODY, MADE CLEAR</span><h2>{records.length ? 'Your wallet is yours.' : 'Begin with your own keys.'}</h2><p>Create a new wallet on this device or restore one you already control. Your recovery phrase is encrypted locally with your passphrase and never sent to a server.</p><div className="wallet-buttons"><button className="button-primary" onClick={beginCreate}><Plus size={16} /> Create a new wallet</button><button className="button-secondary" onClick={beginImport}><Wallet size={16} /> Import recovery phrase</button></div>{records.length > 0 && <div className="wallet-records">{records.map(record => <article className="wallet-record" key={record.id}><div className="record-heading"><span className="record-chain"><Mark size={24} /></span><div><b>PrivateDAO wallet</b><small>Created {new Date(record.createdAt).toLocaleDateString()}</small></div><button className="record-unlock" onClick={() => { setSelected(record); setFlow('unlock') }}>Verify passphrase</button></div><div className="address-line"><span><i className="solana-dot" /> Solana</span><code>{record.solanaAddress.slice(0, 8)}…{record.solanaAddress.slice(-6)}</code><button onClick={() => void copyAddress(record.solanaAddress, 'solana')} aria-label="Copy Solana address">{copyState === 'solana' ? 'Copied' : 'Copy'}</button></div><div className="address-line"><span><i className="evm-dot" /> EVM</span><code>{record.evmAddress.slice(0, 8)}…{record.evmAddress.slice(-6)}</code><button onClick={() => void copyAddress(record.evmAddress, 'evm')} aria-label="Copy EVM address">{copyState === 'evm' ? 'Copied' : 'Copy'}</button></div><div className="record-actions"><span>{verifiedWalletId === record.id ? <><i className="status-light live" /> Passphrase verified · signing unavailable</> : 'Encrypted on this device'}</span><button onClick={() => { if (window.confirm('Remove this encrypted wallet from this device? Make sure you have your recovery phrase backed up first.')) { void import('./lib/walletVault').then(({ removeWallet }) => removeWallet(record.id)).then(() => { setRecords(items => items.filter(item => item.id !== record.id)); if (verifiedWalletId === record.id) setVerifiedWalletId(null) }) } }}>Remove</button></div></article>)}</div>}</section><aside className="wallet-security card-surface"><span className="small-label">SECURITY MODEL</span><div className="security-seal"><ShieldCheck size={31} /></div><h3>Built around your custody.</h3><ul><li><span><ShieldCheck size={16} /></span><span><b>Keys stay on your device</b><small>Recovery phrase is encrypted locally before saving.</small></span></li><li><span><Fingerprint size={16} /></span><span><b>Local confirmation</b><small>Transaction signing is not enabled in this build.</small></span></li><li><span><LockKeyhole size={16} /></span><span><b>No cloud secret storage</b><small>Your unlock passphrase is never saved.</small></span></li></ul><div className="security-note">Keep your recovery phrase offline in a safe place. Anyone with it can control the wallet.</div></aside>
    {flow && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeFlow() }}><section className="wallet-modal card-surface" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title"><div className="modal-heading"><div><span className="small-label">LOCAL WALLET VAULT</span><h2 id="wallet-modal-title">{flow === 'create' ? 'Create your wallet' : flow === 'import' ? 'Restore your wallet' : 'Unlock your wallet'}</h2></div><button className="icon-button" aria-label="Close" onClick={closeFlow}><X size={18} /></button></div>{flow === 'create' && <><p className="modal-copy">Write these words down and keep them offline. This is the only recovery key to your wallet.</p><div className="phrase-grid">{phrase.split(' ').map((word, index) => <div key={`${word}-${index}`}><small>{String(index + 1).padStart(2, '0')}</small><b>{word}</b></div>)}</div><button className="phrase-copy" onClick={() => void navigator.clipboard.writeText(phrase).then(() => onToast('Recovery phrase copied. Clear your clipboard after saving it offline.')).catch(() => setError('Clipboard access failed. Write the words down manually.'))}>Copy recovery phrase <ArrowUpRight size={14} /></button><label className="backup-confirm"><input type="checkbox" checked={backupConfirmed} onChange={event => setBackupConfirmed(event.target.checked)} /><span>I’ve written the recovery phrase down and stored it offline.</span></label></>}{flow === 'import' && <><label className="modal-field">Recovery phrase<textarea value={phrase} onChange={event => setPhrase(event.target.value)} placeholder="Enter your 12 or 24 recovery words" rows={3} autoComplete="off" spellCheck={false} /></label><p className={`phrase-validity ${phrase.trim() ? checkRecoveryPhrase(phrase) ? 'valid' : 'invalid' : ''}`}>{phrase.trim() ? checkRecoveryPhrase(phrase) ? 'Recovery phrase verified' : 'Check the words and their order' : 'Phrase is processed on this device only'}</p></>}{flow !== 'unlock' && <><label className="modal-field">Unlock passphrase<input type="password" value={passphrase} onChange={event => setPassphrase(event.target.value)} minLength={12} autoComplete="new-password" placeholder="At least 12 characters" /></label><p className="passphrase-hint">This passphrase encrypts the wallet on this device. It cannot recover a lost recovery phrase.</p></>}{flow === 'unlock' && <label className="modal-field">Unlock passphrase<input type="password" value={passphrase} onChange={event => setPassphrase(event.target.value)} autoComplete="current-password" placeholder="Your wallet passphrase" onKeyDown={event => { if (event.key === 'Enter') void unlock() }} /></label>}{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button className="button-secondary" onClick={closeFlow}>Cancel</button>{flow === 'unlock' ? <button className="button-primary" onClick={() => void unlock()} disabled={!passphrase || busy}>{busy ? 'Unlocking…' : 'Unlock wallet'}</button> : <button className="button-primary" onClick={() => void submitWallet()} disabled={busy || passphrase.length < 12 || (flow === 'create' && !backupConfirmed) || (flow === 'import' && !checkRecoveryPhrase(phrase))}>{busy ? 'Encrypting…' : flow === 'create' ? 'Encrypt & save wallet' : 'Restore & encrypt'}</button>}</div></section></div>}
  </div>
}

type BotTab = 'Policy' | 'Vault' | 'Team Bots' | 'DApp Browser'
type BotPolicy = { name: string; network: string; strategy: string; tokens: string; maxOrder: string; dailyBudget: string; slippage: string; stopLoss: string; takeProfit: string }
type TeamBot = { id: string; name: string; role: string; strategy: string; scope: string; enabled: boolean }
type BotApp = { name: string; detail: string; url: string; mark: string; color: string }

const botPolicyKey = 'pdao-bot-policy-v1'
const teamBotsKey = 'pdao-team-bots-v1'
const defaultBotPolicy: BotPolicy = { name: 'My PDAO Bot', network: 'Solana Mainnet', strategy: 'Momentum', tokens: 'SOL, USDC', maxOrder: '25', dailyBudget: '100', slippage: '50', stopLoss: '8', takeProfit: '15' }
const defaultTeamBots: TeamBot[] = [
  { id: 'scout', name: 'Market Scout', role: 'Research', strategy: 'Momentum watch', scope: 'Public market signals', enabled: true },
  { id: 'risk', name: 'Risk Analyst', role: 'Risk review', strategy: 'Liquidity & holder review', scope: 'Read-only evidence', enabled: true },
]
const tradingApps: BotApp[] = [
  { name: 'Pump.fun', detail: 'Token launches · Solana', url: 'https://pump.fun/', mark: 'P', color: 'coral' },
  { name: 'Moonshot', detail: 'Discover & trade · Solana', url: 'https://moonshot.com/', mark: 'M', color: 'violet' },
  { name: 'GMGN', detail: 'Token discovery · Solana', url: 'https://gmgn.ai/', mark: 'G', color: 'mint' },
  { name: 'Axiom', detail: 'Trading terminal · multichain', url: 'https://axiom.trade/', mark: 'A', color: 'blue' },
  { name: 'BullX', detail: 'Trading terminal · Solana', url: 'https://bullx.io/', mark: 'B', color: 'gold' },
  { name: 'Photon', detail: 'Token discovery · Solana', url: 'https://photon-sol.tinyastro.io/', mark: 'Φ', color: 'cyan' },
]

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? { ...fallback as object, ...JSON.parse(value) as object } as T : fallback
  } catch { return fallback }
}

function BotsWorkspace({ prices, services, onToast, onNavigate }: { prices: Market[]; services: Service[]; onToast: (message: string) => void; onNavigate: (section: Section) => void }) {
  const [tab, setTab] = useState<BotTab>('Policy')
  const [policy, setPolicy] = useState<BotPolicy>(() => readLocal(botPolicyKey, defaultBotPolicy))
  const [team, setTeam] = useState<TeamBot[]>(() => {
    try { const saved = localStorage.getItem(teamBotsKey); return saved ? JSON.parse(saved) as TeamBot[] : defaultTeamBots }
    catch { return defaultTeamBots }
  })
  const [secrets, setSecrets] = useState<import('./lib/walletVault').BotSecretRecord[]>([])
  const [secretLabel, setSecretLabel] = useState('')
  const [secretValue, setSecretValue] = useState('')
  const [vaultPassphrase, setVaultPassphrase] = useState('')
  const [unlockPassphrase, setUnlockPassphrase] = useState('')
  const [revealed, setRevealed] = useState<{ id: string; value: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [autopilot, setAutopilot] = useState<{ state: 'loading' | 'ready' | 'unavailable'; enabled?: boolean; operational?: boolean; blockers?: number }>({ state: 'loading' })

  const refreshVault = async () => {
    try { const { listBotSecrets } = await import('./lib/walletVault'); setSecrets(await listBotSecrets()) }
    catch { setError('Encrypted local storage is unavailable in this browser.') }
  }
  const refreshAutopilot = async () => {
    setAutopilot({ state: 'loading' })
    try {
      const response = await fetch('https://agents.privatedao.org/api/privatepay/autopilot/status', { headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error('Autopilot status request failed.')
      const data = await response.json() as Record<string, unknown>
      const blockers = Array.isArray(data.activation_blockers) ? data.activation_blockers.length : undefined
      setAutopilot({ state: 'ready', enabled: data.enabled === true, operational: data.operational === true, blockers })
    } catch { setAutopilot({ state: 'unavailable' }) }
  }
  useEffect(() => { void refreshVault(); void refreshAutopilot() }, [])

  const updatePolicy = (key: keyof BotPolicy, value: string) => setPolicy(current => ({ ...current, [key]: value }))
  const savePolicy = () => {
    try { localStorage.setItem(botPolicyKey, JSON.stringify(policy)); onToast('Strategy policy saved on this device.') }
    catch { setError('Could not save the policy in this browser.') }
  }
  const saveTeam = (next: TeamBot[]) => {
    setTeam(next)
    try { localStorage.setItem(teamBotsKey, JSON.stringify(next)) }
    catch { setError('Could not save team bots in this browser.') }
  }
  const addSecret = async () => {
    setBusy(true); setError('')
    try {
      const { saveBotSecret } = await import('./lib/walletVault')
      await saveBotSecret(secretLabel, secretValue, vaultPassphrase)
      setSecretLabel(''); setSecretValue(''); setVaultPassphrase(''); setRevealed(null)
      await refreshVault(); onToast('Secret encrypted and saved locally.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not encrypt this secret.') }
    finally { setBusy(false) }
  }
  const revealSecret = async (record: import('./lib/walletVault').BotSecretRecord) => {
    setError('')
    try {
      const { unlockBotSecret } = await import('./lib/walletVault')
      const value = await unlockBotSecret(record, unlockPassphrase)
      setRevealed({ id: record.id, value }); setUnlockPassphrase('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not unlock this secret.') }
  }
  const relatedServices = services.filter(service => /wallet|risk|classif|research|market/i.test(`${service.id ?? ''} ${service.name ?? ''} ${service.title ?? ''}`)).slice(0, 4)

  return <section className="bots-workspace">
    <div className="bots-intro card-surface"><div className="bots-intro-icon"><Bot size={23} /></div><div><span className="small-label">PDAO TRADING DESK</span><h2>Fast ideas. Your call on every trade.</h2><p>Policies and team notes stay on this device. This workspace never receives your primary wallet key.</p></div><div className="bots-live-state"><i /> MAINNET</div></div>
    <div className="bots-tabs" role="tablist" aria-label="Bot workspace">{(['Policy', 'Vault', 'Team Bots', 'DApp Browser'] as BotTab[]).map(item => <button role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} key={item} onClick={() => { setTab(item); setError('') }}>{item}</button>)}</div>
    {tab === 'Policy' && <div className="bot-policy-layout">
      <section className="bot-panel card-surface"><div className="bot-panel-heading"><div><span className="small-label">STRATEGY & SPENDING POLICY</span><h3>Set your bot’s playbook.</h3></div><span className="manual-badge"><ShieldCheck size={13} /> Manual approval</span></div>
        <div className="bot-form-grid"><label>Bot name<input value={policy.name} onChange={event => updatePolicy('name', event.target.value)} /></label><label>Network<select value={policy.network} onChange={event => updatePolicy('network', event.target.value)}><option>Solana Mainnet</option><option>Base</option><option>Ethereum</option></select></label><label>Strategy<select value={policy.strategy} onChange={event => updatePolicy('strategy', event.target.value)}>{['Momentum', 'DCA', 'Launch scout', 'Copy-trade research', 'Custom'].map(option => <option key={option}>{option}</option>)}</select></label><label>Tokens to watch<input value={policy.tokens} onChange={event => updatePolicy('tokens', event.target.value)} placeholder="SOL, USDC" /></label><label>Maximum order (USD)<input inputMode="decimal" value={policy.maxOrder} onChange={event => updatePolicy('maxOrder', event.target.value)} /></label><label>Daily strategy budget (USD)<input inputMode="decimal" value={policy.dailyBudget} onChange={event => updatePolicy('dailyBudget', event.target.value)} /></label><label>Slippage (basis points)<input inputMode="numeric" value={policy.slippage} onChange={event => updatePolicy('slippage', event.target.value)} /></label><label>Stop-loss (%)<input inputMode="decimal" value={policy.stopLoss} onChange={event => updatePolicy('stopLoss', event.target.value)} /></label><label>Take-profit (%)<input inputMode="decimal" value={policy.takeProfit} onChange={event => updatePolicy('takeProfit', event.target.value)} /></label></div>
        <div className="bot-policy-actions"><span><LockKeyhole size={14} /> Saved locally · trades require your wallet approval</span><button className="button-primary" onClick={savePolicy}><ShieldCheck size={15} /> Save policy</button></div>
        <div className="bot-suggestion"><Sparkles size={16} /><div><b>Live market context</b><p>{prices.length ? `${prices.slice(0, 3).map(asset => `${asset.symbol} ${asset.change >= 0 ? '+' : ''}${asset.change.toFixed(2)}%`).join(' · ')} · Review current signals before acting.` : 'Market signals will appear when the live feed is available.'}</p></div></div>
      </section>
      <aside className="bot-side-stack"><section className="bot-panel card-surface autopilot-panel"><div className="bot-panel-heading"><div><span className="small-label">PRIVATEPAY AUTOPILOT</span><h3>Delegated payment status</h3></div><button className="refresh-inline" onClick={() => void refreshAutopilot()}><RefreshCw size={13} /> Refresh</button></div><div className="autopilot-status"><span className={`network-health-dot ${autopilot.state === 'ready' && autopilot.operational ? 'healthy' : ''}`} /><div><b>{autopilot.state === 'loading' ? 'Checking live status…' : autopilot.state === 'unavailable' ? 'Status unavailable' : autopilot.operational ? 'Operational' : 'Awaiting activation'}</b><small>{autopilot.state === 'ready' ? `${autopilot.enabled ? 'Enabled' : 'Not enabled'}${autopilot.blockers === undefined ? '' : ` · ${autopilot.blockers} activation blockers`}` : 'Read-only Agent Exchange status'}</small></div></div><p>PrivatePAY Autopilot uses delegated agent sessions and explicit service, network, asset and recipient allowlists. It does not expose reusable payment credentials.</p><button className="button-secondary" onClick={() => onNavigate('payments')}>Open PrivatePAY <ArrowRight size={14} /></button></section>
        <section className="bot-panel card-surface"><div className="bot-panel-heading"><div><span className="small-label">AGENT EXCHANGE</span><h3>Research capabilities</h3></div><span className="exchange-live-chip"><i /> {services.length ? `${services.length} LIVE` : 'CONNECTING'}</span></div>{relatedServices.length ? <div className="bot-service-list">{relatedServices.map((service, index) => <div key={service.id ?? index}><span><Bot size={15} /></span><div><b>{service.title ?? service.name ?? service.id}</b><small>{service.id ?? 'Agent service'}</small></div><button aria-label="Explore this service" onClick={() => onNavigate('exchange')}><ArrowUpRight size={15} /></button></div>)}</div> : <p>Live wallet research and risk services will appear here from the Agent Exchange catalog.</p>}<button className="text-action" onClick={() => onNavigate('exchange')}>View live services <ArrowRight size={14} /></button></section></aside>
    </div>}
    {tab === 'Vault' && <section className="bot-panel card-surface bot-vault-panel"><div className="bot-panel-heading"><div><span className="small-label">ENCRYPTED BOT VAULT</span><h3>Secrets remain on this device.</h3></div><span className="vault-seal"><LockKeyhole size={17} /> AES-GCM</span></div><p className="bot-vault-copy">Values are encrypted locally with a passphrase before they are stored in IndexedDB. Only labels and encrypted values persist; plaintext is held in memory only while you enter or reveal it.</p><div className="vault-add-grid"><label>Secret label<input value={secretLabel} onChange={event => setSecretLabel(event.target.value)} placeholder="COPY_SOURCE, API token…" /></label><label>Secret value<input type="password" autoComplete="off" value={secretValue} onChange={event => setSecretValue(event.target.value)} placeholder="Enter a secret" /></label><label>Vault passphrase<input type="password" autoComplete="new-password" value={vaultPassphrase} onChange={event => setVaultPassphrase(event.target.value)} placeholder="At least 12 characters" /></label><button className="button-primary" onClick={() => void addSecret()} disabled={busy || !secretLabel.trim() || !secretValue.trim() || vaultPassphrase.length < 12}>{busy ? 'Encrypting…' : <><Plus size={15} /> Encrypt & save</>}</button></div><div className="vault-unlock-row"><label>Passphrase to reveal a stored value<input type="password" autoComplete="current-password" value={unlockPassphrase} onChange={event => setUnlockPassphrase(event.target.value)} placeholder="Entered only when you choose Reveal" /></label><span>{secrets.length} encrypted {secrets.length === 1 ? 'item' : 'items'}</span></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="secret-list">{secrets.length ? secrets.map(record => <article key={record.id}><span className="secret-lock"><LockKeyhole size={15} /></span><div><b>{record.label}</b><small>Encrypted on this device · {new Date(record.createdAt).toLocaleDateString()}</small>{revealed?.id === record.id && <code>{revealed.value}</code>}</div><button className="icon-button" aria-label={revealed?.id === record.id ? 'Hide secret' : 'Reveal secret'} onClick={() => revealed?.id === record.id ? setRevealed(null) : void revealSecret(record)}>{revealed?.id === record.id ? <EyeOff size={16} /> : <Eye size={16} />}</button><button className="icon-button danger-icon" aria-label="Delete secret" onClick={() => { void import('./lib/walletVault').then(({ removeBotSecret }) => removeBotSecret(record.id)).then(() => { setSecrets(items => items.filter(item => item.id !== record.id)); if (revealed?.id === record.id) setRevealed(null) }).catch(() => setError('Could not delete this encrypted secret.')) }}><Trash2 size={15} /></button></article>) : <div className="vault-empty"><LockKeyhole size={20} /><span>No bot secrets saved yet.</span></div>}</div><div className="primary-key-note"><ShieldCheck size={16} /><span>Your primary wallet recovery phrase is kept in the Wallet vault and is never shared with bots or Agent Exchange.</span></div></section>}
    {tab === 'Team Bots' && <section className="bot-panel card-surface team-panel"><div className="bot-panel-heading"><div><span className="small-label">TEAM BOT ROSTER</span><h3>One lead. Focused specialists.</h3></div><button className="button-secondary" onClick={() => saveTeam([...team, { id: crypto.randomUUID(), name: `Research Bot ${team.length + 1}`, role: 'Research', strategy: 'Market research', scope: 'Read-only signals', enabled: false }])}><Plus size={15} /> Add team bot</button></div><label className="lead-bot-field">Lead bot name<input value={policy.name} onChange={event => updatePolicy('name', event.target.value)} onBlur={savePolicy} /></label><div className="team-bot-grid">{team.map(bot => <article className="team-bot-card" key={bot.id}><div className="team-bot-top"><span className="team-bot-icon"><Bot size={18} /></span><button className={`bot-toggle ${bot.enabled ? 'on' : ''}`} aria-label={`${bot.enabled ? 'Pause' : 'Enable'} ${bot.name}`} aria-pressed={bot.enabled} onClick={() => saveTeam(team.map(item => item.id === bot.id ? { ...item, enabled: !item.enabled } : item))}><i /></button></div><label>Bot name<input value={bot.name} onChange={event => saveTeam(team.map(item => item.id === bot.id ? { ...item, name: event.target.value } : item))} /></label><div className="team-bot-fields"><label>Role<input value={bot.role} onChange={event => saveTeam(team.map(item => item.id === bot.id ? { ...item, role: event.target.value } : item))} /></label><label>Strategy<input value={bot.strategy} onChange={event => saveTeam(team.map(item => item.id === bot.id ? { ...item, strategy: event.target.value } : item))} /></label><label>Scope<input value={bot.scope} onChange={event => saveTeam(team.map(item => item.id === bot.id ? { ...item, scope: event.target.value } : item))} /></label></div><footer><span><i className={bot.enabled ? 'enabled-dot' : ''} />{bot.enabled ? 'Policy enabled locally' : 'Paused locally'}</span><button onClick={() => saveTeam(team.filter(item => item.id !== bot.id))}><Trash2 size={14} /> Remove</button></footer></article>)}<button className="team-add-card" onClick={() => saveTeam([...team, { id: crypto.randomUUID(), name: `Research Bot ${team.length + 1}`, role: 'Research', strategy: 'Market research', scope: 'Read-only signals', enabled: false }])}><Plus size={20} /><b>Add a specialist</b><span>Configure its role and scope</span></button></div><div className="primary-key-note"><ShieldCheck size={16} /><span>Team profiles are saved locally. Enabling a profile does not launch an autonomous trade or transmit wallet keys.</span></div></section>}
    {tab === 'DApp Browser' && <section className="bot-panel card-surface dapp-panel"><div className="bot-panel-heading"><div><span className="small-label">SOLANA TRADING DESTINATIONS</span><h3>Choose your trading venue.</h3><p>Open an external app in a new tab. Connect your wallet there only if you decide to.</p></div><span className="dapp-globe"><ExternalLink size={19} /></span></div><div className="dapp-grid">{tradingApps.map(app => <a className="dapp-card" href={app.url} target="_blank" rel="noopener noreferrer" key={app.name}><span className={`dapp-mark ${app.color}`}>{app.mark}</span><span className="dapp-card-copy"><b>{app.name}</b><small>{app.detail}</small></span><ExternalLink size={15} /></a>)}</div><div className="dapp-footnote"><ShieldCheck size={15} /><span>External destinations open outside this wallet. PrivateDAO does not send your recovery phrase or submit trades to these sites.</span></div></section>}
  </section>
}

function Payments({ amount, setAmount, onToast, onNavigate }: { amount: string; setAmount: (s: string) => void; onToast: (s: string) => void; onNavigate: (section: Section) => void }) {
  const [resource, setResource] = useState('https://agents.privatedao.org/services/privatepay-x402')
  const [provider, setProvider] = useState('privatedao-agent-exchange')
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [payerId, setPayerId] = useState('')
  const [quote, setQuote] = useState<PrivatePayQuote | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void import('./lib/walletVault').then(({ listWallets }) => listWallets()).then(records => {
      if (!active) return
      setWallets(records)
      setPayerId(current => current || records[0]?.id || '')
    }).catch(() => { if (active) setError('Local wallet storage is unavailable in this browser.') })
    return () => { active = false }
  }, [])
  const payer = wallets.find(wallet => wallet.id === payerId)
  const requestQuote = async () => {
    setError(''); setQuote(null)
    const match = amount.trim().match(/^(\d+)(?:\.(\d{1,6}))?$/)
    if (!match || !/^https:\/\//i.test(resource.trim()) || !provider.trim() || !payer) {
      setError(!payer ? 'Create or import a local wallet first so the quote is bound to its payer address.' : 'Enter a positive USDC amount, an HTTPS resource and a provider ID.')
      return
    }
    const baseUnits = `${match[1]}${(match[2] ?? '').padEnd(6, '0')}`.replace(/^0+(?=\d)/, '')
    if (baseUnits === '0') { setError('Enter an amount greater than zero.'); return }
    setBusy(true)
    try {
      const response = await fetch('https://agents.privatedao.org/api/privatepay/x402/requirements', {
        method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ resource: resource.trim(), provider_id: provider.trim(), amount_base_units: baseUnits, payer: payer.solanaAddress, require_pdao_wallet: false }),
      })
      const result = await response.json() as PrivatePayQuote & { message?: string }
      if (!response.ok) throw new Error(typeof result.message === 'string' ? result.message : `Quote request failed (${response.status}).`)
      if (!result.requirements?.accepts?.length) throw new Error('The payment provider returned no usable payment requirements.')
      setQuote(result)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not request a live quote.') }
    finally { setBusy(false) }
  }
  const accept = quote?.requirements?.accepts?.[0]
  const exactAmount = accept?.amount && /^\d+$/.test(accept.amount) ? `${(BigInt(accept.amount) / 1_000_000n).toString()}.${(BigInt(accept.amount) % 1_000_000n).toString().padStart(6, '0')} USDC` : null
  const copyPayTo = async () => {
    if (!accept?.payTo) return
    try { await navigator.clipboard.writeText(accept.payTo); onToast('Quoted recipient copied.') }
    catch { onToast('Clipboard access is unavailable in this context.') }
  }
  return <div className="payments-layout"><section className="payment-intro"><span className="payment-eyebrow"><LockKeyhole size={15} /> PRIVATEPAY · X402</span><h2>Private payment,<br />from inside your wallet.</h2><p>Request a live quote and inspect its exact amount, network and recipient before continuing.</p><div className="payment-rail"><span className="rail-status"><i /> SOLANA MAINNET</span><div><b>PrivatePAY x402 operational</b><small>MagicBlock private settlement · quote-bound</small></div><ShieldCheck size={19} /></div><div className="payment-disclosure"><ShieldCheck size={17} /><span>Agent Exchange returns the quote and settlement requirements. A quote alone does not move funds.</span></div></section><section className="payment-form card-surface"><div className="payment-form-head"><span className="small-label">PREPARE A PAYMENT</span><span className="form-lock"><LockKeyhole size={14} /> LIVE QUOTE</span></div>{payer ? <label>Paying wallet<select value={payerId} onChange={event => { setPayerId(event.target.value); setQuote(null) }}>{wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.solanaAddress.slice(0, 8)}…{wallet.solanaAddress.slice(-6)}</option>)}</select><small className="payer-address">{payer.solanaAddress}</small></label> : <div className="wallet-needed"><span>No local wallet is linked yet.</span><button className="text-action" onClick={() => onNavigate('wallet')}>Create or import wallet <ArrowUpRight size={14} /></button></div>}<label>Recipient resource<input value={resource} onChange={event => { setResource(event.target.value); setQuote(null) }} /></label><label>Provider ID<input value={provider} onChange={event => { setProvider(event.target.value); setQuote(null) }} /></label><label>Requested amount (USDC)<div className="amount-field"><input type="number" min="0" step="0.000001" value={amount} onChange={event => { setAmount(event.target.value); setQuote(null) }} /><span>USDC</span></div></label><button className="button-primary payment-quote" onClick={() => void requestQuote()} disabled={busy}>{busy ? 'Requesting live quote…' : <><ArrowRight size={16} /> Request exact quote</>}</button>{error && <div className="form-error" role="alert">{error}</div>}{quote && accept && <div className="quote-result" role="status"><div className="quote-result-heading"><i className="status-light live" /> Exact payment quote <span>{accept.scheme ?? 'x402'}</span></div><div className="quote-value">{exactAmount ?? 'Amount unavailable'}</div><div className="quote-detail-grid"><div><small>NETWORK</small><b>{accept.network ?? '—'}</b></div><div><small>SETTLEMENT</small><b>{String(accept.extra?.settlement ?? '—')}</b></div><div className="quote-recipient"><small>QUOTED RECIPIENT</small><code>{accept.payTo ?? '—'}</code>{accept.payTo && <button className="quote-copy" onClick={() => void copyPayTo()}>Copy</button>}</div><div><small>QUOTE EXPIRES</small><b>{quote.expires_at ? new Date(quote.expires_at).toLocaleString() : `${accept.maxTimeoutSeconds ?? '—'} seconds`}</b></div></div><div className="quote-reference"><span>Request</span><code>{quote.request_id ?? '—'}</code>{quote.pdao?.required && <span className="quote-pdao">PDAO required</span>}</div><p>Terms are bound to this quote. Payment requires wallet authorization and a confirmed settlement receipt.</p><details><summary>View complete provider response</summary><pre>{JSON.stringify(quote, null, 2)}</pre></details></div>}<div className="form-separator" /><div className="existing-link"><b>Check an existing payment link</b><p>Payment-link status lookup will be connected to the merchant checkout contract.</p><input placeholder="Paste an Agent Exchange payment link" /><button className="button-secondary" onClick={() => onToast('Payment-link status lookup is not connected in this app yet.')}>Check payment link <ArrowUpRight size={15} /></button></div></section></div>
}

function Ask({ onToast }: { onToast: (s: string) => void }) {
  const [question, setQuestion] = useState('')
  const suggestions = ['What’s moving in the market today?', 'Explain PrivatePAY x402', 'How do I keep my wallet secure?', 'What can Agent Exchange do?']
  return <section className="ask-page card-surface"><div className="ask-heading"><div className="ask-avatar"><Mark size={42} /></div><span className="small-label">PDAO INTELLIGENCE</span><h2>A clearer answer starts here.</h2><p>Ask about markets, self-custody and the PDAO ecosystem.</p></div><div className="prompt-grid">{suggestions.map(prompt => <button key={prompt} onClick={() => setQuestion(prompt)}>{prompt}<ArrowUpRight size={15} /></button>)}</div><div className="ask-compose"><textarea value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask PDAO anything…" rows={3} /><div><span><ShieldCheck size={14} /> Don’t include recovery phrases or private keys.</span><button className="button-primary" onClick={() => onToast('PDAO intelligence is not connected in this new app yet.')} disabled={!question.trim()}>Ask PDAO <ArrowUpRight size={15} /></button></div></div></section>
}

export default App
