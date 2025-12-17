import { useEffect, useMemo, useState } from 'react'
import './App.css'
import kontigoImg from './assets/kontigo-clean-orange.png'
import binanceImg from './assets/binance.png'
import bybitImg from './assets/bybit.png'

type Rate = {
  id: string
  name: string
  value: number
  currency: 'VES'
  unit: 'USD'
}

type RatesTodayResponse = {
  updatedAt: string
  rates: Rate[]
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function RateLogo({ id, name }: { id: string; name: string }) {

  const size = 40;
  // BCV: cuadrado azul con "BCV" blanco, bold, centrado
  if (id === 'bcv') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" className="logo-img">
        <rect width="40" height="40" rx="10" fill="#18407a" />
        <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, Arial, sans-serif" fontWeight="bold" fontSize="18" fill="white" letterSpacing="2">BCV</text>
      </svg>
    );
  }
  // Binance/Kontigo: usar imágenes reales
  if (id === 'binance') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <img src={binanceImg} alt="Binance" width={size} height={size} className="logo-img" style={{objectFit:'cover'}} />
        <img src={kontigoImg} alt="Kontigo" width={size} height={size} className="logo-img" style={{objectFit:'cover', background:'#fff'}} />
      </span>
    );
  }
  // Bybit: usar imagen real
  if (id === 'bybit') {
    return (
      <img src={bybitImg} alt="Bybit" width={size} height={size} className="logo-img" style={{objectFit:'cover'}} />
    );
  }

  if (id === 'paralelo') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#047857"/>
        <text x="50" y="70" fontSize="60" fontWeight="900" fill="white" textAnchor="middle">$</text>
      </svg>
    )
  }

  // Fallback generic
  return (
    <div className="badge" aria-hidden>
      {name.trim().slice(0, 1).toUpperCase()}
    </div>
  )
}

function RateCard({ rate }: { rate: Rate }) {
  const [usdText, setUsdText] = useState('1')
  const [vesText, setVesText] = useState(() => (1 * rate.value).toFixed(2))
  const [copied, setCopied] = useState(false)

  const handleUsdChange = (val: string) => {
    setUsdText(val)
    const num = parseAmount(val)
    if (num === null) {
      setVesText('')
    } else {
      setVesText((num * rate.value).toFixed(2))
    }
  }

  const handleVesChange = (val: string) => {
    setVesText(val)
    const num = parseAmount(val)
    if (num === null) {
      setUsdText('')
    } else {
      setUsdText((num / rate.value).toFixed(2))
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatBs(rate.value))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <article className="card" data-id={rate.id}>
      <div className="cardTop">
        <RateLogo id={rate.id} name={rate.name} />
        <div className="name" title={rate.name}>
          {rate.name}
        </div>
      </div>
      <div className="cardValueRow">
        <div className="cardValue">{formatBs(rate.value)}</div>
        <button 
          className="copyBtn" 
          onClick={handleCopy} 
          aria-label="Copiar tasa"
          title="Copiar tasa"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
      <div className="cardMeta">1 {rate.unit} → {rate.currency}</div>

      <div className="calc" aria-label={`Calculadora ${rate.name}`}>
        <div className="calcTitle">Calculadora</div>
        <div className="calcRow">
          <label className="calcField">
            <span className="calcLabel">USD</span>
            <input
              className="calcInput"
              inputMode="decimal"
              value={usdText}
              onChange={(e) => handleUsdChange(e.target.value)}
              placeholder="0"
              aria-label={`Monto en ${rate.unit}`}
            />
          </label>
          <div className="calcArrow">⇄</div>
          <label className="calcField">
            <span className="calcLabel">VES</span>
            <input
              className="calcInput"
              inputMode="decimal"
              value={vesText}
              onChange={(e) => handleVesChange(e.target.value)}
              placeholder="0"
              aria-label="Monto en Bolívares"
            />
          </label>
        </div>
      </div>
    </article>
  )
}

function formatBs(value: number) {
  const formatted = value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return `Bs. ${formatted}`
}

function formatUpdatedAt(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const datePart = new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'long',
  }).format(date)

  const timePart = new Intl.DateTimeFormat('es-VE', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)

  const prettyDate = datePart.replace(/\b\p{L}/gu, (m) => m.toUpperCase())
  return `${prettyDate} ${timePart}`
}

function App() {
  console.log('App rendering')
  const [data, setData] = useState<RatesTodayResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const updatedText = useMemo(() => {
    if (!data?.updatedAt) return '—'
    return formatUpdatedAt(data.updatedAt)
  }, [data?.updatedAt])

  const filteredRates = useMemo(() => {
    if (!data?.rates) return []
    if (!searchTerm) return data.rates
    const lower = searchTerm.toLowerCase()
    return data.rates.filter((r) => r.name.toLowerCase().includes(lower))
  }, [data?.rates, searchTerm])

  const handleShare = async () => {
    if (!data) return
    const text = `Tasas del día (${updatedText}):\n` + 
      data.rates.map(r => `${r.name}: ${formatBs(r.value)}`).join('\n')
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tasas de Dólar en Venezuela',
          text: text,
          url: window.location.href
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        alert('Tasas copiadas al portapapeles')
      } catch (err) {
        console.error('Error copying:', err)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    const refreshEveryMs = 30_000

    async function load() {
      try {
        setError(null)
        const url = import.meta.env.DEV ? '/api/rates/today' : './rates-today.json'
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as RatesTodayResponse
        if (!cancelled) setData(json)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Error desconocido'
        if (!cancelled) setError(message)
      }
    }

    load()
    const timer = window.setInterval(() => {
      void load()
    }, refreshEveryMs)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return (
    <div className="screen">
      <div className="panel">
        <header className="header">
          <h1 className="title">Cotizaciones del día</h1>
          <div className="subtitle">Actualizado: {updatedText}</div>
          
          <div className="controls">
            <input 
              className="searchInput"
              type="search" 
              placeholder="Buscar tasa..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <button className="shareBtn" onClick={handleShare} aria-label="Compartir">
              Compartir 📤
            </button>
          </div>
        </header>

        {error ? <div className="error">Error: {error}</div> : null}

        <section className="cards" aria-label="Tasas de hoy">
          {filteredRates.map((rate) => (
            <RateCard key={rate.id} rate={rate} />
          ))}

          {!data && !error ? <div className="loading">Cargando…</div> : null}
          {data && filteredRates.length === 0 ? (
            <div className="emptyState">No se encontraron tasas con ese nombre.</div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export default App
