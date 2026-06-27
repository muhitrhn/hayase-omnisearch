export function normalizeHash (hash) {
  return (hash || '').trim().toLowerCase()
}

export function dedupeByHash (results) {
  const byHash = new Map()

  for (const result of results) {
    const hash = normalizeHash(result.hash)
    if (!hash) continue

    const existing = byHash.get(hash)
    if (!existing || compareResults(result, existing) < 0) {
      byHash.set(hash, { ...result, hash })
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

export function scoreResult (result) {
  let score = 0

  if (result.type === 'best') score += 1000
  else if (result.type === 'alt') score += 800
  else if (result.type === 'batch') score += 200

  if (result.accuracy === 'high') score += 500
  else if (result.accuracy === 'medium') score += 250

  if (result.source === 'seadex') score += 100
  else if (result.source === 'animetosho') score += 80
  else if (result.source === 'subsplease') score += 60

  score += Math.min(result.seeders || 0, 100)
  return score
}

export function rankResults (results) {
  return [...results].sort((a, b) => compareResults(a, b))
}
