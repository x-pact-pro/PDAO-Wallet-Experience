import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import PersonaReact from 'persona-react'
import { PublicKey, SystemProgram, Transaction, VersionedTransaction } from '@solana/web3.js'
import { formatEther, getAddress } from 'ethers'
import type { Wallet as StandardWallet } from '@wallet-standard/base'
import { checkRecoveryPhrase, createRecoveryPhrase } from './lib/mnemonic'
import type { PreparedSolanaTransaction, WalletRecord } from './lib/walletVault'
import { readPortfolioBalances, readSolanaTokenBalances, type PortfolioBalance, type SolanaTokenBalance } from './lib/portfolio'
import { connectEvmWallet, connectSolanaWallet, discoverEvmWallets, discoverSolanaWallets, disconnectSolanaWallet, getExistingEvmAccount, onSolanaWalletsChanged, signWithExternalSolanaWallet, type ConnectedExternalWallet, type EvmProviderOption, type EvmWalletDiscovery } from './lib/externalWallets'
import {
  Activity, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight,
  Bot, ChevronDown, CircleHelp, Command, Compass, ExternalLink,
  Eye, EyeOff, Fingerprint, LayoutDashboard, LockKeyhole, Menu,
  MessageCircle, PanelLeftClose, Plus, RefreshCw, Search, ShieldCheck,
  Sparkles, Star, Trash2, Wallet, X,
  type LucideIcon,
} from 'lucide-react'
import { formatUsdPrice } from './lib/formatPrice'
import './App.css'
import './AppRefinements.css'
import './Ask.css'

type Section = 'overview' | 'markets' | 'trade' | 'alpha' | 'exchange' | 'wallet' | 'bots' | 'payments' | 'identity' | 'ask'
type Market = { id: string; symbol: string; name: string; image: string; price: number; change: number; volume: number; sparkline?: number[] }
type NetworkStatus = { network: string; label?: string; status: string; latency_ms?: number; provider?: string; cluster?: string; block_number?: string }
type Service = { id?: string; name?: string; title?: string; description?: string; summary?: string; category?: string; price?: number | string; currency?: string; pricing?: unknown }
type PrivatePayAccept = { scheme?: string; network?: string; asset?: string; amount?: string; payTo?: string; maxTimeoutSeconds?: number; extra?: Record<string, unknown> }
type PrivatePayQuote = { request_id?: string; expires_at?: string; requirements?: { accepts?: PrivatePayAccept[]; resource?: { url?: string; description?: string; mimeType?: string } }; pdao?: { required?: boolean; selected?: boolean; status?: string }; public_disclosure?: string; provider_disclosure?: string }
type PrivatePayPreparedResponse = { transaction_base64?: string; version?: 'legacy' | 'v0'; send_to?: 'base' | 'ephemeral'; required_signers?: string[]; recent_blockhash?: string; last_valid_block_height?: number; instruction_count?: number; provider_fees?: { lamports?: string; tokens?: string } | null; privacy_boundary?: string }
type PrivatePayVerification = { isValid?: boolean; invalidReason?: string; payer?: string; [key: string]: unknown }
type PrivatePaySettlement = { success?: boolean; pending?: boolean; transaction?: string; network?: string; payer?: string; [key: string]: unknown }

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
  { id: 'identity', label: 'Identity', icon: Fingerprint, group: 'Account' },
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
  identity: { eyebrow: 'IDENTITY & TRUST', title: 'Your identity, on your terms.', subtitle: 'Choose a verification or sign-in method when a service needs it.' },
  ask: { eyebrow: 'PDAO INTELLIGENCE', title: 'What would you like to know?', subtitle: 'Ask about markets, your wallet or the PDAO ecosystem.' },
}

function money(value: number, digits = 2) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}
function Mark({ size = 34 }: { size?: number }) {
  return <img className="brand-mark" src={`${import.meta.env.BASE_URL}assets/PrivateDAO_Symbol_Vector_Reconstructed.svg`} width={size} height={size} alt="" />
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
  const nativeAuth = Capacitor.isNativePlatform()
  const authConfig = window.PDAO_CONFIG.auth0
  const authEnvironmentMismatch = authConfig.environment !== 'production' && (nativeAuth || window.location.hostname === authConfig.productionHostname || window.location.protocol === 'chrome-extension:')
  const authEnabled = authConfig.enabled && import.meta.env.BASE_URL !== './' && !authEnvironmentMismatch
  const nativeRedirectUri = window.PDAO_CONFIG.auth0.nativeRedirectUri
  const [section, setSection] = useState<Section>(() => (window.location.hash.replace('#', '') as Section) || 'overview')
  const [welcome, setWelcome] = useState(!sessionStorage.getItem('pdao-entered'))
  const [mobileNav, setMobileNav] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('pdao-sidebar-collapsed') === 'true')
  const [prices, setPrices] = useState<Market[]>([])
  const [priceState, setPriceState] = useState<'loading' | 'live' | 'unavailable'>('loading')
  const [services, setServices] = useState<Service[]>([])
  const [serviceState, setServiceState] = useState<'loading' | 'live' | 'unavailable'>('loading')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All services')
  const [amount, setAmount] = useState('0.10')
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [standardWallets, setStandardWallets] = useState<readonly StandardWallet[]>([])
  const [evmProviders, setEvmProviders] = useState<EvmProviderOption[]>([])
  const [connectedWallets, setConnectedWallets] = useState<ConnectedExternalWallet[]>([])
  const evmDiscovery = useRef<EvmWalletDiscovery | null>(null)

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    const refresh = (wallets: readonly StandardWallet[]) => {
      setStandardWallets(wallets)
      void Promise.all(wallets.map(wallet => connectSolanaWallet(wallet, true).catch(() => null))).then(accounts => {
        if (!active) return
        setConnectedWallets(current => {
          const next: ConnectedExternalWallet[] = [...current.filter(item => item.chain !== 'solana')]
          accounts.forEach(account => { if (account && !next.some(item => item.id === account.id)) next.push(account) })
          return next
        })
      })
    }
    const initialize = async () => {
      if (Capacitor.getPlatform() === 'android') {
        const { createDefaultAuthorizationCache, createDefaultChainSelector, createDefaultWalletNotFoundHandler, registerMwa } = await import('@solana-mobile/wallet-standard-mobile')
        registerMwa({
          appIdentity: {
            name: 'PrivateDAO Wallet',
            uri: 'https://github.com/x-pact-pro/PDAO-Wallet-Experience',
            icon: 'https://raw.githubusercontent.com/x-pact-pro/PDAO-Wallet-Experience/main/public/icons/pdao-128.png',
          },
          authorizationCache: createDefaultAuthorizationCache(),
          chains: ['solana:mainnet', 'solana:devnet'],
          chainSelector: createDefaultChainSelector(),
          onWalletNotFound: createDefaultWalletNotFoundHandler(),
        })
      }
      if (!active) return
      refresh(discoverSolanaWallets())
      unsubscribe = onSolanaWalletsChanged(refresh)
    }
    void initialize().catch(() => {
      if (active) {
        refresh(discoverSolanaWallets())
        unsubscribe = onSolanaWalletsChanged(refresh)
      }
    })
    return () => { active = false; unsubscribe?.() }
  }, [])
  useEffect(() => {
    let active = true
    const evmProviderCleanup = new Map<string, () => void>()
    const discovery = discoverEvmWallets(option => {
      setEvmProviders(current => current.some(item => item.info.uuid === option.info.uuid) ? current : [...current, option])
      void getExistingEvmAccount(option).then(account => {
        if (active && account) setConnectedWallets(current => current.some(item => item.id === account.id) ? current : [...current, account])
      })
      const providerId = option.info.uuid
      const onAccountsChanged = (...args: unknown[]) => {
        const accounts = args[0]
        const address = Array.isArray(accounts) ? accounts.find(value => typeof value === 'string' && /^0x[\da-f]{40}$/i.test(value)) : undefined
        if (typeof address !== 'string') {
          setConnectedWallets(current => current.filter(item => item.chain !== 'evm' || !item.id.startsWith(`evm:${providerId}:`)))
          return
        }
        void option.provider.request({ method: 'eth_chainId' }).then(chainId => {
          if (!active) return
          const next: Extract<ConnectedExternalWallet, { chain: 'evm' }> = {
            id: `evm:${providerId}:${address}`,
            chain: 'evm',
            name: option.info.name,
            address,
            icon: option.info.icon,
            chainId: String(chainId),
            provider: option.provider,
          }
          setConnectedWallets(current => [
            ...current.filter(item => item.chain !== 'evm' || !item.id.startsWith(`evm:${providerId}:`)),
            next,
          ])
        }).catch(() => {
          setConnectedWallets(current => current.filter(item => item.chain !== 'evm' || !item.id.startsWith(`evm:${providerId}:`)))
        })
      }
      const onChainChanged = (...args: unknown[]) => {
        const chainId = args[0]
        if (typeof chainId !== 'string') return
        setConnectedWallets(current => current.map(item => item.chain === 'evm' && item.id.startsWith(`evm:${providerId}:`)
          ? { ...item, chainId }
          : item))
      }
      const onDisconnect = () => {
        setConnectedWallets(current => current.filter(item => item.chain !== 'evm' || !item.id.startsWith(`evm:${providerId}:`)))
      }
      option.provider.on?.('accountsChanged', onAccountsChanged)
      option.provider.on?.('chainChanged', onChainChanged)
      option.provider.on?.('disconnect', onDisconnect)
      const removeProviderListeners = () => {
        option.provider.removeListener?.('accountsChanged', onAccountsChanged)
        option.provider.removeListener?.('chainChanged', onChainChanged)
        option.provider.removeListener?.('disconnect', onDisconnect)
      }
      evmProviderCleanup.set(providerId, removeProviderListeners)
    })
    evmDiscovery.current = discovery
    return () => {
      active = false
      discovery.dispose()
      evmDiscovery.current = null
      evmProviderCleanup.forEach(remove => remove())
      evmProviderCleanup.clear()
    }
  }, [])

  const connectStandard = async (wallet: StandardWallet) => {
    try {
      const account = await connectSolanaWallet(wallet)
      setConnectedWallets(current => current.some(item => item.id === account.id) ? current : [...current, account])
      setToast(`${wallet.name} connected. Signing stays inside its wallet approval.`)
    } catch (reason) { setToast(reason instanceof Error ? reason.message : `Could not connect ${wallet.name}.`) }
  }
  const connectEvm = async (option: EvmProviderOption) => {
    try {
      const account = await connectEvmWallet(option)
      setConnectedWallets(current => current.some(item => item.id === account.id) ? current : [...current, account])
      setToast(`${option.info.name} connected.`)
    } catch (reason) { setToast(reason instanceof Error ? reason.message : `Could not connect ${option.info.name}.`) }
  }
  const disconnectExternal = (id: string) => {
    const target = connectedWallets.find(item => item.id === id)
    if (target?.chain === 'solana') void disconnectSolanaWallet(target.wallet).catch(() => undefined)
    setConnectedWallets(current => current.filter(item => item.id !== id))
  }
  const rescanWalletProviders = () => {
    const wallets = discoverSolanaWallets()
    setStandardWallets(wallets)
    void Promise.all(wallets.map(wallet => connectSolanaWallet(wallet, true).catch(() => null))).then(accounts => {
      setConnectedWallets(current => {
        const next: ConnectedExternalWallet[] = [...current.filter(item => item.chain !== 'solana')]
        accounts.forEach(account => { if (account && !next.some(item => item.id === account.id)) next.push(account) })
        return next
      })
    })
    evmDiscovery.current?.refresh()
    setToast('Scanning for compatible wallet providers…')
  }

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
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target
      const editing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if (event.key === 'Escape') { setMenuOpen(false); return }
      if (!editing && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setMenuOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

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

  const toggleSidebar = () => setSidebarCollapsed(current => {
    const next = !current
    localStorage.setItem('pdao-sidebar-collapsed', String(next))
    return next
  })

  return <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><Mark size={40} /><span><b>PrivateDAO</b><small>WALLET · MAINNET</small></span><button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="workspace-select"><span className="workspace-avatar">P</span><span className="workspace-label"><b>Personal workspace</b><small>Self-custody account</small></span><ChevronDown size={15} /></div>
      <nav className="primary-nav" aria-label="Main navigation">
        {navItems.map((item, index) => <div key={item.id}>
          {item.group && <span className="nav-group">{item.group}</span>}
          <button className={`nav-link ${section === item.id ? 'active' : ''}`} title={sidebarCollapsed ? item.label : undefined} onClick={() => changeSection(item.id)}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'payments' && <i className="live-tag">LIVE</i>}</button>
          {index === 0 && <div className="nav-divider" />}
        </div>)}
      </nav>
      <div className="sidebar-bottom"><div className="privacy-card"><span className="privacy-emblem"><Fingerprint size={25} /></span><div><b>Private by design</b><p>Your assets. Your decisions.</p></div><ArrowUpRight size={16} /></div><a className="help-link" href="https://github.com/x-pact-pro/PDAO-Wallet-Experience/issues" target="_blank" rel="noreferrer"><CircleHelp size={16} /> Help & support <ExternalLink size={13} /></a></div>
    </aside>
    {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
        <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{navItems.find(item => item.id === section)?.label}</b></div>
        <div className="topbar-actions"><button className="network-pill"><i /> MAINNET</button><button className="account-button" onClick={() => {
          if (isAuthenticated) void logout({ logoutParams: { returnTo: nativeAuth ? nativeRedirectUri : `${window.location.origin}${import.meta.env.BASE_URL}` }, ...(nativeAuth ? { openUrl: async (url: string) => { await Browser.open({ url, windowName: '_self' }) } } : {}) })
          else if (authEnabled) void loginWithRedirect({ appState: { returnTo: window.location.pathname + window.location.hash }, ...(nativeAuth ? { openUrl: async (url: string) => { await Browser.open({ url, windowName: '_self' }) } } : {}) })
          else if (authEnvironmentMismatch) setToast('Secure sign-in is not configured for this release environment. You can still connect a wallet directly.')
          else { changeSection('wallet'); setToast('Connect any available wallet directly. An account sign-in is not required.') }
        }}><span className="account-dot">{isAuthenticated ? (user?.name?.slice(0, 1) ?? 'P') : 'P'}</span><span>{authLoading ? 'Loading…' : isAuthenticated ? (user?.name ?? 'Account') : 'Sign in'}</span><ChevronDown size={14} /></button></div>
      </header>
      <MarketTicker prices={prices} state={priceState} refresh={refreshPrices} />
      <div className="content-wrap">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" />{currentMeta.eyebrow}</div><h1>{currentMeta.title}</h1><p>{currentMeta.subtitle}</p></div><div className="heading-utilities"><span className="secure-caption"><ShieldCheck size={15} /> Self-custody first</span><button className="icon-button quiet-button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={toggleSidebar}><PanelLeftClose className={sidebarCollapsed ? 'sidebar-icon-collapsed' : ''} size={18} /></button></div></div>
        {section === 'overview' && <Overview prices={prices} priceState={priceState} connectedWallets={connectedWallets} onNavigate={changeSection} refresh={refreshPrices} />}
        {section === 'markets' && <Markets prices={prices} state={priceState} refresh={refreshPrices} />}
        {section === 'trade' && <Trade prices={prices} amount={amount} setAmount={setAmount} onToast={setToast} connectedWallets={connectedWallets} onNavigate={changeSection} />}
        {section === 'alpha' && <Alpha prices={prices} state={priceState} onNavigate={changeSection} />}
        {section === 'exchange' && <Exchange services={filteredServices} state={serviceState} query={query} setQuery={setQuery} category={category} setCategory={setCategory} refresh={refreshServices} />}
        {section === 'wallet' && <Wallets onToast={setToast} standardWallets={standardWallets} evmProviders={evmProviders} connectedWallets={connectedWallets} onConnectSolana={connectStandard} onConnectEvm={connectEvm} onDisconnectExternal={disconnectExternal} onRescanWallets={rescanWalletProviders} />}
        {section === 'bots' && <BotsWorkspace prices={prices} services={services} onToast={setToast} onNavigate={changeSection} />}
        {section === 'payments' && <Payments amount={amount} setAmount={setAmount} onToast={setToast} onNavigate={setSection} connectedWallets={connectedWallets} />}
        {section === 'identity' && <Identity authenticated={isAuthenticated} onDockLogin={() => {
          if (authEnvironmentMismatch) { setToast('Dock sign-in is unavailable until production identity is configured.'); return }
          if (authEnabled) void loginWithRedirect({ authorizationParams: authConfig.dockConnection ? { connection: authConfig.dockConnection } : undefined, appState: { returnTo: window.location.pathname + window.location.hash }, ...(nativeAuth ? { openUrl: async (url: string) => { await Browser.open({ url, windowName: '_self' }) } } : {}) })
        }} />}
        {section === 'ask' && <Ask services={services} />}
        <footer className="page-footer"><span>PrivateDAO Wallet <span className="footer-dot">·</span> Private by design <span className="footer-dot">·</span> <a href={`${import.meta.env.BASE_URL}terms.html`}>Terms</a> <span className="footer-dot">·</span> <a href={`${import.meta.env.BASE_URL}privacy.html`}>Privacy</a>{authEnabled && <span className="auth0-attribution"><img src={`${import.meta.env.BASE_URL}assets/auth0-logo.png`} alt="" /> Powered by Auth0</span>}</span><span>Prices from CoinGecko <span className="footer-dot">·</span> {priceState === 'live' ? 'Updated just now' : 'Market feed status shown above'}</span></footer>
      </div>
    </main>
    <nav className="mobile-tabs" aria-label="Quick navigation">{(['overview','markets','trade','wallet'] as Section[]).map(id => { const item = navItems.find(nav => nav.id === id)!; return <button key={id} className={section === id ? 'selected' : ''} onClick={() => changeSection(id)}><item.icon size={19} /><span>{item.label}</span></button> })}</nav>
    {menuOpen && <nav className="floating-menu" aria-label="Quick navigation"><div className="floating-menu-heading"><b>Go to</b><kbd>ESC</kbd></div>{navItems.map(item => <button key={item.id} onClick={() => { changeSection(item.id); setMenuOpen(false) }}><item.icon size={15} /><span>{item.label}</span></button>)}</nav>}
    {toast && <div className="toast" role="status"><span className="toast-mark"><Mark size={20} /></span>{toast}<button aria-label="Dismiss" onClick={() => setToast('')}><X size={15} /></button></div>}
    <button className="shortcut-trigger" aria-label="Open quick navigation" aria-expanded={menuOpen} title="Quick navigation · Ctrl/⌘ K" onClick={() => setMenuOpen(open => !open)}><Command size={15} /></button>
    {featured && <span className="sr-only">Solana {formatUsdPrice(featured.price)} {featured.change.toFixed(2)} percent 24 hour change</span>}
  </div>
}

