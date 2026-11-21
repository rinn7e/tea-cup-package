import * as E from 'fp-ts/Either'
import { describe, expect, it } from 'vitest'

import { answerWith, calls } from '../fixture/client'
import * as Api from '../fixture/features/out/handler/generated'
import * as Schema from '../fixture/features/out/type/generated'

// The generated code of the features fixture, run: its codecs decode what the
// spec allows, its Eq instances compare as the spec means, and its functions
// send the requests the spec describes

const decode = <A>(
  codec: { decode: (u: unknown) => E.Either<unknown, A> },
  u: unknown,
): A => {
  const result = codec.decode(u)
  if (E.isLeft(result)) {
    throw new Error(`does not decode: ${JSON.stringify(u)}`)
  } else {
    return result.right
  }
}

const pet = { id: 'p1', name: 'Rex', species: 'dog' }

const json = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), { status })

describe('schemas', () => {
  it('decode a value the spec allows and refuse one it does not', () => {
    expect(
      Schema.PetJson.is(
        decode(Schema.PetJson, { ...pet, nickname: null, weight: 3 }),
      ),
    ).toBe(true)
    expect(E.isLeft(Schema.PetJson.decode({ ...pet, species: 'fish' }))).toBe(
      true,
    )
    expect(
      E.isLeft(Schema.PetJson.decode({ ...pet, birthday: 'not a date' })),
    ).toBe(true)
  })

  it('decode allOf as every part', () => {
    expect(
      decode(Schema.CatJson, { ...pet, kind: 'cat', indoor: true }),
    ).toMatchObject({ kind: 'cat' })
    expect(E.isLeft(Schema.CatJson.decode({ kind: 'cat' }))).toBe(true)
  })

  it('decode recursive schemas', () => {
    const tree = { value: 1, children: [{ value: 2, children: [] }] }
    expect(decode(Schema.TreeJson, tree)).toEqual(tree)
    const expr = {
      op: 'add',
      left: { op: 'lit', value: 1 },
      right: { op: 'lit', value: 2 },
    }
    expect(decode(Schema.ExprJson, expr)).toEqual(expr)
  })

  it('compare a tagged union by its tag first', () => {
    const cat = decode(Schema.AnyPetJson, { ...pet, kind: 'cat' })
    const dog = decode(Schema.AnyPetJson, { ...pet, kind: 'dog' })
    expect(Schema.AnyPetEq.equals(cat, cat)).toBe(true)
    expect(Schema.AnyPetEq.equals(cat, dog)).toBe(false)
  })

  it('compare a recursive schema all the way down', () => {
    const a = decode(Schema.TreeJson, {
      value: 1,
      children: [{ value: 2, children: [] }],
    })
    const b = decode(Schema.TreeJson, {
      value: 1,
      children: [{ value: 3, children: [] }],
    })
    expect(Schema.TreeEq.equals(a, a)).toBe(true)
    expect(Schema.TreeEq.equals(a, b)).toBe(false)
  })

  it('give each channel of the AsyncAPI spec a union of its messages', () => {
    const renamed = decode(Schema.PetEventJson, {
      _tag: 'PetRenamed',
      id: 'p1',
      name: 'Max',
    })
    const adopted = decode(Schema.PetEventJson, { _tag: 'PetAdopted', pet })
    expect(Schema.PetEventEq.equals(renamed, adopted)).toBe(false)
    expect(
      Schema.PetEventEq.equals(
        adopted,
        decode(Schema.PetEventJson, { _tag: 'PetAdopted', pet }),
      ),
    ).toBe(true)
    expect(E.isLeft(Schema.PetEventJson.decode('ping'))).toBe(true)
    expect(decode(Schema.NotificationsMessageJson, { title: 'Hi' })).toEqual({
      title: 'Hi',
    })
  })

  it('order branded ids and string enums', () => {
    const ids = ['b', 'a'].map((id) => decode(Schema.PetIdJson, id))
    expect([...ids].sort(Schema.PetIdOrd.compare)).toEqual(['a', 'b'])
    expect(Schema.SpeciesOrd.compare('cat', 'dog')).toBe(-1)
  })
})

describe('endpoints', () => {
  it('send the parameters in their places and decode the answer', async () => {
    answerWith(() => json([pet]))
    const result = await Api.callListPetsEndpoint({
      query: {
        limit: decode(Schema.CountJson, 10),
        tags: ['old', 'calm'],
        filter: { species: 'cat', minAge: 2 },
      },
      header: { 'X-Request-Id': 'r1' },
    })()
    expect(result).toEqual(E.right([pet]))
    expect(calls[0].url).toBe(
      'https://api.test/pets?limit=10&tags=old%2Ccalm&filter%5Bspecies%5D=cat&filter%5BminAge%5D=2',
    )
    expect(calls[0].init.headers).toEqual({ 'X-Request-Id': 'r1' })
  })

  it('decode the error body of whichever error the server sent', async () => {
    answerWith(() => json({ missing: 'p9' }, 404))
    const result = await Api.callGetPet({
      path: { petId: decode(Schema.PetIdJson, 'p9') },
    })()
    expect(result).toEqual(
      E.left({
        statusCode: 404,
        err: { missing: 'p9' },
        actualErr: '{"missing":"p9"}',
      }),
    )
  })

  it('answer null for an empty answer', async () => {
    answerWith(() => json([]))
    const result = await Api.callRenamePetEndpoint({
      path: { petId: decode(Schema.PetIdJson, 'p1') },
      body: 'Max',
    })()
    expect(result).toEqual(E.right(null))
    expect(calls[0].init.body).toBe('Max')
    expect(calls[0].init.headers).toEqual({ 'Content-Type': 'text/plain' })
  })

  it('encode a path parameter whose name is not an identifier', async () => {
    answerWith(() => new Response('contents'))
    const result = await Api.callGetFileEndpoint({
      path: { 'file-name': 'a b.txt' },
    })()
    expect(result).toEqual(E.right('contents'))
    expect(calls[0].url).toBe('https://api.test/files/a%20b.txt')
  })

  it('send a raw body with its content type', async () => {
    answerWith(() => new Response('ok'))
    await Api.callSendRawEndpoint({
      path: { petId: decode(Schema.PetIdJson, 'p1') },
      body: new Blob(['bytes']),
    })()
    expect(calls[0].init.headers).toEqual({
      'Content-Type': 'application/octet-stream',
    })
    expect(calls[0].init.body).toBeInstanceOf(Blob)
  })

  it('list the method and path of every function', () => {
    expect(Api.operations.callGetPet).toEqual({
      method: 'GET',
      path: '/pets/{petId}',
    })
  })
})
