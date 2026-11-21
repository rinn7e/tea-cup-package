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
export type Group = {
  schemas: string[]
  // A schema of the group refers to itself, directly or through the others
  recursive: boolean
}

/**
 * The schemas in groups of mutually recursive ones (the strongly connected
 * components of `graph`, by Tarjan's algorithm), each group after the groups
 * it refers to, since a `const` codec cannot use one declared below it.
 * `graph` maps each schema to the schemas it refers to. Schemas are visited
 * in name order, so the order is the same on every run.
 */
export const dependencyGroups = (graph: Record<string, string[]>): Group[] => {
  const index = new Map<string, number>()
  const lowLink = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const groups: Group[] = []

  const visit = (node: string): void => {
    index.set(node, index.size)
    lowLink.set(node, index.get(node) as number)
    stack.push(node)
    onStack.add(node)
    const edges = [...new Set(graph[node] ?? [])].sort()
    edges
      .filter((next) => graph[next] !== undefined)
      .forEach((next) => {
        if (!index.has(next)) {
          visit(next)
          lowLink.set(
            node,
            Math.min(lowLink.get(node) as number, lowLink.get(next) as number),
          )
        } else if (onStack.has(next)) {
          lowLink.set(
            node,
            Math.min(lowLink.get(node) as number, index.get(next) as number),
          )
        }
      })
    if (lowLink.get(node) === index.get(node)) {
      const members: string[] = []
      let member: string | undefined = undefined
      while (member !== node) {
        member = stack.pop() as string
        onStack.delete(member)
        members.push(member)
      }
      groups.push({
        schemas: members.sort(),
        recursive: members.length > 1 || edges.includes(node),
      })
    }
  }

  Object.keys(graph)
    .sort()
    .forEach((node) => {
      if (!index.has(node)) {
        visit(node)
      }
    })
  return groups
}