function Identity({ authenticated, onDockLogin }: { authenticated: boolean; onDockLogin: () => void }) {
  const persona = window.PDAO_CONFIG.persona
  const [personaState, setPersonaState] = useState<{ inquiryId: string; status: string } | null>(null)
  const [ready, setReady] = useState(false)
  const canStartPersona = Boolean(persona.templateId && persona.environmentId)

  return <div className="identity-layout">
    <section className="identity-hero card-surface">
      <div className="identity-orbit"><div /><div /><span><Fingerprint size={31} /></span></div>
      <div><span className="small-label">PRIVATE, USER-CHOSEN IDENTITY</span><h2>Proof without a heavier footprint.</h2><p>Keep everyday wallet use open. Bring a verified credential only when the service or account flow you choose asks for one.</p>
        <div className="identity-pills"><span><ShieldCheck size={14} /> You choose when</span><span><LockKeyhole size={14} /> Wallet keys stay local</span></div>
      </div>
    </section>
    <div className="identity-provider-grid">
      <section className="identity-provider card-surface">
        <div className="identity-provider-head"><span className="identity-provider-icon persona-icon">P</span><span className="service-live"><i /> PERSONA</span></div>
        <h3>Identity verification</h3><p>Start a Persona inquiry for individual or business verification. It opens only when you choose it.</p>
        {personaState ? <div className="identity-result"><span className="status-light live" /> Inquiry {personaState.status.replaceAll('_', ' ')}<code>{personaState.inquiryId}</code><small>Persona’s inquiry status is shown as returned; this app does not convert completion into approval.</small></div> : canStartPersona ? <div className="persona-frame-wrap">{!ready && <div className="persona-loading"><Fingerprint size={20} /> Preparing your private inquiry…</div>}<PersonaReact templateId={persona.templateId} environmentId={persona.environmentId} onReady={() => setReady(true)} onComplete={({ inquiryId, status }) => setPersonaState({ inquiryId, status })} onCancel={() => setReady(false)} /></div> : <div className="identity-configure"><span className="status-light" /><div><b>Persona is ready to connect</b><small>Set the public inquiry template and environment IDs in runtime configuration to launch your published Persona flow.</small></div></div>}
        <div className="identity-provider-foot"><ShieldCheck size={14} /> Verification is an optional service choice, not a wallet-access requirement.</div>
      </section>
      <section className="identity-provider card-surface">
        <div className="identity-provider-head"><span className="identity-provider-icon dock-icon">D</span><span className={`service-live ${authenticated ? '' : 'identity-muted'}`}><i /> {authenticated ? 'AUTHENTICATED' : 'DECENTRALIZED ID'}</span></div>
        <h3>Dock Web3 ID</h3><p>Sign in with a DID from Dock Wallet through the Auth0 connection configured for this application.</p>
        <div className="dock-flow"><span>01</span><div><b>Choose Dock in sign-in</b><small>Auth0 opens its Universal Login and returns to this wallet.</small></div><ArrowRight size={15} /><span>02</span><div><b>Approve with your Dock Wallet</b><small>Scan the QR and approve the DID credential in Dock.</small></div></div>
        <button className="button-primary identity-action" onClick={onDockLogin}><Fingerprint size={16} /> Continue with Dock Web3 ID <ArrowUpRight size={15} /></button>
        <div className="identity-provider-foot"><ShieldCheck size={14} /> DID sign-in shares a verifiable credential; it does not expose the wallet recovery phrase.</div>
      </section>
    </div>
  </div>
}

function Welcome({ onEnter }: { onEnter: () => void }) {
  return <main className="welcome-screen"><div className="welcome-grain" /><header className="welcome-top"><div className="welcome-brand"><Mark size={42} /><span><b>PrivateDAO</b><small>WALLET</small></span></div><div className="welcome-status"><i /> PRIVATE BY DESIGN</div></header><section className="welcome-content"><div className="welcome-copy"><div className="eyebrow welcome-eyebrow"><span className="eyebrow-dot" />A MORE CONSIDERED FINANCIAL WORLD</div><h1>A quieter way<br />to <em>hold value.</em></h1><p>Your assets and decisions, gathered in a private space made for clarity. Enter when you’re ready.</p><button className="welcome-cta" onClick={onEnter}>Enter your wallet <ArrowRight size={18} /></button><div className="welcome-assurance"><ShieldCheck size={16} /><span>Self-custody, at the center</span><span className="assurance-sep">·</span><span>Your keys stay yours</span></div></div><div className="welcome-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="art-glow" /><div className="welcome-plaque"><Mark size={82} /><span>PrivateDAO</span><small>Your world, in your hands.</small><div className="plaque-rule" /><div className="plaque-foot"><span>SELF CUSTODY</span><span>EST. ON CHAIN</span></div></div><div className="floating-stat stat-one"><span>ASSETS</span><b>Held by you</b><ShieldCheck size={17} /></div><div className="floating-stat stat-two"><span>DESIGNED FOR</span><b>Clarity <Sparkles size={14} /></b></div></div></section><div className="welcome-bottom"><span>PORTFOLIO <i /> MARKETS <i /> PRIVATEPAY <i /> INTELLIGENCE</span><span>SCROLL TO BEGIN <span className="scroll-line" /></span></div></main>
}

function MarketTicker({ prices, state, refresh }: { prices: Market[]; state: string; refresh: () => void }) {
  return <div className="market-ticker"><div className="ticker-status"><span className={`status-light ${state === 'live' ? 'live' : ''}`} />{state === 'live' ? 'LIVE MARKET DATA' : state === 'loading' ? 'CONNECTING TO MARKET' : 'MARKET FEED UNAVAILABLE'}</div>{(prices.length ? prices.slice(0, 4) : []).map(coin => <div className="ticker-coin" key={coin.id}><img src={coin.image} alt="" /><b>{coin.symbol}</b><span>{formatUsdPrice(coin.price)}</span><small className={coin.change >= 0 ? 'positive' : 'negative'}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</small></div>)}{state !== 'live' && <span className="ticker-note">{state === 'unavailable' ? 'Prices will appear when the provider responds.' : 'Fetching latest prices…'}</span>}<button className="ticker-refresh" onClick={refresh}><RefreshCw size={14} /> Refresh</button></div>
}

