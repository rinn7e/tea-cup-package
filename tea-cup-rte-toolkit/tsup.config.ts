import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  outDir: 'lib',
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
})
