const ALL_RESOLUTIONS = ['2160', '1080', '720', '540', '480']

const TRACKERS = [
  'http://nyaa.tracker.wf:7777/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce',
].map(t => `&tr=${encodeURIComponent(t)}`).join('')

const SEADEX_URL = atob('aHR0cHM6Ly9yZWxlYXNlcy5tb2UvYXBpL2NvbGxlY3Rpb25zL2VudHJpZXMvcmVjb3Jkcw==')

function buildMagnet (hash, name) {
  return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}${TRACKERS}`
}

function mapSeaDexTorrent (torrent, showTitle) {
  const hash = torrent.infoHash.toLowerCase()
  const title = torrent.files.length === 1
    ? torrent.files[0].name
    : `[${torrent.releaseGroup}] ${showTitle}${torrent.dualAudio ? ' [Dual Audio]' : ''}`
  const size = torrent.files.reduce((total, file) => total + (file.length || 0), 0)

  return {
    title,
    hash,
    link: buildMagnet(hash, title),
    size,
    type: torrent.isBest ? 'best' : 'alt',
    date: new Date(torrent.created),
    seeders: 0,
    leechers: 0,
    downloads: 0,
    accuracy: 'high',
    source: 'seadex',
  }
}

export async function searchSeaDex (fetchFn, query) {
  const { anilistId, titles, episodeCount } = query
  if (!anilistId || !titles?.length) return []

  const params = new URLSearchParams({
    page: '1',
    perPage: '200',
    filter: `alID="${anilistId}"`,
    skipTotal: '1',
    expand: 'trs',
  })

  const res = await fetchFn(`${SEADEX_URL}?${params.toString()}`)
  if (!res.ok) throw new Error(`SeaDex returned HTTP ${res.status}`)

  const data = await res.json()
  const torrents = data?.items?.[0]?.expand?.trs
  if (!torrents?.length) return []

  return torrents
    .filter(torrent => {
      if (torrent.infoHash === ' ') return false
      if (episodeCount && episodeCount > 1 && torrent.files.length === 1) return false
      return true
    })
    .map(torrent => mapSeaDexTorrent(torrent, titles[0]))
}

export async function testSeaDex (fetchFn) {
  const res = await fetchFn(SEADEX_URL)
  if (!res.ok) throw new Error(`SeaDex returned HTTP ${res.status}`)
}