function Overview({ prices, priceState, connectedWallets, onNavigate, refresh }: { prices: Market[]; priceState: string; connectedWallets: ConnectedExternalWallet[]; onNavigate: (s: Section) => void; refresh: () => void }) {
  const [localWallets, setLocalWallets] = useState<WalletRecord[]>([])
  const [balances, setBalances] = useState<PortfolioBalance[]>([])
  const [tokenBalances, setTokenBalances] = useState<SolanaTokenBalance[]>([])
  const [tokenReadState, setTokenReadState] = useState<'idle' | 'loading' | 'live' | 'partial' | 'unavailable'>('idle')
  const [balanceState, setBalanceState] = useState<'empty' | 'loading' | 'live' | 'partial' | 'unavailable'>('loading')
  const [observed, setObserved] = useState('')
  useEffect(() => { void import('./lib/walletVault').then(({ listWallets }) => listWallets()).then(setLocalWallets).catch(() => setLocalWallets([])) }, [])
  const solanaAddresses = [...localWallets.map(wallet => wallet.solanaAddress), ...connectedWallets.filter((wallet): wallet is Extract<ConnectedExternalWallet, { chain: 'solana' }> => wallet.chain === 'solana').map(wallet => wallet.address)]
  const ethereumAddresses = [...localWallets.map(wallet => wallet.evmAddress), ...connectedWallets.filter((wallet): wallet is Extract<ConnectedExternalWallet, { chain: 'evm' }> => wallet.chain === 'evm' && wallet.chainId.toLowerCase() === '0x1').map(wallet => wallet.address)]
  const addressKey = [...new Set([...solanaAddresses.map(address => `sol:${address}`), ...ethereumAddresses.map(address => `eth:${address}`)])].sort().join('|')
  const refreshBalances = async () => {
    if (!addressKey) { setBalances([]); setTokenBalances([]); setBalanceState('empty'); setTokenReadState('idle'); setObserved(''); return }
    setBalanceState('loading')
    setTokenReadState(solanaAddresses.length ? 'loading' : 'idle')
    try {
      const [result, tokenResult] = await Promise.all([
        readPortfolioBalances({ solana: solanaAddresses, ethereum: ethereumAddresses }),
        readSolanaTokenBalances(solanaAddresses),
      ])
      setBalances(result)
      setTokenBalances(tokenResult.tokens)
      setTokenReadState(tokenResult.checked ? tokenResult.failed ? 'partial' : 'live' : solanaAddresses.length ? 'unavailable' : 'idle')
      setObserved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setBalanceState(result.length && result.some(item => item.amount !== null) ? result.some(item => item.error) ? 'partial' : 'live' : 'unavailable')
    } catch { setBalanceState('unavailable'); setTokenReadState(solanaAddresses.length ? 'unavailable' : 'idle') }
  }
  useEffect(() => { void refreshBalances() }, [addressKey])
  const assets = (['SOL', 'ETH'] as const).map(symbol => {
    const network = symbol === 'SOL' ? 'solana-mainnet' : 'ethereum-mainnet'
    const entries = balances.filter(item => item.network === network)
    const price = prices.find(item => item.id === (symbol === 'SOL' ? 'solana' : 'ethereum'))?.price
    const knownEntries = entries.filter(item => item.amount !== null)
    const amount = knownEntries.length ? knownEntries.reduce((sum, item) => sum + Number(item.amount), 0) : null
    return { symbol, network: symbol === 'SOL' ? 'Solana · Mainnet' : 'Ethereum · Mainnet', entries, amount, price, usd: amount !== null && price !== undefined ? amount * price : null }
  }).filter(asset => asset.entries.length)
  const totalValue = assets.reduce((sum, asset) => sum + (asset.usd ?? 0), 0)
  const hasKnownValue = assets.some(asset => asset.usd !== null)
  const missingPrice = assets.some(asset => asset.amount !== null && asset.price === undefined)
  const incomplete = balanceState === 'partial' || assets.some(asset => asset.amount === null) || (hasKnownValue && missingPrice)
  const displayedValue = hasKnownValue ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalValue) : '—'
  const balanceMessage = !addressKey ? 'Connect a wallet to view live holdings' : balanceState === 'loading' ? 'Reading confirmed network balances…' : balanceState === 'unavailable' ? 'Network balance is unavailable. No zero balance is assumed.' : !hasKnownValue && missingPrice && balanceState !== 'partial' ? `Balances confirmed · live prices unavailable · checked ${observed || 'just now'}` : incomplete ? 'Partial live value · one or more network readings are unavailable' : `${assets.length} network${assets.length === 1 ? '' : 's'} · checked ${observed || 'just now'}`
  return <div className="overview-grid"><section className="balance-card"><div className="balance-top"><div><span className="small-label">{hasKnownValue && incomplete ? 'KNOWN PORTFOLIO VALUE' : 'TOTAL PORTFOLIO VALUE'}</span><div className="balance-total"><span className="currency-sign">$</span><span>{hasKnownValue ? `${incomplete ? '≈ ' : ''}${displayedValue}` : '—'}</span></div><div className="balance-note"><span className={`neutral-dot ${balanceState === 'live' ? 'balance-live-dot' : ''}`} />{balanceMessage}</div></div><button className="balance-more" onClick={() => { void refreshBalances(); refresh() }} aria-label="Refresh portfolio balances and market prices"><RefreshCw size={17} /></button></div><div className="balance-ambient" aria-hidden="true" /><div className="balance-bottom"><span><i className="chart-dot" /> Live network balances · market value is an estimate</span><span className="period-chip">USD <ChevronDown size={12} /></span></div></section><section className="quick-actions card-surface"><div className="section-card-heading"><div><span className="small-label">YOUR WALLET</span><h2>Make room for possibility.</h2></div><span className="heading-icon"><Wallet size={17} /></span></div><p className="muted-paragraph">Create a self-custody wallet or connect one you already own. Your recovery phrase remains on this device.</p><div className="wallet-cta-row"><button className="button-primary" onClick={() => onNavigate('wallet')}><Plus size={16} /> Create wallet</button><button className="button-secondary" onClick={() => onNavigate('wallet')}>Connect wallet <ArrowUpRight size={15} /></button></div><div className="action-separator" /><div className="short-actions"><button onClick={() => onNavigate('trade')}><span><ArrowLeftRight size={17} /></span><b>Trade</b><small>Review a live quote</small></button><button onClick={() => onNavigate('payments')}><span><ArrowUpRight size={17} /></span><b>Pay privately</b><small>Use a provider quote</small></button><button onClick={() => onNavigate('markets')}><span><Activity size={17} /></span><b>Explore markets</b><small>Live market data</small></button></div></section>{addressKey && <section className="portfolio-holdings card-surface"><div className="section-card-heading"><div><span className="small-label">YOUR ASSETS</span><h2>Balances by network</h2></div><span className="holdings-observed"><i className={`status-light ${balanceState === 'live' ? 'live' : ''}`} />{balanceState === 'loading' ? 'Updating' : observed ? `Checked ${observed}` : 'Not available'}</span></div>{assets.map(asset => <article className="holding-row" key={asset.symbol}><span className={`holding-token ${asset.symbol === 'SOL' ? 'solana-token' : 'ethereum-token'}`}>{asset.symbol === 'SOL' ? 'S' : 'Ξ'}</span><span className="holding-name"><b>{asset.symbol === 'SOL' ? 'Solana' : 'Ethereum'}</b><small>{asset.network} · {asset.entries.reduce((count, item) => count + item.addresses, 0)} address{asset.entries.reduce((count, item) => count + item.addresses, 0) === 1 ? '' : 'es'}</small></span><span className="holding-amount"><b>{asset.amount === null ? '—' : `${asset.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${asset.symbol}`}</b><small>{asset.usd === null ? 'Live price unavailable' : money(asset.usd, 2)}</small></span><span className={`holding-state ${asset.entries.some(item => item.error) ? 'is-partial' : ''}`}>{asset.entries.every(item => item.amount !== null) ? 'Confirmed' : 'Partial'}</span></article>)}{tokenBalances.map(token => <article className="holding-row" key={`spl:${token.mint}`}><span className="holding-token spl-token">◈</span><span className="holding-name"><b>{token.mint.slice(0, 5)}…{token.mint.slice(-5)}</b><small>Solana token · {token.owners} wallet{token.owners === 1 ? '' : 's'} · {token.accounts} account{token.accounts === 1 ? '' : 's'}</small></span><span className="holding-amount"><b>{Number(token.amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}</b><small>Mint verified on-chain · price unavailable</small></span><span className="holding-state">Confirmed</span></article>)}{tokenReadState === 'loading' && <div className="holdings-message">Reading SPL and Token-2022 balances…</div>}{tokenReadState === 'unavailable' && <div className="holdings-message">Token balances could not be read from this Solana RPC. No token value is assumed.</div>}{tokenReadState === 'partial' && <div className="holdings-message">Some connected Solana addresses could not be read. Token balances may be incomplete.</div>}{!assets.length && !tokenBalances.length && <div className="holdings-message">{balanceState === 'loading' ? 'Loading wallet balances…' : 'Balances could not be loaded from the selected networks.'}</div>}<div className="holdings-foot">Read-only public balance requests to Solana and Ethereum mainnet RPCs. No signing or wallet secrets are involved.</div></section>}<section className="market-card card-surface"><div className="section-card-heading"><div><span className="small-label">MARKET WATCH</span><h2>Today’s movement</h2></div><button className="text-action" onClick={() => onNavigate('markets')}>All markets <ArrowRight size={14} /></button></div>{priceState === 'live' ? <div className="mini-market-list">{prices.slice(0, 4).map(coin => <div className="mini-market-row" key={coin.id}><img src={coin.image} alt="" /><span className="coin-name"><b>{coin.name}</b><small>{coin.symbol}</small></span><div className="mini-spark"><Sparkline data={coin.sparkline?.slice(-24)} positive={coin.change >= 0} /></div><span className="coin-quote"><b>{formatUsdPrice(coin.price)}</b><small className={coin.change >= 0 ? 'positive' : 'negative'}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</small></span></div>)}</div> : <div className="empty-feed"><Activity size={20} /><span>{priceState === 'loading' ? 'Gathering market data…' : 'Market data is temporarily unavailable.'}</span><button onClick={refresh}>Try again</button></div>}</section><section className="insight-card"><div className="insight-orb"><Sparkles size={21} /></div><div><span className="small-label">A MOMENT OF CLARITY</span><h2>See the whole picture.</h2><p>Market movement and wallet intelligence, together when you’re ready.</p></div><button aria-label="Explore alpha" onClick={() => onNavigate('alpha')}><ArrowUpRight size={19} /></button></section><section className="service-preview card-surface"><div className="section-card-heading"><div><span className="small-label">PDAO ECOSYSTEM</span><h2>Intelligence, on demand.</h2></div><span className="service-live"><i /> LIVE</span></div><div className="service-preview-content"><div className="service-orbit"><div className="orbit-ring ring-a" /><div className="orbit-ring ring-b" /><div className="orbit-center"><Mark size={34} /></div><Sparkles className="orbit-spark spark-a" size={15} /><ShieldCheck className="orbit-spark spark-b" size={16} /></div><div><p>Explore privacy-first verification, research and risk services from the PDAO Agent Exchange.</p><button className="button-secondary" onClick={() => onNavigate('exchange')}>Explore services <ArrowRight size={15} /></button></div></div></section></div>
}

function Markets({ prices, state, refresh }: { prices: Market[]; state: string; refresh: () => void }) {
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'Trending' | 'Top volume' | 'Watchlist'>('Trending')
  const [watchlist, setWatchlist] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('pdao-market-watchlist') ?? '[]') as string[] } catch { return [] } })
  const toggleWatch = (id: string) => setWatchlist(current => { const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id]; localStorage.setItem('pdao-market-watchlist', JSON.stringify(next)); return next })
  const filtered = prices.filter(coin => `${coin.name} ${coin.symbol}`.toLowerCase().includes(search.toLowerCase()))
  const visible = (mode === 'Watchlist' ? filtered.filter(coin => watchlist.includes(coin.id)) : [...filtered].sort(mode === 'Top volume' ? (a, b) => b.volume - a.volume : (a, b) => Math.abs(b.change) - Math.abs(a.change)))
  return <><NetworkHealth /><section className="data-page card-surface"><div className="data-toolbar"><div className="market-tabs">{(['Trending','Top volume','Watchlist'] as const).map(tab => <button key={tab} className={mode === tab ? 'tab-active' : ''} onClick={() => setMode(tab)}>{tab}</button>)}</div><label className="search-field"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets" /><kbd>/</kbd></label></div><div className="data-table market-table"><div className="table-head"><span>ASSET</span><span>7D TREND</span><span>PRICE</span><span>24H</span><span>24H VOLUME</span><span /></div>{visible.map((coin, index) => <div className="table-row" key={coin.id}><span className="asset-cell"><span className="rank">{String(index + 1).padStart(2, '0')}</span><img src={coin.image} alt="" /><span><b>{coin.name}</b><small>{coin.symbol}</small></span></span><span className="table-spark"><Sparkline data={coin.sparkline} positive={coin.change >= 0} /></span><b className="mono-value">{formatUsdPrice(coin.price)}</b><span className={coin.change >= 0 ? 'positive' : 'negative'}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</span><span className="mono-value muted-value">{money(coin.volume, 0)}</span><button className="watch-toggle" onClick={() => toggleWatch(coin.id)} aria-label={`${watchlist.includes(coin.id) ? 'Remove' : 'Add'} ${coin.name} ${watchlist.includes(coin.id) ? 'from' : 'to'} watchlist`}><Star size={15} fill={watchlist.includes(coin.id) ? 'currentColor' : 'none'} /></button></div>)}{state !== 'live' && <div className="table-empty"><Activity size={19} /><b>{state === 'loading' ? 'Loading live market data' : 'Live market feed is unavailable'}</b><p>Prices are never replaced with sample values.</p><button className="button-secondary" onClick={refresh}><RefreshCw size={14} /> Refresh prices</button></div>}{state === 'live' && visible.length === 0 && <div className="table-empty">{mode === 'Watchlist' ? 'Your watchlist is ready. Star an asset to keep it here.' : 'No assets match this search.'}</div>}</div><div className="table-foot"><span><i className={`status-light ${state === 'live' ? 'live' : ''}`} />{state === 'live' ? 'Live market data' : 'Waiting for provider'}</span><span>Source: CoinGecko <span className="footer-dot">·</span> Market prices are informational</span></div></section></>
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

type JupiterOrder = { transaction: string | null; requestId: string; inAmount?: string; outAmount?: string; router?: string; feeBps?: number; feeMint?: string; platformFee?: { amount?: string; feeBps?: number; feeMint?: string }; signatureFeePayer?: string; gasless?: boolean; transactionVersion?: number; lastValidBlockHeight?: number; expireAt?: string; errorCode?: number; errorMessage?: string }
type JupiterExecution = { status: 'Success' | 'Failed'; signature?: string; code?: number; error?: string; totalInputAmount?: string; totalOutputAmount?: string }
const swapAssets = {
  SOL: { mint: 'So11111111111111111111111111111111111111112', decimals: 9 },
  USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
} as const

function parseTokenAmount(value: string, decimals: number): string {
  if (!/^\d+(\.\d*)?$/.test(value.trim())) throw new Error('Enter a valid positive amount.')
  const [whole, fraction = ''] = value.trim().split('.')
  if (fraction.length > decimals) throw new Error(`This asset supports up to ${decimals} decimal places.`)
  const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0')
  if (units <= 0n) throw new Error('Enter a positive amount.')
  return units.toString()
}

function formatTokenAmount(value: string | undefined, decimals: number): string {
  if (!value || !/^\d+$/.test(value)) return '—'
  const units = BigInt(value), scale = 10n ** BigInt(decimals)
  const whole = units / scale, fraction = (units % scale).toString().padStart(decimals, '0').slice(0, 6).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

type TransferAccount = { id: string; chain: 'solana' | 'evm'; name: string; address: string; local?: WalletRecord; external?: ConnectedExternalWallet }
const transferSolanaRpc = ['https://api.mainnet.solana.com', 'https://solana-rpc.publicnode.com']
const transferEvmRpc = ['https://cloudflare-eth.com', 'https://ethereum-rpc.publicnode.com']

async function transferRpc<T>(endpoints: string[], method: string, params: unknown[]): Promise<T> {
  let lastError: Error | undefined
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(12000) })
      const body = await response.json() as { result?: T; error?: { message?: string } }
      if (!response.ok || body.error || body.result === undefined) throw new Error(body.error?.message ?? `Network RPC returned HTTP ${response.status}.`)
      return body.result
    } catch (reason) { lastError = reason instanceof Error ? reason : new Error('Network RPC unavailable.') }
  }
  throw lastError ?? new Error('Network RPC unavailable.')
}

