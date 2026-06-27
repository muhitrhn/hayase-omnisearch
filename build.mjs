import esbuild from 'esbuild'

const watch = process.argv.includes('--watch')

const config = {
  entryPoints: {
    omnisearch: 'src/omnisearch.js',
  },
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  outdir: 'dist',
  minify: !watch,
  legalComments: 'none',
  sourcemap: false,
  logLevel: 'info',
}

if (watch) {
  const ctx = await esbuild.context(config)
  await ctx.watch()
  console.log('Watching src/ for changes — press Ctrl+C to stop')
} else {
  await esbuild.build(config)
}
