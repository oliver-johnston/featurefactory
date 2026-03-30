#!/usr/bin/env node
// Bundle the server into a single self-contained file.
// All npm packages are inlined; only fsevents (optional native) is external.
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const CJS_BANNER = "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"

await build({
  entryPoints: [resolve(root, 'src/server/cli.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: resolve(root, 'dist/server/bundle.js'),
  banner: { js: CJS_BANNER },
  external: ['fsevents'],
})

console.log('Bundle written to dist/server/bundle.js')
