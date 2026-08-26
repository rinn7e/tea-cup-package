import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  outDir: 'lib',
  entry: [
    'src/index.ts',
    'src/link/component.tsx',
    'src/link/index.ts',
    'src/link/type.ts',
  ],
  format: ['cjs', 'esm'],
  noExternal: ['fp-ts'],
})
