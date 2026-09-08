export type IsInViewOptions = {
  margin?: number
  container?: HTMLElement
}

export function isInView(
  element: HTMLElement,
  options: IsInViewOptions = {},
): boolean {
  const rect = element.getBoundingClientRect()
  const container = options.container || window
  const offset = options.margin || 0

  // Calculate the bounds of the container
  const containerBounds =
    container instanceof Window
      ? { top: 0, bottom: window.innerHeight }
      : {
          top: container.scrollTop,
          bottom: container.scrollTop + container.offsetHeight,
        }

  // Adjust bounds by offset
  const boundTop = containerBounds.top - offset
  const boundBottom = containerBounds.bottom + offset

  // Check if any part of the element is within the adjusted container bounds
  return rect.top <= boundBottom && rect.bottom >= boundTop
}
