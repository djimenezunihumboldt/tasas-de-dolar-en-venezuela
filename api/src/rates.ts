import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import ratesData from "../data/rates.json";

const execFileAsync = promisify(execFile);

type Rate = {
  id: string;
  name: string;
  value: number;
  currency: "VES";
  unit: "USD";
};

export type RatesTodayResponse = {
  updatedAt: string;
  rates: Rate[];
  meta?: {
    lastAttemptAt: string;
    lastSuccessAt?: string;
    sources: Record<
      string,
      {
        ok: boolean;
        updatedAt?: string;
        error?: string;
      }
    >;
  };
};

type SourcesMeta = NonNullable<RatesTodayResponse["meta"]>["sources"];

type RawRatesData = {
  updatedAt: string;
  rates: Array<{ id: string; name: string; value: number }>;
};

function toResponse(raw: RawRatesData): RatesTodayResponse {
  return {
    updatedAt: raw.updatedAt,
    rates: raw.rates.map((r) => ({
      id: r.id,
      name: r.name,
      value: r.value,
      currency: "VES",
      unit: "USD",
    })),
  };
}

function toRawFromCache(current: RatesTodayResponse): RawRatesData {
  return {
    updatedAt: current.updatedAt,
    rates: current.rates.map((r) => ({
      id: r.id,
      name: r.name,
      value: r.value,
    })),
  };
}

function isRawRatesData(value: unknown): value is RawRatesData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.updatedAt !== "string") return false;
  if (!Array.isArray(v.rates)) return false;
  return v.rates.every((r) => {
    if (!r || typeof r !== "object") return false;
    const rr = r as Record<string, unknown>;
    return (
      typeof rr.id === "string" &&
      typeof rr.name === "string" &&
      typeof rr.value === "number"
    );
  });
}

async function loadFromRemote(url: string): Promise<RawRatesData> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`REMOTE_RATES_URL HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  if (!isRawRatesData(json)) throw new Error("REMOTE_RATES_URL schema inválido");
  return json;
}

function parseNumberLoose(input: string): number {
  // Handles: "273,58610000" (BCV) and "434.000" (Bybit) and "425".
  const normalized = input
    .trim()
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // remove thousand separators
    .replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : Number.NaN;
}

async function fetchHtmlViaPowerShell(url: string): Promise<string> {
  if (process.platform !== "win32") {
    throw new Error("PowerShell fallback solo está disponible en Windows");
  }

  // Use Windows' TLS stack (frecuentemente más compatible en entornos con inspección TLS).
  const command = `(Invoke-WebRequest -UseBasicParsing -Uri '${url.replace(/'/g, "''")}').Content`;
  const { stdout } = await execFileAsync(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command],
    {
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
      timeout: 30_000,
    }
  );
  return stdout;
}

async function fetchBcvUsdVes(): Promise<number> {
  const url = "https://www.bcv.org.ve/";

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "text/html",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) throw new Error(`BCV HTTP ${res.status}`);
    html = await res.text();
  } catch (e: unknown) {
    const causeCode =
      e && typeof e === "object" && "cause" in e
        ? (e as { cause?: { code?: unknown } }).cause?.code
        : undefined;
    // Workaround común en Windows: Node no valida el chain, pero WinHTTP sí.
    if (causeCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
      html = await fetchHtmlViaPowerShell(url);
    } else {
      throw e instanceof Error ? e : new Error(String(e));
    }
  }
  // Old pages: "USD 273,58610000"
  // Current BCV markup: "<span> USD</span> ... <strong> 276,57690000 </strong>"
  const match =
    html.match(/\bUSD\s+([0-9][0-9.,]+)\b/) ??
    html.match(
      /\bUSD\s*<\/span>[\s\S]{0,600}?<strong>\s*([0-9][0-9.,]+)\s*<\/strong>/i
    );

  if (!match) throw new Error("BCV: no se encontró USD en HTML");
  const value = parseNumberLoose(match[1]);
  if (!Number.isFinite(value)) throw new Error("BCV: número inválido");
  return value;
}

type BinanceAdvSearchResponse = {
  data?: Array<{ adv?: { price?: string } }>;
};

async function fetchBinanceP2PUsdtVes(): Promise<number> {
  const res = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "tasas-dolar-vzla/1.0",
    },
    body: JSON.stringify({
      page: 1,
      rows: 10,
      payTypes: [],
      asset: "USDT",
      fiat: "VES",
      tradeType: "BUY",
    }),
  });

  if (!res.ok) throw new Error(`Binance P2P HTTP ${res.status}`);
  const json = (await res.json()) as BinanceAdvSearchResponse;
  const prices = (json.data ?? [])
    .map((row) => row.adv?.price)
    .filter((p): p is string => typeof p === "string")
    .map((p) => Number(p))
    .filter((n) => Number.isFinite(n));
  if (prices.length === 0) throw new Error("Binance P2P: sin precios");
  // Use median of first results for stability
  const sorted = [...prices].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function fetchBybitP2PUsdtVes(): Promise<number> {
  // Bybit P2P es una SPA; el HTML no trae precios confiables. Usamos un endpoint JSON.
  // Nota: este endpoint exige `side` como string ("0"/"1").
  const url = "https://api2.bybit.com/fiat/otc/item/recommend/online";

  type BybitRecommendResponse = {
    ret_code?: number;
    ret_msg?: string;
    result?: {
      count?: number;
      items?: Array<{ price?: string }>;
    };
  };

  const parseBybitPrice = (raw: string): number => {
    // Bybit para VES típicamente usa decimales con '.' y 3 posiciones (ej: "438.150").
    // Evitamos `parseNumberLoose` porque para 3 decimales confunde '.' como separador de miles.
    const normalized = raw.trim().replace(/,/g, "");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : Number.NaN;
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "tasas-dolar-vzla/1.0",
      // Headers típicos del frontend de Bybit para este set de APIs.
      platform: "PC",
      guid: randomUUID(),
      origin: "https://www.bybit.com",
      referer: "https://www.bybit.com/fiat/trade/otc",
    },
    body: JSON.stringify({
      tokenId: "USDT",
      currencyId: "VES",
      side: "1",
      page: 1,
      size: 10,
    }),
  });

  if (!res.ok) throw new Error(`Bybit P2P HTTP ${res.status}`);
  const json = (await res.json()) as BybitRecommendResponse;
  if (json.ret_code !== 0) {
    throw new Error(`Bybit P2P: ret_code=${json.ret_code} ${json.ret_msg ?? ""}`.trim());
  }

  const prices = (json.result?.items ?? [])
    .map((it) => it.price)
    .filter((p): p is string => typeof p === "string")
    .map(parseBybitPrice)
    .filter((n) => Number.isFinite(n));

  if (prices.length === 0) throw new Error("Bybit P2P: sin precios");
  const sorted = [...prices].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