function parseNativeAmount(value: string, decimals: number): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value.trim())) throw new Error('Enter a valid positive amount.')
  const [whole, fraction = ''] = value.trim().split('.')
  if (fraction.length > decimals) throw new Error(`Use no more than ${decimals} decimal places.`)
  const amount = BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0')
  if (amount <= 0n) throw new Error('Enter a positive amount.')
  return amount
}

function SendNative({ records, connectedWallets }: { records: WalletRecord[]; connectedWallets: ConnectedExternalWallet[] }) {
  const accounts: TransferAccount[] = [
    ...records.flatMap(local => [{ id: `local:sol:${local.id}`, chain: 'solana' as const, name: 'PrivateDAO · Solana', address: local.solanaAddress, local }, { id: `local:evm:${local.id}`, chain: 'evm' as const, name: 'PrivateDAO · Ethereum', address: local.evmAddress, local }]),
    ...connectedWallets.filter((wallet): wallet is Extract<ConnectedExternalWallet, { chain: 'solana' }> => wallet.chain === 'solana').map(external => ({ id: external.id, chain: 'solana' as const, name: `${external.name} · Solana`, address: external.address, external })),
    ...connectedWallets.filter((wallet): wallet is Extract<ConnectedExternalWallet, { chain: 'evm' }> => wallet.chain === 'evm').map(external => ({ id: external.id, chain: 'evm' as const, name: `${external.name} · Ethereum`, address: external.address, external })),
  ]
  const [accountId, setAccountId] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [review, setReview] = useState<{ fee: string; gasLimit?: bigint; gasPrice?: bigint; nonce?: bigint; blockhash?: string; lastValidBlockHeight?: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [signature, setSignature] = useState('')
  const selected = accounts.find(item => item.id === accountId) ?? accounts[0]

  const prepare = async () => {
    setBusy(true); setError(''); setReview(null); setSignature('')
    try {
      if (!selected) throw new Error('Create or connect a wallet to send assets.')
      if (selected.chain === 'evm' && selected.external?.chain === 'evm' && selected.external.chainId.toLowerCase() !== '0x1') throw new Error('Switch the connected wallet to Ethereum Mainnet before sending ETH.')
      const amountRaw = parseNativeAmount(amount, selected.chain === 'solana' ? 9 : 18)
      if (selected.chain === 'solana') {
        const to = new PublicKey(recipient.trim())
        const { blockhash, lastValidBlockHeight } = await transferRpc<{ blockhash: string; lastValidBlockHeight: number }>(transferSolanaRpc, 'getLatestBlockhash', [{ commitment: 'confirmed' }])
        const transaction = new Transaction({ feePayer: new PublicKey(selected.address), recentBlockhash: blockhash as Transaction['recentBlockhash'] }).add(SystemProgram.transfer({ fromPubkey: new PublicKey(selected.address), toPubkey: to, lamports: amountRaw }))
        const feeResponse = await transferRpc<{ value: number | null }>(transferSolanaRpc, 'getFeeForMessage', [BufferlessBase64(transaction.compileMessage().serialize()), { commitment: 'confirmed' }])
        if (feeResponse.value === null) throw new Error('Solana did not return a current network fee estimate. Try reviewing the transfer again.')
        const fee = BigInt(feeResponse.value)
        const balance = BigInt(await transferRpc<number>(transferSolanaRpc, 'getBalance', [selected.address, { commitment: 'confirmed' }]))
        if (balance < amountRaw + fee) throw new Error('The wallet balance does not cover the amount and network fee.')
        setReview({ fee: `${Number(fee) / 1e9} SOL`, blockhash, lastValidBlockHeight })
      } else {
        if (!/^0x[\da-f]{40}$/i.test(recipient.trim())) throw new Error('Enter a valid Ethereum address.')
        const to = getAddress(recipient.trim())
        const value = `0x${amountRaw.toString(16)}`
        const tx = { from: selected.address, to, value }
        const gasHex = await (selected.external?.chain === 'evm' ? selected.external.provider.request({ method: 'eth_estimateGas', params: [tx] }) : transferRpc<string>(transferEvmRpc, 'eth_estimateGas', [tx])) as string
        const gasPriceHex = await (selected.external?.chain === 'evm' ? selected.external.provider.request({ method: 'eth_gasPrice' }) : transferRpc<string>(transferEvmRpc, 'eth_gasPrice', [])) as string
        const balanceHex = await (selected.external?.chain === 'evm' ? selected.external.provider.request({ method: 'eth_getBalance', params: [selected.address, 'latest'] }) : transferRpc<string>(transferEvmRpc, 'eth_getBalance', [selected.address, 'latest'])) as string
        const nonceHex = await (selected.external?.chain === 'evm' ? selected.external.provider.request({ method: 'eth_getTransactionCount', params: [selected.address, 'pending'] }) : transferRpc<string>(transferEvmRpc, 'eth_getTransactionCount', [selected.address, 'pending'])) as string
        const gasLimit = BigInt(gasHex) * 12n / 10n
        const gasPrice = BigInt(gasPriceHex)
        const fee = gasLimit * gasPrice
        if (BigInt(balanceHex) < amountRaw + fee) throw new Error('The wallet balance does not cover the amount and estimated network fee.')
        setReview({ fee: `${formatEther(fee)} ETH (estimate)`, gasLimit, gasPrice, nonce: BigInt(nonceHex) })
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not prepare this transfer.') }
    finally { setBusy(false) }
  }

  const send = async () => {
    if (!selected || !review) return
    setBusy(true); setError('')
    try {
      const amountRaw = parseNativeAmount(amount, selected.chain === 'solana' ? 9 : 18)
      if (selected.chain === 'solana') {
        const currentBlockHeight = await transferRpc<number>(transferSolanaRpc, 'getBlockHeight', [{ commitment: 'confirmed' }])
        if (currentBlockHeight > (review.lastValidBlockHeight ?? 0)) throw new Error('The Solana review expired. Request a fresh review before signing.')
        const transaction = new Transaction({ feePayer: new PublicKey(selected.address), recentBlockhash: review.blockhash as Transaction['recentBlockhash'] }).add(SystemProgram.transfer({ fromPubkey: new PublicKey(selected.address), toPubkey: new PublicKey(recipient.trim()), lamports: amountRaw }))
        const unsigned = await transaction.serialize({ requireAllSignatures: false, verifySignatures: false })
        const prepared: PreparedSolanaTransaction = { transactionBase64: BufferlessBase64(unsigned), version: 'legacy', requiredSigners: [selected.address] }
        const signed = selected.external?.chain === 'solana'
          ? await signWithExternalSolanaWallet(selected.external, prepared)
          : selected.local ? await (await import('./lib/walletVault')).signPreparedSolanaTransaction(selected.local, passphrase, prepared, selected.address) : (() => { throw new Error('No signer is available for this wallet.') })()
        const wire = Uint8Array.from(atob(signed), char => char.charCodeAt(0))
        const sig = await transferRpc<string>(transferSolanaRpc, 'sendTransaction', [BufferlessBase64(wire), { encoding: 'base64', preflightCommitment: 'confirmed', maxRetries: 2 }])
        let confirmed = false
        for (let attempt = 0; attempt < 20; attempt++) {
          const status = await transferRpc<{ value: Array<{ confirmationStatus?: string; err?: unknown } | null> }>(transferSolanaRpc, 'getSignatureStatuses', [[sig], { searchTransactionHistory: true }])
          const item = status.value[0]
          if (item?.err) throw new Error('The Solana transaction failed on-chain.')
          if (item?.confirmationStatus === 'confirmed' || item?.confirmationStatus === 'finalized') { confirmed = true; break }
          await new Promise(resolve => window.setTimeout(resolve, 1500))
        }
        if (!confirmed) throw new Error(`Transaction submitted but confirmation is still pending. Signature: ${sig}`)
        setSignature(sig)
      } else {
        const tx = { from: selected.address, to: getAddress(recipient.trim()), value: `0x${amountRaw.toString(16)}`, gas: `0x${review.gasLimit!.toString(16)}`, gasPrice: `0x${review.gasPrice!.toString(16)}`, chainId: '0x1' }
        let hash: string
        if (selected.external?.chain === 'evm') hash = String(await selected.external.provider.request({ method: 'eth_sendTransaction', params: [tx] }))
        else if (selected.local) {
          const raw = await (await import('./lib/walletVault')).signNativeEvmTransaction(selected.local, passphrase, { to: tx.to, value: tx.value, gasLimit: review.gasLimit, gasPrice: review.gasPrice, chainId: 1, nonce: Number(review.nonce) })
          hash = await transferRpc<string>(transferEvmRpc, 'eth_sendRawTransaction', [raw])
        } else throw new Error('No signer is available for this wallet.')
        let receipt: { status?: string } | null = null
        for (let attempt = 0; attempt < 30; attempt++) {
          receipt = await transferRpc<{ status?: string } | null>(transferEvmRpc, 'eth_getTransactionReceipt', [hash])
          if (receipt) break
          await new Promise(resolve => window.setTimeout(resolve, 2000))
        }
        if (!receipt) throw new Error(`Transaction submitted but confirmation is still pending. Hash: ${hash}`)
        if (receipt.status !== '0x1') throw new Error('The Ethereum transaction did not return a successful execution status.')
        setSignature(hash)
      }
      setReview(null); setPassphrase(''); setAmount(''); setRecipient('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Transfer could not be confirmed.') }
    finally { setBusy(false) }
  }

  return <section className="send-native card-surface"><div className="section-card-heading"><div><span className="small-label">NATIVE TRANSFER</span><h2>Send assets</h2></div><span className="heading-icon"><ArrowUpRight size={17} /></span></div>
    {!accounts.length ? <div className="holdings-message">Create a local wallet or connect a Solana/EVM wallet to send native assets.</div> : <>
      <label className="send-field">From wallet<select value={selected?.id ?? ''} onChange={event => { setAccountId(event.target.value); setReview(null) }}>{accounts.map(item => <option key={item.id} value={item.id}>{item.name} · {item.address.slice(0, 6)}…{item.address.slice(-4)}</option>)}</select></label>
      <label className="send-field">Recipient address<input value={recipient} onChange={event => { setRecipient(event.target.value); setReview(null) }} placeholder={selected?.chain === 'solana' ? 'Solana address' : '0x…'} autoComplete="off" spellCheck={false} /></label>
      <label className="send-field">Amount ({selected?.chain === 'solana' ? 'SOL' : 'ETH'})<input inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); setReview(null) }} placeholder="0.00" /></label>
      {selected?.local && <label className="send-field">Wallet passphrase<input type="password" autoComplete="current-password" value={passphrase} onChange={event => setPassphrase(event.target.value)} placeholder="Used locally to sign" /></label>}
      {review && <div className="send-review"><span>Network <b>{selected?.chain === 'solana' ? 'Solana Mainnet' : 'Ethereum Mainnet'}</b></span><span>Amount <b>{amount} {selected?.chain === 'solana' ? 'SOL' : 'ETH'}</b></span><span>Recipient <code>{recipient}</code></span><span>Estimated network fee <b>{review.fee}</b></span><button className="button-primary" onClick={() => void send()} disabled={busy || Boolean(selected?.local && !passphrase)}>{busy ? 'Waiting for network confirmation…' : 'Confirm and send'} <ArrowUpRight size={15} /></button></div>}
      {error && <p className="send-error" role="alert">{error}</p>}
      {signature && <div className="send-success"><b>Transfer confirmed on {selected?.chain === 'solana' ? 'Solana' : 'Ethereum'} Mainnet</b><a href={selected?.chain === 'solana' ? `https://solscan.io/tx/${signature}` : `https://etherscan.io/tx/${signature}`} target="_blank" rel="noreferrer">View transaction · {signature.slice(0, 12)}… <ExternalLink size={13} /></a></div>}
      {!review && !signature && <button className="button-primary send-prepare" onClick={() => void prepare()} disabled={busy || !recipient.trim() || !amount.trim() || Boolean(selected?.local && !passphrase)}>{busy ? 'Checking balance and network fee…' : 'Review transfer'} <ArrowRight size={15} /></button>}
    </>}
  </section>
}

function BufferlessBase64(bytes: Uint8Array): string { let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte) }); return btoa(binary) }

