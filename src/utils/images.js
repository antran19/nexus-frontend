export const SCENE_FALLBACKS = [
  '/images/scenes/watch.jpg',
  '/images/scenes/camera.jpg',
  '/images/scenes/art.jpg',
  '/images/scenes/jewelry.jpg',
  '/images/scenes/antique.jpg',
]

export function resolveProductImage(product) {
  if (product?.imageUrls && product.imageUrls.length > 0 && product.imageUrls[0]) {
    return product.imageUrls[0]
  }
  if (!product?.id) return SCENE_FALLBACKS[0]
  let hash = 0
  for (let i = 0; i < product.id.length; i++) {
    hash = (hash * 31 + product.id.charCodeAt(i)) >>> 0
  }
  return SCENE_FALLBACKS[hash % SCENE_FALLBACKS.length]
}

// Every picture of a product for its gallery, empty entries dropped and a repeated address shown once. A product
// without any picture gets the one stand-in the list uses, so the gallery is never empty.
export function productImages(product) {
  const urls = (product?.imageUrls ?? []).filter((url) => typeof url === 'string' && url.trim() !== '')
  const unique = [...new Set(urls)]
  return unique.length > 0 ? unique : [resolveProductImage(product)]
}
