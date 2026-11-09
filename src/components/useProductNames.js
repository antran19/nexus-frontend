import { useCallback, useState } from 'react'
import { getProductById } from '../api/products'

// Names for list rows whose productName is still null (products older than the name column in
// auction-service's snapshot). Fetched once per product and cached; a product that cannot be read keeps
// its fallback title. Rows that already carry a name never cause a call.
export function useProductNames() {
  const [names, setNames] = useState({})

  const loadMissing = useCallback((rows) => {
    const ids = [...new Set(rows.filter((row) => !row.productName).map((row) => row.productId))]
    ids.forEach((id) => {
      getProductById(id)
        .then(({ data }) => setNames((current) => ({ ...current, [id]: data.name })))
        .catch(() => {
          // keeps the fallback title
        })
    })
  }, [])

  const nameOf = useCallback((row) => row.productName ?? names[row.productId] ?? 'Sản phẩm đấu giá', [names])

  return { nameOf, loadMissing }
}
