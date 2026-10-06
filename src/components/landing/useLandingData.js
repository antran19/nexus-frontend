import { useEffect, useState } from 'react'
import { getCategories } from '../../api/categories'
import { getDiscoverProducts } from '../../api/products'

// Landing sections share the same two requests. Cache the in-flight promise at
// module level so Hero stats, the marquee and the category grid hit each
// endpoint once instead of once per section.
let categoriesPromise
let productsPromise

// A failed request must not stay cached, or a transient error would blank the
// section until the page is fully reloaded.
function loadCategories() {
  categoriesPromise ??= getCategories()
    .then(({ data }) => data ?? [])
    .catch((error) => {
      categoriesPromise = undefined
      throw error
    })
  return categoriesPromise
}

function loadProducts() {
  productsPromise ??= getDiscoverProducts()
    .then(({ data }) => data.content ?? data ?? [])
    .catch((error) => {
      productsPromise = undefined
      throw error
    })
  return productsPromise
}

function useCached(load) {
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false
    load()
      .then((result) => {
        if (!cancelled) setItems(result)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [load])

  return items
}

export const useCategories = () => useCached(loadCategories)
export const useDiscoverProducts = () => useCached(loadProducts)