function Trade({ prices, amount, setAmount, onToast, connectedWallets, onNavigate }: { prices: Market[]; amount: string; setAmount: (s: string) => void; onToast: (s: string) => void; connectedWallets: ConnectedExternalWallet[]; onNavigate: (section: Section) => void }) {
  const [from, setFrom] = useState<'SOL' | 'USDC'>('SOL')
  const [to, setTo] = useState<'SOL' | 'USDC'>('USDC')
  const [localWallets, setLocalWallets] = useState<WalletRecord[]>([])
  const [payerId, setPayerId] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [order, setOrder] = useState<JupiterOrder | null>(null)
  const [orderTime, setOrderTime] = useState(0)
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [execution, setExecution] = useState<JupiterExecution | null>(null)
  const [outputAsset, setOutputAsset] = useState<'SOL' | 'USDC'>('USDC')

  useEffect(() => { void import('./lib/walletVault').then(({ listWallets }) => listWallets()).then(setLocalWallets).catch(() => setLocalWallets([])) }, [])
  const connectedSolana = connectedWallets.filter((wallet): wallet is Extract<ConnectedExternalWallet, { chain: 'solana' }> => wallet.chain === 'solana')
  const selectedExternal = connectedSolana.find(wallet => `external:${wallet.id}` === payerId)
  const selectedLocal = localWallets.find(wallet => `local:${wallet.id}` === payerId)
  const payerAddress = selectedExternal?.address ?? selectedLocal?.solanaAddress ?? ''
  const feeSponsored = Boolean(order?.gasless || (order?.signatureFeePayer && payerAddress && order.signatureFeePayer !== payerAddress))
  const marketAsset = prices.find(coin => coin.symbol === from)

  useEffect(() => {
    if (!payerId) {
      const preferred = connectedSolana[0] ? `external:${connectedSolana[0].id}` : localWallets[0] ? `local:${localWallets[0].id}` : ''
      if (preferred) setPayerId(preferred)
    }
  }, [payerId, connectedSolana, localWallets])

  const clearQuote = () => { setOrder(null); setExecution(null); setAccepted(false); setError('') }
  const getQuote = async () => {
    setBusy(true); setError(''); setOrder(null); setExecution(null); setAccepted(false)
    try {
      if (!payerAddress) throw new Error('Connect or select a Solana wallet first.')
      const input = swapAssets[from], output = swapAssets[to]
      const units = parseTokenAmount(amount, input.decimals)
      const params = new URLSearchParams({ inputMint: input.mint, outputMint: output.mint, amount: units, taker: payerAddress, maxSupportedTransactionVersion: '0' })
      const response = await fetch(`https://api.jup.ag/swap/v2/order?${params}`, { headers: { accept: 'application/json' } })
      const body = await response.json() as JupiterOrder
      if (!response.ok) throw new Error(body.errorMessage || `Jupiter quote returned ${response.status}.`)
      if (!body.requestId || !body.transaction) throw new Error(body.errorMessage || `Jupiter could not build this route${body.errorCode ? ` (code ${body.errorCode})` : ''}.`)
      const transaction = VersionedTransaction.deserialize(Uint8Array.from(atob(body.transaction), char => char.charCodeAt(0)))
      if (transaction.version !== 0) throw new Error(`This wallet flow supports Solana v0 transactions; Jupiter returned version ${transaction.version}.`)
      const signerKeys: string[] = transaction.message.staticAccountKeys.slice(0, transaction.message.header.numRequiredSignatures).map(key => String(key.toBase58()))
      if (!signerKeys.includes(payerAddress)) throw new Error('The returned transaction does not require the selected wallet to sign.')
      setOrder(body); setOrderTime(Date.now()); setOutputAsset(to)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not fetch a live Jupiter order.') }
    finally { setBusy(false) }
  }

  const executeSwap = async () => {
    if (!order?.transaction || !accepted || !payerAddress) return
    if (Date.now() - orderTime > 25_000) { setError('This order is no longer fresh. Request a new live quote before signing.'); clearQuote(); return }
    setBusy(true); setError('')
    try {
      const wire = Uint8Array.from(atob(order.transaction), char => char.charCodeAt(0))
      const transaction = VersionedTransaction.deserialize(wire)
      const requiredSigners: string[] = transaction.message.staticAccountKeys.slice(0, transaction.message.header.numRequiredSignatures).map(key => String(key.toBase58()))
      if (!requiredSigners.includes(payerAddress)) throw new Error('The order signer no longer matches the selected wallet.')
      const prepared: PreparedSolanaTransaction = { transactionBase64: order.transaction, version: 'v0', requiredSigners }
      let signedTransaction: string
      if (selectedExternal) signedTransaction = await signWithExternalSolanaWallet(selectedExternal, prepared)
      else if (selectedLocal) signedTransaction = await (async () => {
        const { signPreparedSolanaTransaction } = await import('./lib/walletVault')
        return signPreparedSolanaTransaction(selectedLocal, passphrase, prepared, payerAddress)
      })()
      else throw new Error('Select a connected or local Solana signer.')

      const response = await fetch('https://api.jup.ag/swap/v2/execute', {
        method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ signedTransaction, requestId: order.requestId, lastValidBlockHeight: order.lastValidBlockHeight }),
      })
      const result = await response.json() as JupiterExecution
      if (!response.ok) throw new Error(result.error || `Jupiter execution returned ${response.status}.`)
      setExecution(result)
      if (result.status !== 'Success' || result.code !== 0 || !result.signature) throw new Error(result.error || `Swap was not confirmed (Jupiter code ${result.code ?? 'unknown'}).`)
      onToast('Jupiter confirmed the swap. The chain signature is available below.')
      setPassphrase('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The swap did not execute. No successful result was reported.') }
    finally { setBusy(false) }
  }

  const outputDecimals = swapAssets[outputAsset].decimals
  return <div className="trade-layout"><section className="trade-panel card-surface">
    <div className="trade-heading"><div><span className="small-label">SOLANA MAINNET · JUPITER SWAP V2</span><h2>From one asset to another.</h2></div><button className="icon-button" aria-label="Refresh quote" onClick={getQuote} disabled={busy}><RefreshCw size={16} /></button></div>
    <div className="trade-input-card"><div className="trade-input-top"><span>You pay</span><span>Network <b>Solana</b></span></div><div className="trade-input-line"><input inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); clearQuote() }} aria-label="Amount to trade" /><select value={from} onChange={event => { setFrom(event.target.value as 'SOL' | 'USDC'); if (event.target.value === to) setTo(from === 'SOL' ? 'USDC' : 'SOL'); clearQuote() }} aria-label="Asset to pay"><option>SOL</option><option>USDC</option></select></div><div className="trade-fiat">{marketAsset && Number(amount) ? `≈ ${money(Number(amount) * marketAsset.price)}` : 'Live market value appears when available'}</div></div>
    <button className="swap-direction" aria-label="Reverse assets" onClick={() => { setFrom(to); setTo(from); clearQuote() }}><ArrowDownLeft size={17} /></button>
    <div className="trade-input-card receive-card"><div className="trade-input-top"><span>You receive</span><span>{order ? 'Jupiter estimate' : 'Live quote'}</span></div><div className="trade-input-line"><span className="receive-placeholder">{order ? formatTokenAmount(order.outAmount, outputDecimals) : '—'}</span><select value={to} onChange={event => { setTo(event.target.value as 'SOL' | 'USDC'); if (event.target.value === from) setFrom(to); clearQuote() }} aria-label="Asset to receive"><option>USDC</option><option>SOL</option></select></div><div className="trade-fiat">{order ? `Estimated ${to} from Jupiter · RTSE slippage` : 'Expected output appears after a fresh provider quote'}</div></div>
    <div className="trade-details"><span>Route <b>{order?.router ?? 'All Jupiter routers'}</b></span><span>Provider fee <b>{order ? `${order.feeBps ?? 0} bps${order.platformFee?.feeBps != null ? ` · Jupiter ${order.platformFee.feeBps} bps` : ''}` : 'Shown in quote'}</b></span><span>Fee asset <b>{order?.feeMint === swapAssets.SOL.mint ? 'SOL' : order?.feeMint === swapAssets.USDC.mint ? 'USDC' : order?.feeMint ?? '—'}</b></span></div>
    <label className="trade-payer-select">Signing wallet<select value={payerId} onChange={event => { setPayerId(event.target.value); clearQuote() }}><option value="">Select a Solana wallet</option>{connectedSolana.map(wallet => <option value={`external:${wallet.id}`} key={wallet.id}>{wallet.name} · {wallet.address.slice(0, 6)}…{wallet.address.slice(-5)}</option>)}{localWallets.map(wallet => <option value={`local:${wallet.id}`} key={wallet.id}>PrivateDAO local · {wallet.solanaAddress.slice(0, 6)}…{wallet.solanaAddress.slice(-5)}</option>)}</select>{payerAddress && <small>{payerAddress}</small>}</label>
    {selectedLocal && <label className="trade-passphrase">Unlock this local wallet<input type="password" autoComplete="current-password" value={passphrase} onChange={event => setPassphrase(event.target.value)} placeholder="Vault passphrase" /></label>}
    {order && <div className="swap-review"><div><span className="status-light live" /><b>Review this exact live order</b><small>{order.router ?? 'Jupiter route'} · {feeSponsored ? 'sponsored network fee' : 'network fees may apply'} · re-quote after 25 seconds</small></div><dl><dt>Input</dt><dd>{amount} {from}</dd><dt>Expected output</dt><dd>{formatTokenAmount(order.outAmount, outputDecimals)} {to}</dd><dt>Signature fee payer</dt><dd>{order.signatureFeePayer === payerAddress ? 'Your wallet' : order.signatureFeePayer ?? 'Jupiter quote'}</dd><dt>Transaction fee</dt><dd>{feeSponsored ? 'Sponsored / provider-paid' : 'Paid by signer as shown in wallet'}</dd></dl><label className="swap-review-check"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /> I reviewed the amount, route and fee details.</label></div>}
    {error && <div className="form-error" role="alert">{error}</div>}
    {execution?.signature && <div className={`swap-result ${execution.status === 'Success' ? 'success' : 'failed'}`}><b>{execution.status === 'Success' ? 'Swap confirmed on Solana' : 'Swap did not confirm'}</b><a href={`https://solscan.io/tx/${execution.signature}`} target="_blank" rel="noreferrer">View transaction on Solscan <ExternalLink size={13} /></a></div>}
    {!order && <button className="button-primary trade-submit" onClick={() => payerAddress ? void getQuote() : onNavigate('wallet')} disabled={busy || from === to}>{busy ? 'Fetching Jupiter route…' : !payerAddress ? 'Choose or connect a wallet' : 'Get live Jupiter quote'}{!busy && <ArrowRight size={16} />}</button>}
    {order && <button className="button-primary trade-submit" onClick={() => void executeSwap()} disabled={busy || !accepted || Boolean(selectedLocal && !passphrase)}>{busy ? 'Waiting for wallet & Jupiter…' : 'Approve in wallet & execute'}<ArrowLeftRight size={16} /></button>}
    <p className="trade-caption"><ShieldCheck size={14} /> The selected wallet signs locally. No transaction is sent before your approval.</p>
  </section><aside className="trade-aside card-surface"><span className="small-label">LIVE EXECUTION</span><div className="execution-item"><span><Activity size={18} /></span><div><b>Competing routes</b><p>Jupiter returns the selected live router and quote details for this exact wallet and amount.</p></div></div><div className="execution-item"><span><ShieldCheck size={18} /></span><div><b>Wallet approval first</b><p>Review the app quote and your wallet’s own transaction approval before signing.</p></div></div><div className="execution-item"><span><LockKeyhole size={18} /></span><div><b>Keys stay on-device</b><p>External wallets sign in their own approval surface; local vault signing stays in this device.</p></div></div><div className="aside-market"><div className="aside-market-head"><span>MARKET SNAPSHOT</span><span className="service-live"><i /> LIVE</span></div>{prices.slice(0,3).map(coin => <div className="aside-market-row" key={coin.id}><img src={coin.image} alt="" /><b>{coin.symbol}</b><span>{formatUsdPrice(coin.price)}</span><small className={coin.change >= 0 ? 'positive' : 'negative'}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</small></div>)}</div></aside></div>
}

