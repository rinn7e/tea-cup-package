import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { buildProject } from '../../src/generator/project'

// Each fixture is a project with its own config: the files it generates are
// checked in under its `out/`, where the command writes them too, and the
// type check and the tests of `tests/generated/` run against them. Run
// `pnpm vitest run -u` after a change to the generator, and read the diff.

const fixture = (name: string): string =>
  fileURLToPath(
    new URL(`../fixture/${name}/tea-cup-api-generator.json`, import.meta.url),
  )

describe('generated files', () => {
  it.each(['petstore', 'features', 'asyncapi-v2'])(
    'match the golden files of %s',
    async (name) => {
      const project = await buildProject(fixture(name))
      for (const file of project.files) {
        await expect(file.content).toMatchFileSnapshot(file.path)
      }
    },
  )

  it('list what they leave out', async () => {
    const features = await buildProject(fixture('features'))
    expect(features.skipped).toEqual([
      {
        label: 'GET /broken/{id}',
        reason: 'paths./broken/{id}.get: path parameter id is not declared',
      },
      {
        label: 'GET /session',
        reason:
          'paths./session.get: a required cookie parameter, which a browser request cannot set',
      },
    ])
    expect(features.warnings).toEqual([
      'components.schemas.Weird: an unknown type file',
    ])
    const v2 = await buildProject(fixture('asyncapi-v2'))
    expect(v2.warnings).toEqual([
      'channels.metrics.messages.sample.payload: a payload in the format application/vnd.apache.avro;version=1.9.0',
    ])
  })
})
