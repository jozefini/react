import { useEffect } from 'react'

export type KeyboardModifiers = {
  alt: boolean
  ctrl: boolean
  meta: boolean
  mod: boolean
  shift: boolean
}

type Hotkey = KeyboardModifiers & {
  key?: string
}

type CheckHotkeyMatch = (event: KeyboardEvent) => boolean

export type HotkeyItemOptions = {
  preventDefault?: boolean
}
export type HotkeyItem = [
  string,
  (event: KeyboardEvent) => void,
  HotkeyItemOptions?,
]

export const parseHotkey = (hotkey: string): Hotkey => {
  const keys = hotkey
    .toLowerCase()
    .split('+')
    .map(part => part.trim())

  const modifiers: KeyboardModifiers = {
    alt: keys.includes('alt'),
    ctrl: keys.includes('ctrl'),
    meta: keys.includes('meta'),
    mod: keys.includes('mod'),
    shift: keys.includes('shift'),
  }

  const reservedKeys = ['alt', 'ctrl', 'meta', 'shift', 'mod']

  const freeKey = keys.find(key => !reservedKeys.includes(key))

  return {
    ...modifiers,
    key: freeKey,
  }
}

const isExactHotkey = (hotkey: Hotkey, event: KeyboardEvent): boolean => {
  const { alt, ctrl, meta, mod, shift, key } = hotkey
  const { altKey, ctrlKey, metaKey, shiftKey, key: pressedKey } = event

  if (alt !== altKey) {
    return false
  }

  if (mod) {
    if (!ctrlKey && !metaKey) {
      return false
    }
  } else {
    if (ctrl !== ctrlKey) {
      return false
    }
    if (meta !== metaKey) {
      return false
    }
  }
  if (shift !== shiftKey) {
    return false
  }

  if (
    key &&
    (pressedKey.toLowerCase() === key.toLowerCase() ||
      event.code.replace('Key', '').toLowerCase() === key.toLowerCase())
  ) {
    return true
  }

  return false
}

const shouldFireEvent = (
  event: KeyboardEvent,
  tagsToIgnore: string[],
  triggerOnContentEditable = false
) => {
  if (event.target instanceof HTMLElement) {
    if (triggerOnContentEditable) {
      return !tagsToIgnore.includes(event.target.tagName)
    }

    return (
      !event.target.isContentEditable &&
      !tagsToIgnore.includes(event.target.tagName)
    )
  }

  return true
}

export const getHotkeyMatcher = (hotkey: string): CheckHotkeyMatch => {
  return event => isExactHotkey(parseHotkey(hotkey), event)
}

export const getHotkeyHandler = (hotkeys: HotkeyItem[]) => {
  return (event: React.KeyboardEvent<HTMLElement> | KeyboardEvent) => {
    const _event = 'nativeEvent' in event ? event.nativeEvent : event
    for (const [
      hotkey,
      handler,
      options = { preventDefault: true },
    ] of hotkeys) {
      if (getHotkeyMatcher(hotkey)(_event)) {
        if (options.preventDefault) {
          event.preventDefault()
        }
        handler(_event)
      }
    }
  }
}

export function useHotkeys(
  hotkeys: HotkeyItem[],
  tagsToIgnore: string[] = ['INPUT', 'TEXTAREA', 'SELECT'],
  triggerOnContentEditable = false
) {
  useEffect(() => {
    const keydownListener = (event: KeyboardEvent) => {
      for (const [
        hotkey,
        handler,
        options = { preventDefault: true },
      ] of hotkeys) {
        if (
          getHotkeyMatcher(hotkey)(event) &&
          shouldFireEvent(event, tagsToIgnore, triggerOnContentEditable)
        ) {
          if (options.preventDefault) {
            event.preventDefault()
          }
          handler(event)
        }
      }
    }
    document.documentElement.addEventListener('keydown', keydownListener)
    return () =>
      document.documentElement.removeEventListener('keydown', keydownListener)
  }, [hotkeys, tagsToIgnore, triggerOnContentEditable])
}
