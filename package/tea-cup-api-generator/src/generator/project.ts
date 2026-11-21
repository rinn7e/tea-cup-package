/* MIT License

Copyright (c) 2026 Moremi Vannak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
import * as E from 'fp-ts/Either'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/PathReporter'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'

import type { Skipped } from './emit-endpoint'
import { generate } from './generate'
import { OptionsJson } from './options'

/**
 * The config file (`tea-cup-api-generator.json`): the options of `generate`,
 * and where its input and output files are. Paths are relative to the config
 * file.
 */
export const ConfigJson = t.intersection([
  OptionsJson,
  t.type({
    // The folder both files are written to
    out: t.string,
  }),
  t.partial({
    openapi: t.string,
    asyncapi: t.string,
    files: t.partial({
      // Default `schemas.ts`
      schemas: t.string,
      // Default `endpoints.ts`
      endpoints: t.string,
    }),
    // Format the files with the Prettier config of the project (default true)
    format: t.boolean,
  }),
])

export type Config = t.TypeOf<typeof ConfigJson>

export type Project = {
  // Each file to write, with its formatted content
  files: { path: string; content: string }[]
  skipped: Skipped[]
  warnings: string[]
}

const readSpec = (path: string): unknown => {
  const text = readFileSync(path, 'utf8')
  return /\.ya?ml$/i.test(path) ? parseYaml(text) : JSON.parse(text)
}

export const readConfig = (configPath: string): Config => {
  const decoded = ConfigJson.decode(
    JSON.parse(readFileSync(configPath, 'utf8')),
  )
  if (E.isLeft(decoded)) {
    throw new Error(
      `${configPath} is not a valid config:\n${PathReporter.report(decoded).join('\n')}`,
    )
  } else {
    return decoded.right
  }
}

// `./schemas` from `out/endpoints.ts` to `out/schemas.ts`
const moduleSpecifier = (fromFile: string, toFile: string): string => {
  const path = relative(dirname(fromFile), toFile).replace(/\.tsx?$/, '')
  return path.startsWith('.') ? path : `./${path}`
}

type Prettier = typeof import('prettier')

// Prettier is an optional peer dependency: without it the files are written
// as generated
const loadPrettier = async (): Promise<Prettier | null> => {
  try {
    return await import('prettier')
  } catch (_err) {
    return null
  }
}

const formatted = async (
  prettier: Prettier | null,
  path: string,
  code: string,
): Promise<string> => {
  if (prettier === null) {
    return code
  } else {
    const config = await prettier.resolveConfig(path)
    return prettier.format(code, { ...config, filepath: path })
  }
}

/**
 * Reads the config and its specs and generates the files, formatted, without
 * writing them.
 */
export const buildProject = async (configPath: string): Promise<Project> => {
  const config = readConfig(configPath)
  const root = dirname(resolve(configPath))
  const out = join(root, config.out)
  const schemasPath = join(out, config.files?.schemas ?? 'schemas.ts')
  const endpointsPath = join(out, config.files?.endpoints ?? 'endpoints.ts')
  const specs = [config.openapi, config.asyncapi].flatMap((p) =>
    p === undefined ? [] : [basename(p)],
  )
  const output = generate(
    {
      openapi:
        config.openapi === undefined
          ? undefined
          : readSpec(join(root, config.openapi)),
      asyncapi:
        config.asyncapi === undefined
          ? undefined
          : readSpec(join(root, config.asyncapi)),
    },
    {
      ...config,
      schemasModule:
        config.schemasModule ?? moduleSpecifier(endpointsPath, schemasPath),
      specName: config.specName ?? specs.join(' and '),
    },
  )
  const prettier = config.format === false ? null : await loadPrettier()
  const warnings =
    config.format !== false && prettier === null
      ? [
          ...output.warnings,
          'prettier is not installed: the files are not formatted',
        ]
      : output.warnings
  const files = [
    { path: schemasPath, code: output.schemas },
    ...(output.endpoints === null
      ? []
      : [{ path: endpointsPath, code: output.endpoints }]),
  ]
  return {
    files: await Promise.all(
      files.map(async (f) => ({
        path: f.path,
        content: await formatted(prettier, f.path, f.code),
      })),
    ),
    skipped: output.skipped,
    warnings,
  }
}

export const writeProject = (project: Project): void => {
  project.files.forEach((f) => {
    mkdirSync(dirname(f.path), { recursive: true })
    writeFileSync(f.path, f.content)
  })
}

// The files of the project that differ from what is on disk
export const staleFiles = (project: Project): string[] =>
  project.files
    .filter((f) => {
      try {
        return readFileSync(f.path, 'utf8') !== f.content
      } catch (_err) {
        return true
      }
    })
    .map((f) => f.path)
