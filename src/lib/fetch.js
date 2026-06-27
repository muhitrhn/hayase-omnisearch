export const TIMEOUT_MS = 8000
export const MAX_RETRIES = 1

export async function fetchWithTimeout (fetchFn, url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchFn(url, { signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

export async function fetchWithRetry (fetchFn, url, {
  timeoutMs = TIMEOUT_MS,
  retries = MAX_RETRIES,
  label = 'Source',
} = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(fetchFn, url, timeoutMs)
      if (!res.ok) {
        throw new Error(`${label} returned HTTP ${res.status}`)
      }
      return res
    } catch (err) {
      if (attempt === retries) {
        if (err.name === 'AbortError') {
          throw new Error(`${label} timed out after ${timeoutMs / 1000}s`)
        }
        throw err
      }
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
    }
  }
}

export async function parseJSON (res, label = 'Source') {
  try {
    return await res.json()
  } catch {
    throw new Error(`${label} returned an unexpected response format`)
  }
}

export async function settleSources (tasks) {
  const settled = await Promise.allSettled(tasks.map(task => task()))
  const results = []
  const errors = []

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      results.push(...outcome.value)
    } else if (outcome.reason) {
      errors.push(outcome.reason)
    }
  }

  return { results, errors }
}
