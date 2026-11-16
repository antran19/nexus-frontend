import { useEffect, useState } from 'react'
import { getCart } from '../api/cart'
import { CART_CHANGED, cartSummary } from '../utils/cartSummary'

// The count and total of the signed-in person's cart for the header: read when the header appears, whenever the cart
// API says it changed and when the tab gets focus back. A failed read keeps the last numbers; the header must never
// break because of the cart. Without a signed-in person nothing is read and the cart counts as empty.
export default function useCartSummary(enabled) {
  const [summary, setSummary] = useState({ count: 0, total: 0 })

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    const read = () => {
      getCart()
        .then(({ data }) => {
          if (!cancelled) setSummary(cartSummary(data))
        })
        .catch(() => {})
    }
    read()
    window.addEventListener(CART_CHANGED, read)
    window.addEventListener('focus', read)
    return () => {
      cancelled = true
      window.removeEventListener(CART_CHANGED, read)
      window.removeEventListener('focus', read)
    }
  }, [enabled])

  return enabled ? summary : { count: 0, total: 0 }
}
