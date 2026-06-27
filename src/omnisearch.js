import { fetchWithRetry, settleSources } from './lib/fetch.js'
import { dedupeByHash, rankResults } from './lib/dedupe.js'
import { searchSeaDex, testSeaDex } from './lib/sources/seadex.js'
import {
  searchAnimeToshoSingle,
  searchAnimeToshoBatch,
  searchAnimeToshoMovie,
  testAnimeTosho,
} from './lib/sources/animetosho.js'
import { searchSubsPleaseResults, testSubsPlease } from './lib/sources/subsplease.js'

const DEBUG_MODE = false

const log = {
  _fmt (level, msg, data) {
    if (!DEBUG_MODE) return
    const ts = new Date().toISOString()
    const prefix = `[OmniSearch][${ts}][${level}]`
    const fn = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log'
    data !== undefined ? console[fn](prefix, msg, data) : console[fn](prefix, msg)
  },
  info: (msg, data) => log._fmt('INFO', msg, data),
  warn: (msg, data) => log._fmt('WARN', msg, data),
  error: (msg, data) => log._fmt('ERROR', msg, data),
}

function createFetch (query) {
  return (url) => fetchWithRetry(query.fetch, url)
}

async function runSearch (query, mode, options = {}) {
  const fetchFn = createFetch(query)
  const tasks = []

  tasks.push(async () => searchSeaDex(fetchFn, query))

  if (mode === 'single') {
    tasks.push(async () => searchAnimeToshoSingle(fetchFn, query))
    if (query.titles?.length) {
      tasks.push(async () => searchSubsPleaseResults(fetchFn, query, {
        episode: query.episode,
        options,
      }))
    }
  } else if (mode === 'batch') {
    tasks.push(async () => searchAnimeToshoBatch(fetchFn, query))
    if (query.titles?.length) {
      tasks.push(async () => searchSubsPleaseResults(fetchFn, query, {
        wantBatch: true,
        options,
      }))
    }
  } else {
    tasks.push(async () => searchAnimeToshoMovie(fetchFn, query))
    if (query.titles?.length) {
      tasks.push(async () => searchSubsPleaseResults(fetchFn, query, { options }))
    }
  }

  const { results, errors } = await settleSources(tasks)

  if (errors.length > 0) {
    log.warn('Some sources failed', { count: errors.length, errors: errors.map(e => e.message) })
  }

  if (results.length === 0 && errors.length === tasks.length) {
    throw new Error('All OmniSearch sources are unavailable. Check your network or try again later.')
  }

  return rankResults(dedupeByHash(results))
}

export default {
  async test (query) {
    const fetchFn = createFetch(query ?? { fetch })
    const checks = [
      () => testSeaDex(fetchFn),
      () => testAnimeTosho(fetchFn),
      () => testSubsPlease(fetchFn),
    ]

    const { errors } = await settleSources(checks)
    if (errors.length === checks.length) {
      throw new Error('OmniSearch sources are unreachable. Check your network connection.')
    }

    return true
  },

  async single (query, options = {}) {
    log.info('single()', { anilistId: query.anilistId, anidbEid: query.anidbEid, episode: query.episode })
    return runSearch(query, 'single', options)
  },

  async batch (query, options = {}) {
    log.info('batch()', { anilistId: query.anilistId, anidbAid: query.anidbAid })
    return runSearch(query, 'batch', options)
  },

  async movie (query, options = {}) {
    log.info('movie()', { anilistId: query.anilistId, anidbAid: query.anidbAid })
    return runSearch(query, 'movie', options)
  },
}