type DolarApiResponse = {
  promedio: number;
};

async function fetchParaleloVes(): Promise<number> {
  const res = await fetch("https://ve.dolarapi.com/v1/dolares/paralelo");
  if (!res.ok) throw new Error(`DolarApi HTTP ${res.status}`);
  const json = (await res.json()) as DolarApiResponse;
  if (typeof json.promedio !== "number") throw new Error("DolarApi: promedio inválido");
  return json.promedio;
}

const refreshIntervalMs = Number(process.env.REFRESH_INTERVAL_MS ?? 60_000);

let cache: RatesTodayResponse = toResponse(ratesData as RawRatesData);
let lastRefreshAt = 0;
let lastAttemptAt = 0;
let sourceMeta: SourcesMeta = {};

export async function refreshNow(): Promise<void> {
  lastAttemptAt = Date.now();
  const remoteUrl = process.env.REMOTE_RATES_URL;
  const sources = (process.env.SOURCES ?? "bcv,binance,bybit,paralelo")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const sourceSet = new Set(sources);
  try {
    // Base: use remote JSON if configured, otherwise keep last known good cache.
    const raw: RawRatesData = remoteUrl ? await loadFromRemote(remoteUrl) : toRawFromCache(cache);
    const nowIso = new Date().toISOString();
    const nextSourceMeta: SourcesMeta = {};

    let anySuccess = false;
    const updates: Array<Promise<void>> = [];

    const wrapUpdate = (id: string, fn: () => Promise<void>) => {
      updates.push(
        fn()
          .then(() => {
            anySuccess = true;
            nextSourceMeta[id] = { ok: true, updatedAt: nowIso };
          })
          .catch((e: unknown) => {
            const message = e instanceof Error ? e.message : String(e);
            nextSourceMeta[id] = { ok: false, error: message };
          })
      );
    };

    if (sourceSet.has("bcv")) {
      wrapUpdate("bcv", async () => {
        const value = await fetchBcvUsdVes();
        const r = raw.rates.find((x) => x.id === "bcv");
        if (r) r.value = value;
        else raw.rates.push({ id: "bcv", name: "Dólar BCV", value });
      });
    }

    if (sourceSet.has("binance")) {
      wrapUpdate("binance", async () => {
        const value = await fetchBinanceP2PUsdtVes();
        const r = raw.rates.find((x) => x.id === "binance");
        if (r) r.value = value;
        else raw.rates.push({ id: "binance", name: "Binance / Kontigo", value });
      });
    }

    if (sourceSet.has("bybit")) {
      wrapUpdate("bybit", async () => {
        const value = await fetchBybitP2PUsdtVes();
        const r = raw.rates.find((x) => x.id === "bybit");
        if (r) r.value = value;
        else raw.rates.push({ id: "bybit", name: "Bybit", value });
      });
    }

    if (sourceSet.has("paralelo")) {
      wrapUpdate("paralelo", async () => {
        const value = await fetchParaleloVes();
        const r = raw.rates.find((x) => x.id === "paralelo");
        if (r) r.value = value;
        else raw.rates.push({ id: "paralelo", name: "Dólar Paralelo", value });
      });
    }

    await Promise.allSettled(updates);

    // Preserve previous meta for sources not requested.
    sourceMeta = {
      ...sourceMeta,
      ...nextSourceMeta,
    };

    // Only keep meta for requested sources.
    sourceMeta = Object.fromEntries(
      Object.entries(sourceMeta).filter(([id]) => sourceSet.has(id))
    );

    // Only expose requested sources.
    raw.rates = raw.rates.filter((r) => sourceSet.has(r.id));

    // Enforce order: bcv, paralelo, binance, bybit
    const order = ["bcv", "paralelo", "binance", "bybit"];
    raw.rates.sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    // If nothing updated successfully, keep the previous cache (avoid "fake" updates).
    if (!remoteUrl && !anySuccess) {
      return;
    }

    raw.updatedAt = nowIso;
    const nextCache = toResponse(raw);
    nextCache.meta = {
      lastAttemptAt: new Date(lastAttemptAt).toISOString(),
      lastSuccessAt: nowIso,
      sources: sourceMeta,
    };
    cache = nextCache;
    lastRefreshAt = Date.now();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Refresh failed, keeping last cache:", e);
  }
}

export function getRatesToday(): RatesTodayResponse {
  const now = Date.now();
  if (now - lastRefreshAt > refreshIntervalMs * 2) {
    // Best-effort refresh on demand if the job hasn't run yet.
    void refreshNow();
  }
  return cache;
}

export function startBackgroundRefresh(): void {
  void refreshNow();
  setInterval(() => {
    void refreshNow();
  }, refreshIntervalMs);
}