function Alpha({ prices, state, onNavigate }: { prices: Market[]; state: string; onNavigate: (s: Section) => void }) {
  const movers = [...prices].sort((a,b) => Math.abs(b.change) - Math.abs(a.change)).slice(0,3)
  const lead = movers[0]
  return <div className="alpha-page"><section className="alpha-hero"><div className="alpha-text"><span className="alpha-badge"><Sparkles size={14} /> MARKET PULSE</span><h2>Follow the current.<br /><em>Keep your course.</em></h2><p>Use market movement as a starting point for research. Every signal is a snapshot, not a prediction.</p><button className="button-bright" onClick={() => onNavigate('markets')}>Explore markets <ArrowRight size={16} /></button></div><div className="alpha-visual">{lead ? <div className="alpha-live-card"><div className="alpha-live-head"><span><img src={lead.image} alt="" /><span><small>LARGEST 24H MOVE</small><b>{lead.name} <i>{lead.symbol}</i></b></span></span><span className={`alpha-live-state ${lead.change >= 0 ? 'positive' : 'negative'}`}>{lead.change >= 0 ? '+' : ''}{lead.change.toFixed(2)}%</span></div><div className="alpha-live-price">{formatUsdPrice(lead.price)}</div><div className="alpha-live-chart"><Sparkline data={lead.sparkline} positive={lead.change >= 0} large /></div><div className="alpha-live-foot"><span>7-day price history</span><span>CoinGecko · USD</span></div></div> : <div className="alpha-live-empty"><Activity size={22} /><b>{state === 'loading' ? 'Reading the live market' : 'Market data is unavailable'}</b><span>{state === 'loading' ? 'The chart appears when the provider responds.' : 'Refresh the market feed to try again.'}</span></div>}</div></section><div className="alpha-metrics"><div><span>ASSETS TRACKED</span><b>{state === 'live' ? String(prices.length).padStart(2, '0') : '—'}</b></div><div><span>MARKET SOURCE</span><b>{state === 'live' ? 'COINGECKO' : 'UNAVAILABLE'}</b></div><div><span>MOVE WINDOW</span><b>24 HOURS</b></div></div><section className="alpha-movers card-surface"><div className="section-card-heading"><div><span className="small-label">NOTABLE MOVEMENT</span><h2>Where attention is gathering.</h2></div><span className="muted-caption">Largest absolute changes · 24h</span></div>{movers.length ? movers.map((coin, index) => <div className="mover-row" key={coin.id}><span className="mover-index">0{index + 1}</span><img src={coin.image} alt="" /><b>{coin.name}</b><span className="mover-chart"><Sparkline data={coin.sparkline} positive={coin.change >= 0} /></span><b className={coin.change >= 0 ? 'positive' : 'negative'}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</b></div>) : <div className="table-empty">Live data is unavailable right now.</div>}</section></div>
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

function Wallets({ onToast, standardWallets, evmProviders, connectedWallets, onConnectSolana, onConnectEvm, onDisconnectExternal, onRescanWallets }: { onToast: (s: string) => void; standardWallets: readonly StandardWallet[]; evmProviders: EvmProviderOption[]; connectedWallets: ConnectedExternalWallet[]; onConnectSolana: (wallet: StandardWallet) => void; onConnectEvm: (provider: EvmProviderOption) => void; onDisconnectExternal: (id: string) => void; onRescanWallets: () => void }) {
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
      onToast('Wallet unlocked locally. You can sign PrivatePAY transactions after reviewing their terms.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not unlock this wallet.') }
    finally { setBusy(false) }
  }
  const copyAddress = async (address: string, label: string) => {
    try { await navigator.clipboard.writeText(address); setCopyState(label); window.setTimeout(() => setCopyState(''), 1800) }
    catch { onToast('Clipboard access is unavailable in this context.') }
  }

  return <div className="wallets-layout"><section className="wallet-intro card-surface"><div className="wallet-emblem"><Mark size={50} /></div><span className="small-label">SELF CUSTODY, MADE CLEAR</span><h2>{records.length ? 'Your wallet is yours.' : 'Begin with your own keys.'}</h2><p>Create a new wallet on this device or restore one you already control. Your recovery phrase is encrypted locally with your passphrase and never sent to a server.</p><div className="wallet-buttons"><button className="button-primary" onClick={beginCreate}><Plus size={16} /> Create a new wallet</button><button className="button-secondary" onClick={beginImport}><Wallet size={16} /> Import recovery phrase</button></div>{records.length > 0 && <div className="wallet-records">{records.map(record => <article className="wallet-record" key={record.id}><div className="record-heading"><span className="record-chain"><Mark size={24} /></span><div><b>PrivateDAO wallet</b><small>Created {new Date(record.createdAt).toLocaleDateString()}</small></div><button className="record-unlock" onClick={() => { setSelected(record); setFlow('unlock') }}>Unlock wallet</button></div><div className="address-line"><span><i className="solana-dot" /> Solana</span><code>{record.solanaAddress.slice(0, 8)}…{record.solanaAddress.slice(-6)}</code><button onClick={() => void copyAddress(record.solanaAddress, 'solana')} aria-label="Copy Solana address">{copyState === 'solana' ? 'Copied' : 'Copy'}</button></div><div className="address-line"><span><i className="evm-dot" /> EVM</span><code>{record.evmAddress.slice(0, 8)}…{record.evmAddress.slice(-6)}</code><button onClick={() => void copyAddress(record.evmAddress, 'evm')} aria-label="Copy EVM address">{copyState === 'evm' ? 'Copied' : 'Copy'}</button></div><div className="record-actions"><span>{verifiedWalletId === record.id ? <><i className="status-light live" /> Wallet unlocked locally</> : 'Encrypted on this device'}</span><button onClick={() => { if (window.confirm('Remove this encrypted wallet from this device? Make sure you have your recovery phrase backed up first.')) { void import('./lib/walletVault').then(({ removeWallet }) => removeWallet(record.id)).then(() => { setRecords(items => items.filter(item => item.id !== record.id)); if (verifiedWalletId === record.id) setVerifiedWalletId(null) }) } }}>Remove</button></div></article>)}</div>}</section><aside className="wallet-security card-surface"><span className="small-label">SECURITY MODEL</span><div className="security-seal"><ShieldCheck size={31} /></div><h3>Built around your custody.</h3><ul><li><span><ShieldCheck size={16} /></span><span><b>Keys stay on your device</b><small>Recovery phrase is encrypted locally before saving.</small></span></li><li><span><Fingerprint size={16} /></span><span><b>Local confirmation</b><small>PrivatePAY is signed locally after its amount and recipient are shown.</small></span></li><li><span><LockKeyhole size={16} /></span><span><b>No cloud secret storage</b><small>Your unlock passphrase is never saved.</small></span></li></ul><div className="security-note">Keep your recovery phrase offline in a safe place. Anyone with it can control the wallet.</div></aside>
    <SendNative records={records} connectedWallets={connectedWallets} />
    <WalletConnections standardWallets={standardWallets} evmProviders={evmProviders} connectedWallets={connectedWallets} onConnectSolana={onConnectSolana} onConnectEvm={onConnectEvm} onDisconnect={onDisconnectExternal} onRescan={onRescanWallets} />
    {flow && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeFlow() }}><section className="wallet-modal card-surface" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title"><div className="modal-heading"><div><span className="small-label">LOCAL WALLET VAULT</span><h2 id="wallet-modal-title">{flow === 'create' ? 'Create your wallet' : flow === 'import' ? 'Restore your wallet' : 'Unlock your wallet'}</h2></div><button className="icon-button" aria-label="Close" onClick={closeFlow}><X size={18} /></button></div>{flow === 'create' && <><p className="modal-copy">Write these words down and keep them offline. This is the only recovery key to your wallet.</p><div className="phrase-grid">{phrase.split(' ').map((word, index) => <div key={`${word}-${index}`}><small>{String(index + 1).padStart(2, '0')}</small><b>{word}</b></div>)}</div><button className="phrase-copy" onClick={() => void navigator.clipboard.writeText(phrase).then(() => onToast('Recovery phrase copied. Clear your clipboard after saving it offline.')).catch(() => setError('Clipboard access failed. Write the words down manually.'))}>Copy recovery phrase <ArrowUpRight size={14} /></button><label className="backup-confirm"><input type="checkbox" checked={backupConfirmed} onChange={event => setBackupConfirmed(event.target.checked)} /><span>I’ve written the recovery phrase down and stored it offline.</span></label></>}{flow === 'import' && <><label className="modal-field">Recovery phrase<textarea value={phrase} onChange={event => setPhrase(event.target.value)} placeholder="Enter your 12 or 24 recovery words" rows={3} autoComplete="off" spellCheck={false} /></label><p className={`phrase-validity ${phrase.trim() ? checkRecoveryPhrase(phrase) ? 'valid' : 'invalid' : ''}`}>{phrase.trim() ? checkRecoveryPhrase(phrase) ? 'Recovery phrase verified' : 'Check the words and their order' : 'Phrase is processed on this device only'}</p></>}{flow !== 'unlock' && <><label className="modal-field">Unlock passphrase<input type="password" value={passphrase} onChange={event => setPassphrase(event.target.value)} minLength={12} autoComplete="new-password" placeholder="At least 12 characters" /></label><p className="passphrase-hint">This passphrase encrypts the wallet on this device. It cannot recover a lost recovery phrase.</p></>}{flow === 'unlock' && <label className="modal-field">Unlock passphrase<input type="password" value={passphrase} onChange={event => setPassphrase(event.target.value)} autoComplete="current-password" placeholder="Your wallet passphrase" onKeyDown={event => { if (event.key === 'Enter') void unlock() }} /></label>}{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button className="button-secondary" onClick={closeFlow}>Cancel</button>{flow === 'unlock' ? <button className="button-primary" onClick={() => void unlock()} disabled={!passphrase || busy}>{busy ? 'Unlocking…' : 'Unlock wallet'}</button> : <button className="button-primary" onClick={() => void submitWallet()} disabled={busy || passphrase.length < 12 || (flow === 'create' && !backupConfirmed) || (flow === 'import' && !checkRecoveryPhrase(phrase))}>{busy ? 'Encrypting…' : flow === 'create' ? 'Encrypt & save wallet' : 'Restore & encrypt'}</button>}</div></section></div>}
  </div>
}

const suggestedWallets = [
  { name: 'Phantom', chain: 'Solana', href: 'https://phantom.com/download' },
  { name: 'Solflare', chain: 'Solana', href: 'https://solflare.com/download' },
  { name: 'Backpack', chain: 'Solana', href: 'https://backpack.app/download' },
  { name: 'MetaMask', chain: 'EVM', href: 'https://metamask.io/download/' },
  { name: 'Rabby', chain: 'EVM', href: 'https://rabby.io/' },
  { name: 'Coinbase Wallet', chain: 'Multi-chain', href: 'https://www.coinbase.com/wallet/downloads' },
]

