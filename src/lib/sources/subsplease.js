const BASE_URL = 'https://subsplease.org/api/'
const RESOLUTIONS = ['1080', '720', '480']

function base32ToHex (base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  const bytes = []

  for (const char of base32.toUpperCase()) {
    const idx = alphabet.indexOf(char)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >>> bits) & 255)
    }
  }

  return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
}

function normalizeHash (hash) {
  const trimmed = hash.trim()
  if (/^[0-9a-f]{40}$/i.test(trimmed)) return trimmed.toLowerCase()
  if (/^[A-Z2-7]{32}$/i.test(trimmed)) return base32ToHex(trimmed)
  return trimmed.toLowerCase()
}

function extractHash (magnet) {
  const match = /xt=urn:btih:([A-Za-z0-9]+)/i.exec(magnet)
  if (!match) return null
  return normalizeHash(match[1])
}

function titleMatches (showTitle, titles) {
  if (!showTitle || !titles?.length) return false
  const lower = showTitle.toLowerCase()
  return titles.some(t => {
    if (!t) return false
    const tl = t.toLowerCase()
    return lower.includes(tl) || tl.includes(lower)
  })
}

function episodeMatches (epField, episode) {
  if (epField === 'Batch') return false
  const n = Number(epField)
  return Number.isFinite(n) && n === episode
}

function pickDownload (downloads, resolution) {
  if (!downloads?.length) return null
  const exact = downloads.find(d => d.res === resolution)
  if (exact) return exact
  for (const res of RESOLUTIONS) {
    const fallback = downloads.find(d => d.res === res)
    if (fallback) return fallback
  }
  return downloads[0] || null
}

function resolveResolution (options, queryRes) {
  if (options?.resolution) return options.resolution
  if (queryRes === '480') return '480'
  if (queryRes === '540' || queryRes === '720') return '720'
  return '1080'
}

function buildTitle (item, download, hash) {
  const show = item.show ?? 'Unknown'
  const ep = item.episode ?? ''
  const epStr = /^\d+$/.test(ep) ? ep.padStart(2, '0') : ep
  const hashTag = hash ? ` [${hash.slice(0, 8).toUpperCase()}]` : ''
  return `[SubsPlease] ${show}${epStr ? ` - ${epStr}` : ''} (${download.res}p)${hashTag}.mkv`
}

async function searchSubsPlease (fetchFn, title) {
  const url = `${BASE_URL}?f=search&tz=UTC&s=${encodeURIComponent(title)}`
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`SubsPlease returned HTTP ${res.status}`)

  const text = await res.text()
  if (!text.trim() || text.trim() === '[]') return []

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('SubsPlease returned a non-JSON response')
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  return Object.values(data).filter(item => item && typeof item === 'object')
}

export async function searchSubsPleaseResults (fetchFn, query, {
  episode,
  wantBatch = false,
  options = {},
} = {}) {
  const titles = (query.titles ?? []).filter(Boolean)
  if (!titles.length) return []

  const resolution = resolveResolution(options, query.resolution)
  const seen = new Set()
  const results = []

  for (const title of titles.slice(0, 3)) {
    const items = await searchSubsPlease(fetchFn, title)

    for (const item of items) {
      if (!titleMatches(item.show, query.titles)) continue

      const isBatch = item.episode === 'Batch'
      if (wantBatch !== isBatch) continue
      if (!wantBatch && episode !== undefined && !episodeMatches(item.episode, episode)) continue
      if (!item.downloads?.length) continue

      const download = pickDownload(item.downloads, resolution)
      if (!download?.magnet) continue

      const hash = extractHash(download.magnet)
      if (!hash || seen.has(hash)) continue
      seen.add(hash)

      results.push({
        title: buildTitle(item, download, hash),
        link: download.magnet,
        hash,
        seeders: 0,
        leechers: 0,
        downloads: 0,
        size: 0,
        accuracy: 'high',
        date: item.release_date ? new Date(item.release_date) : new Date(0),
        type: isBatch ? 'batch' : undefined,
        source: 'subsplease',
      })
    }

    if (results.length > 0) break
  }

  return results
}

export async function testSubsPlease (fetchFn) {
  const res = await fetchFn(`${BASE_URL}?f=schedule&tz=UTC`)
  if (!res.ok) throw new Error(`SubsPlease returned HTTP ${res.status}`)
}
