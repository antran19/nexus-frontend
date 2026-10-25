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