function WalletConnections({ standardWallets, evmProviders, connectedWallets, onConnectSolana, onConnectEvm, onDisconnect, onRescan }: { standardWallets: readonly StandardWallet[]; evmProviders: EvmProviderOption[]; connectedWallets: ConnectedExternalWallet[]; onConnectSolana: (wallet: StandardWallet) => void; onConnectEvm: (provider: EvmProviderOption) => void; onDisconnect: (id: string) => void; onRescan: () => void }) {
  const compatibleSolana = standardWallets.filter(wallet => wallet.chains.some(chain => chain.startsWith('solana:')) && Boolean(wallet.features['standard:connect']))
  const detectedNames = new Set([...compatibleSolana.map(wallet => wallet.name.toLowerCase()), ...evmProviders.map(provider => provider.info.name.toLowerCase())])
  return <section className="wallet-connect-hub card-surface">
    <div className="wallet-hub-heading"><div><span className="small-label">YOUR CONNECTED WALLETS</span><h3>Bring the wallet you already use.</h3><p>We discover compatible wallets automatically. Your wallet approves every signature; no recovery phrase or vault passphrase is requested.</p></div><div className="wallet-hub-actions"><button className="refresh-inline" onClick={onRescan} aria-label="Scan for wallets again"><RefreshCw size={13} /> Scan again</button><span className="wallet-hub-seal"><Fingerprint size={22} /><small>KEYS STAY<br />WITH YOU</small></span></div></div>
    {connectedWallets.length > 0 && <div className="external-wallet-grid">{connectedWallets.map(item => <article className="external-wallet-card" key={item.id}><div className="external-wallet-brand">{item.icon ? <img src={item.icon} alt="" /> : <Wallet size={22} />}<span><b>{item.name}</b><small>{item.chain === 'solana' ? 'Solana · connected' : `EVM · ${item.chainId}`}</small></span><i className="external-connected-dot" /></div><code>{item.address.slice(0, 10)}…{item.address.slice(-8)}</code><button className="wallet-disconnect" onClick={() => onDisconnect(item.id)}>Disconnect from this app</button></article>)}</div>}
    <div className="wallet-provider-columns">
      <div className="wallet-provider-group"><div className="wallet-provider-title"><span className="wallet-chain-icon solana-chain">S</span><div><b>Solana wallets</b><small>Wallet Standard discovery</small></div><span className="provider-count">{compatibleSolana.length} found</span></div>{compatibleSolana.length ? compatibleSolana.map(wallet => { const connected = connectedWallets.some(item => item.chain === 'solana' && item.name === wallet.name); return <button className="wallet-provider-option" key={wallet.name} onClick={() => onConnectSolana(wallet)} disabled={connected}><img src={wallet.icon} alt="" /><span><b>{wallet.name}</b><small>{connected ? 'Connected to this app' : 'Detected in this browser'}</small></span><span className={connected ? 'provider-state connected' : 'provider-state'}>{connected ? 'Connected' : 'Connect'}</span></button> }) : <div className="wallet-provider-empty"><span>No compatible Solana wallet was detected in this browser.</span><small>Install a wallet that supports Wallet Standard, then return here to connect.</small></div>}</div>
      <div className="wallet-provider-group"><div className="wallet-provider-title"><span className="wallet-chain-icon evm-chain">Ξ</span><div><b>EVM wallets</b><small>EIP‑6963 provider discovery</small></div><span className="provider-count">{evmProviders.length} found</span></div>{evmProviders.length ? evmProviders.map(option => { const connected = connectedWallets.some(item => item.chain === 'evm' && item.id.includes(option.info.uuid)); return <button className="wallet-provider-option" key={option.info.uuid} onClick={() => onConnectEvm(option)} disabled={connected}><img src={option.info.icon} alt="" /><span><b>{option.info.name}</b><small>{connected ? 'Connected to this app' : 'Detected in this browser'}</small></span><span className={connected ? 'provider-state connected' : 'provider-state'}>{connected ? 'Connected' : 'Connect'}</span></button> }) : <div className="wallet-provider-empty"><span>No EVM wallet provider was detected in this browser.</span><small>Multiple providers are discovered separately when they support EIP‑6963.</small></div>}</div>
    </div>
    <div className="wallet-install-row"><div><b>Looking for another wallet?</b><small>These options were not detected here. Install one and return; the app checks again automatically when it opens.</small></div><div className="wallet-install-options">{suggestedWallets.filter(item => !detectedNames.has(item.name.toLowerCase())).map(item => <a key={item.name} href={item.href} target="_blank" rel="noreferrer"><span>{item.name}</span><small>{item.chain} · not detected</small><ArrowUpRight size={14} /></a>)}</div></div>
    <div className="wallet-standard-foot"><ShieldCheck size={16} /><span>Wallet providers control the approval screen and signing. “Not detected” means this browser did not announce that provider; it does not mean the wallet is unavailable on your device.</span></div>
  </section>
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
      <aside className="bot-side-stack"><section className="bot-panel card-surface descope-security"><div className="descope-heading"><span className="descope-wordmark"><i aria-hidden="true"><b /><b /><b /></i>descope</span><span className="descope-state"><i /> {window.PDAO_CONFIG.descope.enabled ? 'ENABLED' : 'GATEWAY DEPLOYED'}</span></div><h3>Agent identity & access</h3><p>Descope is the identity and authorization layer for agents. Human wallet sign-in stays with Auth0; wallet signing keys remain on-device.</p><div className="descope-scopes"><span>Descope Resource</span><span>Per-route JWT scopes</span><span>Wallet-signed PrivatePAY</span></div><div className="descope-note"><ShieldCheck size={15} /><span><b>{window.PDAO_CONFIG.descope.enabled ? 'Runtime configured' : 'Descope Resource binding pending'}</b><small>{window.PDAO_CONFIG.descope.enabled ? 'Agent tokens must still be audience and scope checked by the API.' : 'PDAO’s identity route is deployed. Register its audience, grant agent.identity.read to approved clients, and verify a scoped token before enabling access.'}</small></span></div><a className="descope-doc-link" href="https://docs.descope.com/resources" target="_blank" rel="noreferrer">Descope resource server guide <ExternalLink size={13} /></a></section><section className="bot-panel card-surface autopilot-panel"><div className="bot-panel-heading"><div><span className="small-label">PRIVATEPAY AUTOPILOT</span><h3>Delegated payment status</h3></div><button className="refresh-inline" onClick={() => void refreshAutopilot()}><RefreshCw size={13} /> Refresh</button></div><div className="autopilot-status"><span className={`network-health-dot ${autopilot.state === 'ready' && autopilot.operational ? 'healthy' : ''}`} /><div><b>{autopilot.state === 'loading' ? 'Checking live status…' : autopilot.state === 'unavailable' ? 'Status unavailable' : autopilot.operational ? 'Operational' : 'Awaiting activation'}</b><small>{autopilot.state === 'ready' ? `${autopilot.enabled ? 'Enabled' : 'Not enabled'}${autopilot.blockers === undefined ? '' : ` · ${autopilot.blockers} activation blockers`}` : 'Read-only Agent Exchange status'}</small></div></div><p>PrivatePAY Autopilot uses delegated agent sessions and explicit service, network, asset and recipient allowlists. It does not expose reusable payment credentials.</p><button className="button-secondary" onClick={() => onNavigate('payments')}>Open PrivatePAY <ArrowRight size={14} /></button></section>
        <section className="bot-panel card-surface"><div className="bot-panel-heading"><div><span className="small-label">AGENT EXCHANGE</span><h3>Research capabilities</h3></div><span className="exchange-live-chip"><i /> {services.length ? `${services.length} LIVE` : 'CONNECTING'}</span></div>{relatedServices.length ? <div className="bot-service-list">{relatedServices.map((service, index) => <div key={service.id ?? index}><span><Bot size={15} /></span><div><b>{service.title ?? service.name ?? service.id}</b><small>{service.id ?? 'Agent service'}</small></div><button aria-label="Explore this service" onClick={() => onNavigate('exchange')}><ArrowUpRight size={15} /></button></div>)}</div> : <p>Live wallet research and risk services will appear here from the Agent Exchange catalog.</p>}<button className="text-action" onClick={() => onNavigate('exchange')}>View live services <ArrowRight size={14} /></button></section></aside>
    </div>}
    {tab === 'Vault' && <section className="bot-panel card-surface bot-vault-panel"><div className="bot-panel-heading"><div><span className="small-label">ENCRYPTED BOT VAULT</span><h3>Secrets remain on this device.</h3></div><span className="vault-seal"><LockKeyhole size={17} /> AES-GCM</span></div><p className="bot-vault-copy">Values are encrypted locally with a passphrase before they are stored in IndexedDB. Only labels and encrypted values persist; plaintext is held in memory only while you enter or reveal it.</p><div className="vault-add-grid"><label>Secret label<input value={secretLabel} onChange={event => setSecretLabel(event.target.value)} placeholder="COPY_SOURCE, API token…" /></label><label>Secret value<input type="password" autoComplete="off" value={secretValue} onChange={event => setSecretValue(event.target.value)} placeholder="Enter a secret" /></label><label>Vault passphrase<input type="password" autoComplete="new-password" value={vaultPassphrase} onChange={event => setVaultPassphrase(event.target.value)} placeholder="At least 12 characters" /></label><button className="button-primary" onClick={() => void addSecret()} disabled={busy || !secretLabel.trim() || !secretValue.trim() || vaultPassphrase.length < 12}>{busy ? 'Encrypting…' : <><Plus size={15} /> Encrypt & save</>}</button></div><div className="vault-unlock-row"><label>Passphrase to reveal a stored value<input type="password" autoComplete="current-password" value={unlockPassphrase} onChange={event => setUnlockPassphrase(event.target.value)} placeholder="Entered only when you choose Reveal" /></label><span>{secrets.length} encrypted {secrets.length === 1 ? 'item' : 'items'}</span></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="secret-list">{secrets.length ? secrets.map(record => <article key={record.id}><span className="secret-lock"><LockKeyhole size={15} /></span><div><b>{record.label}</b><small>Encrypted on this device · {new Date(record.createdAt).toLocaleDateString()}</small>{revealed?.id === record.id && <code>{revealed.value}</code>}</div><button className="icon-button" aria-label={revealed?.id === record.id ? 'Hide secret' : 'Reveal secret'} onClick={() => revealed?.id === record.id ? setRevealed(null) : void revealSecret(record)}>{revealed?.id === record.id ? <EyeOff size={16} /> : <Eye size={16} />}</button><button className="icon-button danger-icon" aria-label="Delete secret" onClick={() => { void import('./lib/walletVault').then(({ removeBotSecret }) => removeBotSecret(record.id)).then(() => { setSecrets(items => items.filter(item => item.id !== record.id)); if (revealed?.id === record.id) setRevealed(null) }).catch(() => setError('Could not delete this encrypted secret.')) }}><Trash2 size={15} /></button></article>) : <div className="vault-empty"><LockKeyhole size={20} /><span>No bot secrets saved yet.</span></div>}</div><div className="primary-key-note"><ShieldCheck size={16} /><span>Your primary wallet recovery phrase is kept in the Wallet vault and is never shared with bots or Agent Exchange.</span></div></section>}
    {tab === 'Team Bots' && <section className="bot-panel card-surface team-panel"><div className="bot-panel-heading"><div><span className="small-label">TEAM BOT ROSTER</span><h3>One lead. Focused specialists.</h3></div><button className="button-secondary" onClick={() => saveTeam([...team, { id: crypto.randomUUID(), name: `Research Bot ${team.length + 1}`, role: 'Research', strategy: 'Market research', scope: 'Read-only signals', enabled: false }])}><Plus size={15} /> Add team bot</button></div><label className="lead-bot-field">Lead bot name<input value={policy.name} onChange={event => updatePolicy('name', event.target.value)} onBlur={savePolicy} /></label><div className="team-bot-grid">{team.map(bot => <article className="team-bot-card" key={bot.id}><div className="team-bot-top"><span className="team-bot-icon"><Bot size={18} /></span><button className={`bot-toggle ${bot.enabled ? 'on' : ''}`} aria-label={`${bot.enabled ? 'Pause' : 'Enable'} ${bot.name}`} aria-pressed={bot.enabled} onClick={() => saveTeam(team.map(item => item.id === bot.id ? { ...item, enabled: !item.enabled } : item))}><i /></button></div><label>Bot name<input value={bot.name} onChange={event => saveTeam(team.map(item => item.id === bot.id ? { ...item, name: event.target.value } : item))} /></label><div className="team-bot-fields"><label>Role<input value={bot.role} onChange={event => saveTeam(team.map(item => item.id === bot.id ? { ...item, role: event.target.value } : item))} /></label><label>Strategy<input value={bot.strategy} onChange={event => saveTeam(team.map(item => item.id === bot.id ? { ...item, strategy: event.target.value } : item))} /></label><label>Scope<input value={bot.scope} onChange={event => saveTeam(team.map(item => item.id === bot.id ? { ...item, scope: event.target.value } : item))} /></label></div><footer><span><i className={bot.enabled ? 'enabled-dot' : ''} />{bot.enabled ? 'Policy enabled locally' : 'Paused locally'}</span><button onClick={() => saveTeam(team.filter(item => item.id !== bot.id))}><Trash2 size={14} /> Remove</button></footer></article>)}<button className="team-add-card" onClick={() => saveTeam([...team, { id: crypto.randomUUID(), name: `Research Bot ${team.length + 1}`, role: 'Research', strategy: 'Market research', scope: 'Read-only signals', enabled: false }])}><Plus size={20} /><b>Add a specialist</b><span>Configure its role and scope</span></button></div><div className="primary-key-note"><ShieldCheck size={16} /><span>Team profiles are saved locally. Enabling a profile does not launch an autonomous trade or transmit wallet keys.</span></div></section>}
    {tab === 'DApp Browser' && <section className="bot-panel card-surface dapp-panel"><div className="bot-panel-heading"><div><span className="small-label">SOLANA TRADING DESTINATIONS</span><h3>Choose your trading venue.</h3><p>Open an external app in a new tab. Connect your wallet there only if you decide to.</p></div><span className="dapp-globe"><ExternalLink size={19} /></span></div><div className="dapp-grid">{tradingApps.map(app => <a className="dapp-card" href={app.url} target="_blank" rel="noopener noreferrer" key={app.name}><span className={`dapp-mark ${app.color}`}>{app.mark}</span><span className="dapp-card-copy"><b>{app.name}</b><small>{app.detail}</small></span><ExternalLink size={15} /></a>)}</div><div className="dapp-footnote"><ShieldCheck size={15} /><span>External destinations open outside this wallet. PrivateDAO does not send your recovery phrase or submit trades to these sites.</span></div></section>}
  </section>
}

