'use client'

import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function isFocusable(el: HTMLElement) {
  if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
    return false
  }
  if (el.tabIndex < 0) return false
  if (el.hasAttribute('hidden')) return false
  if (el.getClientRects().length === 0) return false
  return true
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return []
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isFocusable,
  )
}

type FocusTrapOptions = {
  active: boolean
  containerRef: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
  restoreFocusRef?: RefObject<HTMLElement | null>
  onEscape?: () => void
  trapFocus?: boolean
}

export function useFocusTrap({
  active,
  containerRef,
  initialFocusRef,
  restoreFocusRef,
  onEscape,
  trapFocus = true,
}: FocusTrapOptions) {
  const previousActiveRef = useRef<HTMLElement | null>(null)
  const wasActiveRef = useRef(false)

  useEffect(() => {
    if (active) {
      previousActiveRef.current = document.activeElement as HTMLElement | null
      const initialTarget =
        initialFocusRef?.current ?? getFocusableElements(containerRef.current)[0]
      if (initialTarget) {
        requestAnimationFrame(() => initialTarget.focus())
      }
    } else if (wasActiveRef.current) {
      const restoreTarget =
        restoreFocusRef?.current ?? previousActiveRef.current
      if (restoreTarget && document.contains(restoreTarget)) {
        requestAnimationFrame(() => restoreTarget.focus())
      }
    }

    wasActiveRef.current = active
  }, [active, containerRef, initialFocusRef, restoreFocusRef])

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        event.stopPropagation()
        onEscape()
        return
      }

      if (!trapFocus || event.key !== 'Tab') return

      const focusable = getFocusableElements(container)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (!activeElement || activeElement === first || !container.contains(activeElement)) {
          event.preventDefault()
          last.focus()
        }
        return
      }

      if (activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [active, containerRef, onEscape, trapFocus])
}
