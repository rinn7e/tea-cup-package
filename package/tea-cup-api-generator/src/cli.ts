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
import { relative } from 'node:path'

import { buildProject, staleFiles, writeProject } from './generator/project'

const usage = `Usage: tea-cup-api-generator [--config <file>] [--check]

  --config <file>  the config file (default: tea-cup-api-generator.json)
  --check          write nothing; fail when a generated file is out of date`

const argValue = (args: string[], flag: string): string | undefined => {
  const i = args.indexOf(flag)
  return i === -1 ? undefined : args[i + 1]
}

const main = async (args: string[]): Promise<number> => {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage)
    return 0
  } else {
    const configPath =
      argValue(args, '--config') ?? 'tea-cup-api-generator.json'
    const project = await buildProject(configPath)
    const show = (path: string): string => relative(process.cwd(), path)
    project.skipped.forEach((s) =>
      console.warn(`not generated: ${s.label}: ${s.reason}`),
    )
    project.warnings.forEach((w) => console.warn(`warning: ${w}`))
    if (args.includes('--check')) {
      const stale = staleFiles(project)
      if (stale.length === 0) {
        console.log('tea-cup-api-generator: up to date')
        return 0
      } else {
        stale.forEach((path) => console.error(`out of date: ${show(path)}`))
        return 1
      }
    } else {
      writeProject(project)
      project.files.forEach((f) => console.log(`wrote ${show(f.path)}`))
      return 0
    }
  }
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code
  },
  (err: unknown) => {
    console.error(
      `tea-cup-api-generator: ${err instanceof Error ? err.message : String(err)}`,
    )
    process.exitCode = 1
  },
)
