import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  outDir: 'lib',
  entry: [
    'src/index.ts',
    'src/type/http-error.ts',
    'src/type/sorted-unique-array.ts',
    'src/type/cache-data.ts',
    'src/type/size.ts',
    'src/type/app-route-updater.ts',
  ],
  format: ['cjs', 'esm'],
})
