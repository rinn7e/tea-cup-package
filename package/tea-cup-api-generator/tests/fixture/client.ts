import type { Client } from '@rinn7e/tea-cup-api-generator'

// The client the generated fixtures send through: it records each request
// and answers with what the test set

export type Call = { url: string; init: RequestInit }

export const calls: Call[] = []

let respond: (call: Call) => Response = () =>
  new Response(null, { status: 204 })

export const answerWith = (f: (call: Call) => Response): void => {
  calls.length = 0
  respond = f
}

export const client: Client = {
  baseUrl: 'https://api.test',
  fetch: async (url, init) => {
    const call = { url, init }
    calls.push(call)
    return respond(call)
  },
}
