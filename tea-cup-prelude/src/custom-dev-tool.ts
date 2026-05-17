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
import { DevTools } from 'react-tea-cup'

/**
 * Custom DevTools implementation for `react-tea-cup`.
 *
 * This class extends the default `DevTools` to provide a more focused logging experience.
 * Instead of logging the full message structure (which can be deeply nested with `subMsg` properties),
 * it recursively unwraps the message to find the innermost `subMsg` and logs that.
 *
 * For example:
 * `BundlePageMsg(EditorMsg(ChangeContent("text")))`
 *
 * Default logging would show the whole structure.
 * This implementation logs: `ChangeContent("text")`.
 *
 * It disables the default verbose logging of `DevTools` and handles logging manually in `onEvent`.
 */
// @ts-expect-error: DevTools has private methods
class CustomDevTools<Model, Msg> extends DevTools<Model, Msg> {
  onEvent(e: any): void {
    // Custom logging logic
    if (e.tag === 'init') {
      console.log('🍵', e.count, e.tag, e.mac[0], e.mac[1])
    } else if (e.tag === 'update') {
      const msg = this.getLastSubMsg(e.msg)
      console.log('🍵', e.count, e.tag, msg, e.mac[0], e.mac[1])
    }
    // Call super.onEvent to store events
    // @ts-expect-error: Calling private method
    super.onEvent(e)
  }

  // Helper to recursively get the last subMsg
  private getLastSubMsg(msg: any): any {
    if (msg && typeof msg === 'object' && 'subMsg' in msg) {
      return this.getLastSubMsg(msg.subMsg)
    }
    return msg
  }
}

export const devTools = <Model, Msg>() =>
  // new DevTools<Model, Msg>().setVerbose(true).asGlobal()
  new CustomDevTools<Model, Msg>()
    .setVerbose(false) // disable default logging, we handle it in CustomDevTools
    .asGlobal() // as a global var (on window)
