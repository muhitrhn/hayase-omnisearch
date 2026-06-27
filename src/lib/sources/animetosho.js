const ANIMETOSHO_URL = atob('aHR0cHM6Ly9mZWVkLmFuaW1ldG9zaG8ub3JnL2pzb24=')
const ALL_RESOLUTIONS = ['2160', '1080', '720', '540', '480']

function buildQuery (exclusions, resolution) {
  const parts = []

  if (exclusions?.length > 0) {
    parts.push(`"${exclusions.join('"|"')}"`)
  }

  if (resolution) {
    const unwanted = ALL_RESOLUTIONS.filter(r => r !== resolution)
    parts.push(`*${unwanted.join('*|*')}*`)
  }

  if (parts.length === 0) return ''
  return `&qx=1&q=!(${parts.join('|')})`
}

function mapEntries (entries, { isBatch = false } = {}) {
  return entries.map(entry => {
    const title = entry.title || entry.torrent_name || ''
    const hash = (entry.info_hash || '').toLowerCase()
    const seeders = (entry.seeders || 0) >= 30000 ? 0 : (entry.seeders || 0)
    const leechers = (entry.leechers || 0) >= 30000 ? 0 : (entry.leechers || 0)

    return {
      title,
      link: entry.magnet_uri || '',
      hash,
      size: entry.total_size || 0,
      seeders,
      leechers,
      downloads: entry.torrent_downloaded_count || 0,
      accuracy: entry.anidb_fid ? 'high' : 'medium',
      type: isBatch ? 'batch' : undefined,
      date: new Date((entry.timestamp || 0) * 1000),
      source: 'animetosho',
    }
  })
}

export async function searchAnimeToshoSingle (fetchFn, query) {
  const { anidbEid, resolution, exclusions } = query
  if (!anidbEid) return []

  const url = `${ANIMETOSHO_URL}?eid=${anidbEid}${buildQuery(exclusions, resolution)}`
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`AnimeTosho returned HTTP ${res.status}`)

  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return []
  return mapEntries(data)
}

export async function searchAnimeToshoBatch (fetchFn, query) {
  const { anidbAid, resolution, exclusions, episodeCount } = query
  if (!anidbAid) return []

  const url = `${ANIMETOSHO_URL}?order=size-d&aid=${anidbAid}${buildQuery(exclusions, resolution)}`
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`AnimeTosho returned HTTP ${res.status}`)

  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return []

  const batches = episodeCount != null
    ? data.filter(entry => (entry.num_files || 0) >= episodeCount)
    : data

  return mapEntries(batches, { isBatch: true })
}

export async function searchAnimeToshoMovie (fetchFn, query) {
  const { anidbAid, resolution, exclusions } = query
  if (!anidbAid) return []

  const url = `${ANIMETOSHO_URL}?aid=${anidbAid}${buildQuery(exclusions, resolution)}`
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`AnimeTosho returned HTTP ${res.status}`)

  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return []
  return mapEntries(data)
}

export async function testAnimeTosho (fetchFn) {
  const res = await fetchFn(ANIMETOSHO_URL)
  if (!res.ok) throw new Error(`AnimeTosho returned HTTP ${res.status}`)
}
