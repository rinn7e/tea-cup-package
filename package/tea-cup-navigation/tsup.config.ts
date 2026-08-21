import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  outDir: 'lib',
  entry: ['src/index.ts', 'src/component.tsx'],
  format: ['cjs', 'esm'],
  noExternal: ['fp-ts'],
})
