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
import type { Method, OperationObject } from './openapi'
import type { ResolvedOptions } from './options'

// Identifiers
// -----------------------------------------------------------------

export const words = (raw: string): string[] =>
  raw.split(/[^A-Za-z0-9]+/).filter((w) => w.length > 0)

export const capitalize = (w: string): string =>
  w.charAt(0).toUpperCase() + w.slice(1)

const lowerFirst = (w: string): string => w.charAt(0).toLowerCase() + w.slice(1)

// A name that starts with a digit gets a `_`, so it stays an identifier
const safeIdentifier = (name: string): string => {
  if (name === '') {
    return '_'
  } else if (/^[0-9]/.test(name)) {
    return `_${name}`
  } else {
    return name
  }
}

// `Page_Profile` -> `PageProfile`, `pet-status` -> `PetStatus`
export const pascalName = (raw: string): string =>
  safeIdentifier(words(raw).map(capitalize).join(''))

// `get-pet_by.id` -> `getPetById`, `ListPets` -> `listPets`
export const camelName = (raw: string): string => {
  const [first, ...rest] = words(raw)
  return safeIdentifier(
    first === undefined
      ? ''
      : lowerFirst(first) + rest.map(capitalize).join(''),
  )
}

export const isIdentifier = (key: string): boolean =>
  /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)

// A string literal in single quotes
export const quote = (value: string): string =>
  `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')}'`

export const propertyKey = (key: string): string =>
  isIdentifier(key) ? key : quote(key)

// `x.key`, or `x['key-with-dash']`
export const propertyAccess = (target: string, key: string): string =>
  isIdentifier(key) ? `${target}.${key}` : `${target}[${quote(key)}]`

export const docComment = (
  lines: (string | undefined)[],
  deprecated: boolean,
): string[] => {
  const text = lines
    .filter((l): l is string => l !== undefined && l.trim() !== '')
    .join('\n\n')
    .replaceAll('*/', '*\\/')
    .trim()
  const body = [
    ...(text === '' ? [] : text.split('\n')),
    ...(deprecated ? ['@deprecated'] : []),
  ]
  if (body.length === 0) {
    return []
  } else {
    return ['/**', ...body.map((l) => (l === '' ? ' *' : ` * ${l}`)), ' */']
  }
}

// Schemas and operations
// -----------------------------------------------------------------

export const schemaTypeName =
  (options: ResolvedOptions) =>
  (raw: string): string =>
    options.renameSchemas[raw] ?? pascalName(raw)

/**
 * The name of an operation before the options rename it: its `operationId`,
 * else its method and path (`get /pets/{petId}` -> `getPetsByPetId`).
 */
export const operationBaseName = (
  options: ResolvedOptions,
  method: Method,
  path: string,
  op: OperationObject,
): string => {
  if (op.operationId !== undefined && words(op.operationId).length > 0) {
    return camelName(op.operationId)
  } else {
    const rest =
      options.stripPathPrefix !== '' && path.startsWith(options.stripPathPrefix)
        ? path.slice(options.stripPathPrefix.length)
        : path
    const parts = rest
      .split('/')
      .filter((s) => s.length > 0)
      .flatMap((s) => (s.startsWith('{') ? ['by', ...words(s)] : words(s)))
    return camelName([method, ...parts].join(' '))
  }
}

export const operationFunctionName = (
  options: ResolvedOptions,
  base: string,
): string => {
  const renamed = options.renameOperations[base]
  if (renamed !== undefined) {
    return renamed
  } else if (options.operationPrefix === '') {
    return `${base}${options.operationSuffix}`
  } else {
    return `${options.operationPrefix}${capitalize(base)}${options.operationSuffix}`
  }
}

/**
 * Throws when two names of `pairs` (`[what it came from, name]`) are equal, or
 * when a name is one of `reserved`, the identifiers the file already imports.
 */
export const checkUnique = (
  what: string,
  pairs: [string, string][],
  reserved: string[],
): void => {
  const seen = new Map<string, string>(
    reserved.map((name): [string, string] => [name, 'an import of the file']),
  )
  pairs.forEach(([from, name]) => {
    const other = seen.get(name)
    if (other !== undefined) {
      throw new Error(
        `${what}: ${from} and ${other} both map to ${name}; rename one in the options`,
      )
    } else {
      seen.set(name, from)
    }
  })
}
