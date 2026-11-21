import { defineConfig } from 'tsup'

// The runtime is bundled by the app, with its own fp-ts and io-ts (peer
// dependencies). The generator and the command run in Node, which cannot
// import `fp-ts/Either` as an ES module (fp-ts has no `exports` map), so they
// carry their own copy of those two. yaml (a dependency) stays outside, and
// so does Prettier, the one of the project, loaded only when installed.
const nodeBundled = ['fp-ts', 'io-ts']

export default defineConfig([
  {
    dts: true,
    outDir: 'lib',
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
  },
  {
    dts: true,
    outDir: 'lib',
    entry: { 'generator/index': 'src/generator/index.ts' },
    format: ['cjs', 'esm'],
    platform: 'node',
    noExternal: nodeBundled,
  },
  {
    outDir: 'lib',
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    platform: 'node',
    noExternal: nodeBundled,
    banner: { js: '#!/usr/bin/env node' },
  },
])
