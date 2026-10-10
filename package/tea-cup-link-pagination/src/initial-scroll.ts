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
/**
 * When the initial scroll may happen.
 *
 * An initial load runs two legs against the same `initialHandler`:
 *
 *   1. the cache leg (`getInitialDataFromCacheResponseHandler`): a local read,
 *      no network;
 *   2. the API leg (`getInitialDataFromApiResponseHandler`): the fetch whose
 *      response may re-point (or clear) `selectedKey` through
 *      `InitialEndpointResponse.selectedKey`, for example when the selected
 *      item is gone and the list should open at the newest page instead.
 *
 * So while a `selectedKey` is set, the cache leg's target is a guess that the
 * API leg can overturn: scrolling to it lands the user somewhere the API did
 * not choose, and the re-point then moves the view again.
 *
 * The rule, one scroll per mount:
 *   - the cache leg scrolls only when the target cannot be re-pointed (no
 *     `selectedKey`: the newest page);
 *   - otherwise the API leg scrolls whenever the scroll is still owed, also
 *     when the cache already rendered rows and also on a failed fetch, so the
 *     obligation is never left undischarged;
 *   - once done, no later refetch scrolls again: a refetch changes contents,
 *     and contents must not move the reading position.
 *
 * Pure and shared, so the two legs cannot disagree about who scrolls.
 */

// A target is provisional while the fetch that could re-point it is in flight.
// No selected key means "open at the newest page", which no response re-points.
export const targetIsProvisional = (selectedKey: string | null): boolean =>
  selectedKey !== null

// The cache leg: scroll only for a target the API leg cannot overturn.
export const cacheLegShouldScroll = (param: {
  initialScrollDone: boolean
  hasCacheData: boolean
  selectedKey: string | null
}): boolean =>
  !param.initialScrollDone &&
  param.hasCacheData &&
  !targetIsProvisional(param.selectedKey)

// The API leg: scroll if the scroll is still owed, whatever the cache did and
// whether or not the fetch succeeded.
export const apiLegShouldScroll = (param: {
  initialScrollDone: boolean
}): boolean => !param.initialScrollDone

// Deliberately not done: hiding the list (`invisWhileScrolling`) while the
// cache leg defers. It would blank already-rendered cached rows for a whole
// network round-trip, and `invisWhileScrolling` is only cleared by
// `ScrollToCurrentDone`, so raising it outside a scroll could leave the list
// hidden.
