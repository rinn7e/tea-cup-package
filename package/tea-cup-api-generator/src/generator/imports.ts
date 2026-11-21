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
import type { TypeRef } from './options'

// Note [Imports of a generated file]
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// A generated file imports only what its body uses, so it compiles under
// `noUnusedLocals`. The body is written first, then each candidate import is
// kept when its name appears in the body as an identifier (`S.` for a
// namespace). A name that only appears in a comment or a string still gets
// its import, which is harmless.

export type Import =
  | { _tag: 'Namespace'; alias: string; module: string; typeOnly: boolean }
  | { _tag: 'Named'; name: string; module: string; typeOnly: boolean }

const escape = (name: string): string => name.replace(/[$]/g, (c) => `\\${c}`)

const usedIn = (body: string, imp: Import): boolean =>
  imp._tag === 'Namespace'
    ? new RegExp(`(?<![\\w$.])${escape(imp.alias)}\\.`).test(body)
    : new RegExp(`(?<![\\w$.])${escape(imp.name)}(?![\\w$])`).test(body)

export const importName = (imp: Import): string =>
  imp._tag === 'Namespace' ? imp.alias : imp.name

// The candidates `body` uses: the names a generated name must not take
export const usedImports = (body: string, candidates: Import[]): Import[] =>
  candidates.filter((imp) => usedIn(body, imp))

/**
 * The import lines of the candidates `body` uses, one line per module, in the
 * order the modules first appear in `candidates`.
 */
export const importLines = (body: string, candidates: Import[]): string[] => {
  const used = usedImports(body, candidates)
  const modules = [...new Set(used.map((imp) => imp.module))]
  return modules.flatMap((module) => {
    const ofModule = used.filter((imp) => imp.module === module)
    const namespaces = ofModule.flatMap((imp) =>
      imp._tag === 'Namespace' ? [imp] : [],
    )
    const named = ofModule
      .flatMap((imp) => (imp._tag === 'Named' ? [imp] : []))
      .sort((a, b) => a.name.localeCompare(b.name))
    const allTypes = named.every((imp) => imp.typeOnly)
    const namedLine =
      named.length === 0
        ? []
        : [
            `import ${allTypes ? 'type ' : ''}{ ${named
              .map((imp) =>
                imp.typeOnly && !allTypes ? `type ${imp.name}` : imp.name,
              )
              .join(', ')} } from '${module}'`,
          ]
    return [
      ...namespaces.map(
        (imp) =>
          `import ${imp.typeOnly ? 'type ' : ''}* as ${imp.alias} from '${module}'`,
      ),
      ...namedLine,
    ]
  })
}

// The exports of the types of the app the options name
export const typeRefImports = (refs: TypeRef[]): Import[] =>
  refs.flatMap((ref): Import[] => [
    { _tag: 'Named', name: ref.type, module: ref.module, typeOnly: true },
    { _tag: 'Named', name: ref.codec, module: ref.module, typeOnly: false },
    { _tag: 'Named', name: ref.eq, module: ref.module, typeOnly: false },
    ...(ref.ord === undefined
      ? []
      : [
          {
            _tag: 'Named' as const,
            name: ref.ord,
            module: ref.module,
            typeOnly: false,
          },
        ]),
  ])

// The same export named twice (two formats of one type) is imported once
export const uniqueImports = (imports: Import[]): Import[] =>
  imports.filter(
    (imp, i) =>
      imports.findIndex(
        (other) =>
          importName(other) === importName(imp) && other.module === imp.module,
      ) === i,
  )
