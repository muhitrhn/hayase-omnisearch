# Hayase OmniSearch

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](index.json)

> 🕐 Sources last verified: June 27, 2026 at 00:00 UTC

A single Hayase extension that searches **SeaDex**, **AnimeTosho**, and **SubsPlease** in parallel — optimized for high accuracy and fast results across both classic and currently airing anime.

> **Disclaimer:** This project is for educational purposes only. It provides source code for search extensions that interface with publicly available torrent indexers. It does not host, distribute, or link to any copyrighted content.

## Why OmniSearch?

| Problem | OmniSearch approach |
|---|---|
| Old anime hard to find | AnimeTosho uses AniDB IDs and mirrors Tokyo Toshokan + Nyaa |
| New simulcasts missing | SubsPlease queried in parallel for weekly releases |
| Too many extensions to manage | One toggle instead of three |
| Duplicate results | Deduplicated by info hash, ranked by quality |
| Slow searches | 8s timeout, parallel `Promise.allSettled` |

## Installation

1. Open Hayase → **Settings → Extensions**
2. Click **Add Repository**
3. Paste this URL (after you push the repo to GitHub):

```
https://raw.githubusercontent.com/muhitrhn/hayase-omnisearch/refs/heads/main/index.json
```

4. Enable **OmniSearch**

### Local testing (before publishing)

1. Run `npm run build`
2. In Hayase, load the extension from your local `dist/omnisearch.js` path

## How it works

```
Hayase query (AniList ID, AniDB IDs, titles, episode)
        │
        ├─► SeaDex        (AniList ID → curated best/alt)
        ├─► AnimeTosho    (AniDB eid/aid → indexed torrents)
        └─► SubsPlease    (title + episode → simulcast releases)
        │
        ▼
   Dedupe by hash → Rank → Return to Hayase
```

- **Single episode:** AnimeTosho `eid` + SeaDex + SubsPlease
- **Batch:** AnimeTosho `aid` (size-sorted) + SeaDex + SubsPlease batches
- **Movie:** AnimeTosho `aid` + SeaDex + SubsPlease

If one source is down, the others still return results.

## Options

| Option | Description | Default |
|---|---|---|
| `resolution` | SubsPlease fallback resolution when Hayase has no global setting | `1080` |

## Development

```bash
git clone https://github.com/muhitrhn/hayase-omnisearch.git
cd hayase-omnisearch
npm install
npm test
npm run build      # production bundles → dist/
npm run watch      # rebuild on save (not minified)
```

## Accuracy

The manifest declares `"accuracy": "high"` because the primary sources (SeaDex, AnimeTosho) use ID-based matching. SubsPlease uses trusted title + episode matching for simulcasts.

## License

[MIT](LICENSE)
