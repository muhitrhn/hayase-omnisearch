export function normalizeHash (hash) {
  return (hash || '').trim().toLowerCase()
}

function mergePeerCounts (primary, secondary) {
  if (!secondary) return primary
  return {
    ...primary,
    seeders: Math.max(primary.seeders || 0, secondary.seeders || 0),
    leechers: Math.max(primary.leechers || 0, secondary.leechers || 0),
  }
}

export function dedupeByHash (results) {
  const byHash = new Map()

  for (const result of results) {
    const hash = normalizeHash(result.hash)
    if (!hash) continue

    const existing = byHash.get(hash)
    if (!existing || compareResults(result, existing) < 0) {
      byHash.set(hash, mergePeerCounts({ ...result, hash }, existing))
    } else {
      byHash.set(hash, mergePeerCounts(existing, result))
    }
  }

  return [...byHash.values()]
}

export function compareResults (a, b) {
  const scoreA = scoreResult(a)
  const scoreB = scoreResult(b)
  if (scoreA !== scoreB) return scoreB - scoreA

  const seedersA = a.seeders || 0
  const seedersB = b.seeders || 0
  if (seedersA !== seedersB) return seedersB - seedersA

  const dateA = a.date instanceof Date ? a.date.getTime() : 0
  const dateB = b.date instanceof Date ? b.date.getTime() : 0
  return dateB - dateA
}

function seederScore (seeders) {
  const count = seeders || 0
  if (count <= 0) return 0
  return Math.min(count, 1000) * 6
}

export function scoreResult (result) {
  let score = 0

  if (result.type === 'best') score += 600
  else if (result.type === 'alt') score += 450
  else if (result.type === 'batch') score += 150

  if (result.accuracy === 'high') score += 200
  else if (result.accuracy === 'medium') score += 100

  if (result.source === 'seadex') score += 80
  else if (result.source === 'animetosho') score += 60
  else if (result.source === 'subsplease') score += 40

  score += seederScore(result.seeders)
  return score
}

export function rankResults (results) {
  return [...results].sort((a, b) => compareResults(a, b))
}
