import { useCallback, useEffect, useRef } from 'react'

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
) {
  const callbackRef = useRef(callback)
  const debounceTimerRef = useRef(0)

  callbackRef.current = callback

  useEffect(() => () => window.clearTimeout(debounceTimerRef.current), [])

  return useCallback((...args: Parameters<T>) => {
    window.clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = window.setTimeout(
      () => callbackRef.current(...args),
      delay,
    )
  }, [])
}