function Payments({ amount, setAmount, onToast, onNavigate, connectedWallets }: { amount: string; setAmount: (s: string) => void; onToast: (s: string) => void; onNavigate: (section: Section) => void; connectedWallets: ConnectedExternalWallet[] }) {
  const [resource, setResource] = useState('https://agents.privatedao.org/services/privatepay-x402')
  const [provider, setProvider] = useState('privatedao-agent-exchange')
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [payerId, setPayerId] = useState('')
  const [quote, setQuote] = useState<PrivatePayQuote | null>(null)
  const [prepared, setPrepared] = useState<PrivatePayPreparedResponse | null>(null)
  const [paymentPayload, setPaymentPayload] = useState<Record<string, unknown> | null>(null)
  const [verification, setVerification] = useState<PrivatePayVerification | null>(null)
  const [settlement, setSettlement] = useState<PrivatePaySettlement | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [railState, setRailState] = useState<'loading' | 'live' | 'unavailable'>('loading')
  const clearPayment = () => { setQuote(null); setPrepared(null); setPaymentPayload(null); setVerification(null); setSettlement(null); setPassphrase(''); setError('') }
  useEffect(() => {
    let active = true
    void import('./lib/walletVault').then(({ listWallets }) => listWallets()).then(records => {
      if (!active) return
      setWallets(records)
      setPayerId(current => current || (records[0] ? `local:${records[0].id}` : ''))
    }).catch(() => { if (active) setError('Local wallet storage is unavailable in this browser.') })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!payerId && connectedWallets.some(wallet => wallet.chain === 'solana')) {
      const first = connectedWallets.find(wallet => wallet.chain === 'solana')!
      setPayerId(`external:${first.id}`)
    }
  }, [connectedWallets, payerId])
  useEffect(() => {
    let active = true
    void fetch('https://agents.privatedao.org/api/privatepay/status', { headers: { accept: 'application/json' } })
      .then(async response => { if (!response.ok) throw new Error('PrivatePAY status is unavailable.'); return response.json() as Promise<{ operational?: boolean; enabled?: boolean }> })
      .then(status => { if (active) setRailState(status.operational === true && status.enabled === true ? 'live' : 'unavailable') })
      .catch(() => { if (active) setRailState('unavailable') })
    return () => { active = false }
  }, [])
  const localPayer = wallets.find(wallet => `local:${wallet.id}` === payerId)
  const externalPayer = connectedWallets.find((wallet): wallet is Extract<ConnectedExternalWallet, { chain: 'solana' }> => wallet.chain === 'solana' && `external:${wallet.id}` === payerId)
  const payerAddress = localPayer?.solanaAddress ?? externalPayer?.address
  const payerLabel = localPayer ? 'Local wallet' : externalPayer?.name
  const resetForEdit = (action: () => void) => { action(); clearPayment() }
  const postPrivatePay = async <T,>(path: 'requirements' | 'prepare' | 'verify' | 'settle', body: Record<string, unknown>): Promise<T> => {
    const response = await fetch(`https://agents.privatedao.org/api/privatepay/x402/${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body),
    })
    const result = await response.json().catch(() => ({})) as Record<string, unknown>
    if (path === 'settle' && (response.status === 202 || response.status === 503)) return { ...result, pending: true } as T
    if (!response.ok) {
      const nested = result.error && typeof result.error === 'object' ? result.error as Record<string, unknown> : {}
      const message = typeof result.message === 'string' ? result.message : typeof nested.message === 'string' ? nested.message : `PrivatePAY returned ${response.status}.`
      throw new Error(message)
    }
    return result as T
  }
  const ensureQuoteFresh = () => {
    if (quote?.expires_at && new Date(quote.expires_at).getTime() <= Date.now()) {
      clearPayment()
      setError('This quote has expired. Request a fresh quote to continue.')
      return false
    }
    return true
  }
  const requestQuote = async () => {
    clearPayment()
    const match = amount.trim().match(/^(\d+)(?:\.(\d{1,6}))?$/)
    if (!match || !/^https:\/\//i.test(resource.trim()) || !provider.trim() || !payerAddress) {
      setError(!payerAddress ? 'Connect a Solana wallet or select a local wallet so the quote is bound to its payer address.' : 'Enter a positive USDC amount, an HTTPS resource and a provider ID.')
      return
    }
    const baseUnits = `${match[1]}${(match[2] ?? '').padEnd(6, '0')}`.replace(/^0+(?=\d)/, '')
    if (baseUnits === '0') { setError('Enter an amount greater than zero.'); return }
    setBusy(true)
    try {
      const result = await postPrivatePay<PrivatePayQuote>('requirements', { resource: resource.trim(), provider_id: provider.trim(), amount_base_units: baseUnits, payer: payerAddress, require_pdao_wallet: false })
      if (!result.requirements?.accepts?.length) throw new Error('The payment provider returned no usable payment requirements.')
      setQuote(result)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not request a live quote.') }
    finally { setBusy(false) }
  }
  const accept = quote?.requirements?.accepts?.[0]
  const exactAmount = accept?.amount && /^\d+$/.test(accept.amount) ? `${(BigInt(accept.amount) / 1_000_000n).toString()}.${(BigInt(accept.amount) % 1_000_000n).toString().padStart(6, '0')} USDC` : null
  const preparePayment = async () => {
    if (!payerAddress || !quote?.request_id || !accept?.payTo || !accept.amount || !ensureQuoteFresh()) return
    setBusy(true); setError('')
    try {
      const result = await postPrivatePay<PrivatePayPreparedResponse>('prepare', {
        phase: 'transfer', request_id: quote.request_id, payer: payerAddress,
        owner: accept.payTo, amount_base_units: accept.amount,
      })
      if (!result.transaction_base64 || !result.version || !result.required_signers) throw new Error('The provider returned an incomplete signing request.')
      setPrepared(result)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not prepare the private transfer.') }
    finally { setBusy(false) }
  }
  const signAndVerify = async () => {
    if (!payerAddress || !quote?.requirements || !accept || !prepared || (localPayer && !passphrase) || !ensureQuoteFresh()) return
    setBusy(true); setError(''); setVerification(null); setPaymentPayload(null)
    try {
      const signingRequest = {
        transactionBase64: prepared.transaction_base64!,
        version: prepared.version!,
        requiredSigners: prepared.required_signers!,
      } satisfies PreparedSolanaTransaction
      const transactionBase64 = localPayer
        ? await (async () => { const { signPreparedSolanaTransaction } = await import('./lib/walletVault'); return signPreparedSolanaTransaction(localPayer, passphrase, signingRequest, payerAddress) })()
        : externalPayer ? await signWithExternalSolanaWallet(externalPayer, signingRequest)
        : (() => { throw new Error('Select a connected Solana wallet to sign this payment.') })()
      const payload: Record<string, unknown> = {
        x402Version: 2,
        resource: quote.requirements.resource,
        accepted: accept,
        payload: { transaction: transactionBase64 },
      }
      setPassphrase('')
      const result = await postPrivatePay<PrivatePayVerification>('verify', {
        x402Version: 2, paymentPayload: payload, paymentRequirements: accept,
      })
      if (result.isValid !== true) throw new Error(typeof result.invalidReason === 'string' ? result.invalidReason : 'The facilitator did not verify this payment. No settlement was requested.')
      setPaymentPayload(payload)
      setVerification(result)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not sign and verify this payment.') }
    finally { setBusy(false) }
  }
  const settlePayment = async () => {
    if (!paymentPayload || !verification || verification.isValid !== true || !accept || !ensureQuoteFresh()) return
    setBusy(true); setError('')
    try {
      const result = await postPrivatePay<PrivatePaySettlement>('settle', {
        x402Version: 2, paymentPayload, paymentRequirements: accept,
      })
      if (result.pending === true) { setSettlement(result); return }
      if (result.success !== true) throw new Error('The provider did not return a confirmed settlement. Check the payment status before retrying.')
      setSettlement(result)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Settlement was not confirmed. Check payment status before retrying.') }
    finally { setBusy(false) }
  }
  const copyPayTo = async () => {
    if (!accept?.payTo) return
    try { await navigator.clipboard.writeText(accept.payTo); onToast('Quoted recipient copied.') }
    catch { onToast('Clipboard access is unavailable in this context.') }
  }
  return <div className="payments-layout">
    <section className="payment-intro">
      <span className="payment-eyebrow"><LockKeyhole size={15} /> PRIVATEPAY · X402</span>
      <h2>Private payment,<br />from inside your wallet.</h2>
      <p>Review the exact terms, sign on this device, then confirm settlement with the provider.</p>
      <div className="payment-rail"><span className="rail-status"><i /> SOLANA MAINNET</span><div><b>{railState === 'live' ? 'PrivatePAY rail ready' : railState === 'loading' ? 'Checking PrivatePAY rail…' : 'PrivatePAY status unavailable'}</b><small>MagicBlock private settlement · live provider status</small></div><ShieldCheck size={19} /></div>
      <div className="payment-disclosure"><ShieldCheck size={17} /><span>Your recovery phrase stays in the local wallet vault. The signed transaction is sent to the facilitator for verification; settlement is requested only after verification passes and you confirm.</span></div>
      {quote?.public_disclosure && <div className="payment-disclosure"><LockKeyhole size={16} /><span>{quote.public_disclosure}</span></div>}
      {quote?.provider_disclosure && <div className="payment-disclosure"><Eye size={16} /><span>{quote.provider_disclosure}</span></div>}
    </section>
    <section className="payment-form card-surface">
      <div className="payment-form-head"><span className="small-label">PRIVATEPAY CHECKOUT</span><span className="form-lock"><LockKeyhole size={14} /> {railState === 'live' ? 'CONNECTED' : 'PROVIDER STATUS'}</span></div>
      {payerAddress ? <label>Paying wallet<select value={payerId} onChange={event => resetForEdit(() => setPayerId(event.target.value))}>{wallets.map(wallet => <option key={`local:${wallet.id}`} value={`local:${wallet.id}`}>PrivateDAO · {wallet.solanaAddress.slice(0, 8)}…{wallet.solanaAddress.slice(-6)}</option>)}{connectedWallets.filter((wallet): wallet is Extract<ConnectedExternalWallet, { chain: 'solana' }> => wallet.chain === 'solana').map(wallet => <option key={`external:${wallet.id}`} value={`external:${wallet.id}`}>{wallet.name} · {wallet.address.slice(0, 8)}…{wallet.address.slice(-6)}</option>)}</select><small className="payer-address">{payerAddress} · {payerLabel}</small></label> : <div className="wallet-needed"><span>No Solana wallet is connected yet.</span><button className="text-action" onClick={() => onNavigate('wallet')}>Connect any detected wallet <ArrowUpRight size={14} /></button></div>}
      <label>Recipient resource<input value={resource} onChange={event => resetForEdit(() => setResource(event.target.value))} /></label>
      <label>Provider ID<input value={provider} onChange={event => resetForEdit(() => setProvider(event.target.value))} /></label>
      <label>Requested amount (USDC)<div className="amount-field"><input type="number" min="0" step="0.000001" value={amount} onChange={event => resetForEdit(() => setAmount(event.target.value))} /><span>USDC</span></div></label>
      <button className="button-primary payment-quote" onClick={() => void requestQuote()} disabled={busy || !payerAddress}>{busy ? 'Requesting…' : <><ArrowRight size={16} /> Request exact quote</>}</button>
      {error && <div className="form-error" role="alert">{error}</div>}
      {quote && accept && <div className="quote-result" role="status">
        <div className="quote-result-heading"><i className="status-light live" /> Exact payment quote <span>{accept.scheme ?? 'x402'}</span></div>
        <div className="quote-value">{exactAmount ?? 'Amount unavailable'}</div>
        <div className="quote-detail-grid"><div><small>NETWORK</small><b>{accept.network ?? '—'}</b></div><div><small>SETTLEMENT</small><b>{String(accept.extra?.settlement ?? '—')}</b></div><div className="quote-recipient"><small>QUOTED RECIPIENT</small><code>{accept.payTo ?? '—'}</code>{accept.payTo && <button className="quote-copy" onClick={() => void copyPayTo()}>Copy</button>}</div><div><small>QUOTE EXPIRES</small><b>{quote.expires_at ? new Date(quote.expires_at).toLocaleString() : `${accept.maxTimeoutSeconds ?? '—'} seconds`}</b></div></div>
        <div className="quote-reference"><span>Request</span><code>{quote.request_id ?? '—'}</code>{quote.pdao?.required && <span className="quote-pdao">PDAO required</span>}</div>
        <p>This provider quote is immutable for this attempt. A payment is not complete until settlement returns a confirmed receipt.</p>
        {!prepared && !verification && !settlement && <button className="button-secondary payment-step-button" onClick={() => void preparePayment()} disabled={busy || railState !== 'live'}>{busy ? 'Preparing transaction…' : 'Prepare private transfer'}</button>}
        {prepared && !verification && !settlement && <div className="payment-step">
          <div className="quote-detail-grid"><div><small>TRANSACTION</small><b>{prepared.version} · {prepared.send_to}</b></div><div><small>BLOCKHASH VALID THROUGH</small><b>{prepared.last_valid_block_height ?? '—'}</b></div><div><small>REQUIRED SIGNERS</small><code>{prepared.required_signers?.join(', ') ?? '—'}</code></div><div><small>INSTRUCTIONS</small><b>{prepared.instruction_count ?? 'Provider-built'}</b></div></div>
          {localPayer ? <label className="payment-passphrase">Unlock local wallet<input type="password" value={passphrase} onChange={event => setPassphrase(event.target.value)} autoComplete="current-password" placeholder="Unlock this local vault" onKeyDown={event => { if (event.key === 'Enter') void signAndVerify() }} /></label> : <div className="payment-wallet-approval"><ShieldCheck size={17} /><span><b>{externalPayer?.name} will request approval</b><small>Review and sign in the wallet’s own approval window. No vault passphrase or recovery phrase is needed.</small></span></div>}
          <p className="payment-step-note">The transaction is checked against the exact prepared message. The signed transaction is sent for facilitator verification.</p>
          <button className="button-primary payment-step-button" onClick={() => void signAndVerify()} disabled={busy || Boolean(localPayer && !passphrase)}>{busy ? 'Signing and verifying…' : localPayer ? 'Sign locally & verify' : 'Approve in wallet & verify'}</button>
        </div>}
        {verification?.isValid === true && paymentPayload && !settlement && <div className="payment-step verified-step"><div><i className="status-light live" /> Facilitator verification passed</div><p>Confirm this exact payment to request settlement.</p><div className="quote-detail-grid"><div><small>AMOUNT</small><b>{exactAmount}</b></div><div><small>NETWORK</small><b>{accept.network}</b></div><div className="quote-recipient"><small>RECIPIENT</small><code>{accept.payTo}</code></div></div><button className="button-primary payment-step-button" onClick={() => void settlePayment()} disabled={busy}>{busy ? 'Settling payment…' : 'Confirm payment & settle'}</button></div>}
        {settlement?.pending === true && !settlement.success && <div className="payment-step settlement-step"><div><i className="status-light" /> Settlement is still being confirmed</div><p>The provider returned a pending or temporarily unavailable status. This payment will not be submitted automatically again.</p>{settlement.transaction && <div className="quote-reference"><span>Transaction</span><code>{settlement.transaction}</code></div>}<button className="button-secondary payment-step-button" onClick={() => void settlePayment()} disabled={busy}>{busy ? 'Checking provider…' : 'Check settlement status'}</button></div>}
        {settlement?.success === true && <div className="payment-step settlement-step"><div><i className="status-light live" /> Payment settled</div><p>Settlement confirmed by the provider.</p><div className="quote-detail-grid"><div><small>NETWORK</small><b>{settlement.network ?? accept.network ?? '—'}</b></div><div><small>PAYER</small><code>{settlement.payer ?? payerAddress ?? '—'}</code></div><div className="quote-recipient"><small>SETTLEMENT SIGNATURE</small><code>{settlement.transaction ?? 'Provider receipt attached'}</code></div></div><details><summary>View provider receipt</summary><pre>{JSON.stringify(settlement, null, 2)}</pre></details></div>}
        {prepared && <p className="payment-boundary-note">{prepared.privacy_boundary ?? 'Base-layer entry and exit may be visible. Private settlement is limited to the configured MagicBlock rail.'}</p>}
        <details><summary>View complete provider quote</summary><pre>{JSON.stringify(quote, null, 2)}</pre></details>
      </div>}
      {quote && <button className="text-action payment-reset" onClick={clearPayment} disabled={busy}>Start a new payment</button>}
    </section>
  </div>
}

function Ask({ services }: { services: Service[] }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const suggestions = ['What’s moving in the market today?', 'Explain PrivatePAY x402', 'How do I keep my wallet secure?', 'What can Agent Exchange do?']
  const ask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = question.trim()
    if (!message || busy) return
    setBusy(true); setError(''); setQuestion('')
    setMessages(current => [...current, { role: 'user', content: message }])
    try {
      const response = await fetch(`${window.PDAO_CONFIG.walletApi.origin}/v1/ai/ask`, {
        method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          message,
          history: messages.slice(-6),
          services: services.slice(0, 12).map(service => ({
            title: service.title ?? service.name ?? service.id ?? 'Agent service',
            summary: service.summary ?? service.description,
            category: service.category,
            price: typeof service.price === 'number' ? service.price : null,
            currency: service.currency ?? 'USDC',
          })),
        }),
      })
      const result = await response.json() as { answer?: string; error?: string }
      if (!response.ok || typeof result.answer !== 'string') throw new Error(result.error || 'PDAO Intelligence is temporarily unavailable. Please try again.')
      setMessages(current => [...current, { role: 'assistant', content: result.answer! }])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not reach PDAO Intelligence.')
      setMessages(current => current.filter((item, index) => !(item.role === 'user' && index === current.length - 1)))
      setQuestion(message)
    } finally { setBusy(false) }
  }
  return <section className="ask-page card-surface"><div className="ask-heading"><div className="ask-avatar"><Mark size={42} /></div><span className="small-label">PDAO INTELLIGENCE</span><h2>A clearer answer starts here.</h2><p>Live answers about markets, self-custody and the PDAO ecosystem.</p></div>{messages.length > 0 && <div className="ask-thread" aria-live="polite">{messages.map((item, index) => <article className={`ask-message ${item.role}`} key={`${item.role}-${index}`}><span>{item.role === 'assistant' ? 'PDAO' : 'YOU'}</span><p>{item.content}</p></article>)}{busy && <div className="ask-thinking"><i /> Reading your question…</div>}</div>}<div className="prompt-grid">{suggestions.map(prompt => <button key={prompt} onClick={() => setQuestion(prompt)}>{prompt}<ArrowUpRight size={15} /></button>)}</div><form className="ask-compose" onSubmit={event => void ask(event)}><textarea value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask PDAO anything…" rows={3} maxLength={1200} disabled={busy} /><div><span><ShieldCheck size={14} /> Your message is sent to PDAO’s protected AI service. Never include wallet secrets.</span><button className="button-primary" type="submit" disabled={!question.trim() || busy}>{busy ? 'Thinking…' : 'Ask PDAO'} <ArrowUpRight size={15} /></button></div>{error && <p className="ask-error" role="alert">{error}</p>}</form></section>
}

export default App
