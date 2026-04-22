import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay = 600) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return v
}
