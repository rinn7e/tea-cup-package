export type ScrollStateEntry = {
  key: string
  top: number
}

export type ScrollStateMap = Map<string, ScrollStateEntry>

export const mkScrollStateMap = (): ScrollStateMap =>
  new Map<string, ScrollStateEntry>()

export const storeScrollState =
  (map: ScrollStateMap) =>
  (
    dataSourceId: string,
    container: HTMLDivElement,
    getItemKey?: (el: HTMLElement) => string | null,
  ) => {
    const children = container.querySelectorAll(':scope [data-link-item-key]')
    if (children.length === 0) return

    const containerRect = container.getBoundingClientRect()

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement
      const rect = child.getBoundingClientRect()
      // First element intersecting or within top of container viewport
      if (rect.bottom >= containerRect.top) {
        const key =
          child.getAttribute('data-link-item-key') ??
          (getItemKey ? getItemKey(child) : null)
        if (key) {
          map.set(dataSourceId, {
            key,
            top: rect.top,
          })
          break
        }
      }
    }
  }

export const restoreScrollState =
  (map: ScrollStateMap) =>
  (dataSourceId: string, container: HTMLDivElement): boolean => {
    const stored = map.get(dataSourceId)
    if (!stored) return false

    const target = container.querySelector(
      `[data-link-item-key="${stored.key}"]`,
    ) as HTMLElement | null
    if (!target) return false

    const isScrollable = container.scrollHeight > container.clientHeight
    if (isScrollable) {
      const rect = target.getBoundingClientRect()
      const scrollY = rect.top - stored.top + container.scrollTop
      container.scrollTo({ top: scrollY })
      return true
    }
    return false
  }
