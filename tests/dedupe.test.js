import { describe, expect, it } from 'vitest'
import { compareResults, dedupeByHash, rankResults, scoreResult } from '../src/lib/dedupe.js'

describe('dedupeByHash', () => {
  it('keeps the higher-ranked duplicate by hash', () => {
    const results = dedupeByHash([
      {
        title: 'Low quality',
        hash: 'abc123',
        seeders: 1,
        accuracy: 'medium',
        source: 'animetosho',
      },
      {
        title: 'SeaDex best',
        hash: 'abc123',
        type: 'best',
        accuracy: 'high',
        source: 'seadex',
      },
    ])

    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('SeaDex best')
    expect(results[0].type).toBe('best')
  })

  it('merges peer counts when the same hash appears from multiple sources', () => {
    const results = dedupeByHash([
      {
        title: 'SeaDex best',
        hash: 'abc123',
        type: 'best',
        accuracy: 'high',
        source: 'seadex',
        seeders: 0,
      },
      {
        title: 'AnimeTosho mirror',
        hash: 'abc123',
        accuracy: 'high',
        source: 'animetosho',
        seeders: 240,
      },
    ])

    expect(results).toHaveLength(1)
    expect(results[0].seeders).toBe(240)
  })

  it('ignores entries without a hash', () => {
    const results = dedupeByHash([
      { title: 'No hash', hash: '', seeders: 10 },
      { title: 'Valid', hash: 'deadbeef', seeders: 5 },
    ])

    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Valid')
  })
})

describe('rankResults', () => {
  it('ranks well-seeded releases ahead of curated picks with unknown peers', () => {
    const ranked = rankResults([
      { title: 'Medium', hash: '1', accuracy: 'medium', seeders: 100 },
      { title: 'Best', hash: '2', type: 'best', accuracy: 'high', source: 'seadex' },
      { title: 'High seeders', hash: '3', accuracy: 'high', seeders: 500, source: 'animetosho' },
    ])

    expect(ranked[0].title).toBe('High seeders')
    expect(ranked[1].title).toBe('Best')
    expect(ranked[2].title).toBe('Medium')
  })
})

describe('scoreResult', () => {
  it('scores curated best releases above plain matches when peers are unknown', () => {
    const best = scoreResult({ type: 'best', accuracy: 'high', source: 'seadex' })
    const alt = scoreResult({ type: 'alt', accuracy: 'high', source: 'seadex' })
    const plain = scoreResult({ accuracy: 'medium', source: 'animetosho', seeders: 50 })

    expect(best).toBeGreaterThan(alt)
    expect(alt).toBeGreaterThan(plain)
  })

  it('scores high seeder counts above curated picks', () => {
    const best = scoreResult({ type: 'best', accuracy: 'high', source: 'seadex' })
    const wellSeeded = scoreResult({ accuracy: 'high', source: 'animetosho', seeders: 200 })

    expect(wellSeeded).toBeGreaterThan(best)
  })
})

describe('compareResults', () => {
  it('prefers newer releases when scores tie', () => {
    const older = { hash: '1', accuracy: 'high', date: new Date('2020-01-01') }
    const newer = { hash: '2', accuracy: 'high', date: new Date('2024-01-01') }

    expect(compareResults(newer, older)).toBeLessThan(0)
  })
})
