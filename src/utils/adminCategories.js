// Pure helpers for the admin's category page, kept apart from React so `npm test` can cover them.

export const CATEGORY_NAME_MAX = 255

// Compare names the way a person does: no outer spaces, same letters whatever the case.
const key = (name) => String(name ?? '').trim().normalize('NFC').toLocaleLowerCase('vi')

const byName = (a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'vi')

// Every category as one line with its depth, each parent right before its children, siblings sorted by name. A
// category whose parent is missing is shown as a top level one, so nothing disappears; a parent loop is cut.
export function categoryTree(categories) {
  const list = Array.isArray(categories) ? categories : []
  const ids = new Set(list.map((item) => item.id))
  const childrenOf = new Map()
  for (const item of list) {
    const parent = item.parentId && ids.has(item.parentId) ? item.parentId : null
    if (!childrenOf.has(parent)) childrenOf.set(parent, [])
    childrenOf.get(parent).push(item)
  }
  const lines = []
  const seen = new Set()
  const walk = (parent, depth) => {
    for (const item of [...(childrenOf.get(parent) ?? [])].sort(byName)) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      lines.push({ ...item, depth })
      walk(item.id, depth + 1)
    }
  }
  walk(null, 0)
  // Categories that only point at each other have no top level one to start from.
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      lines.push({ ...item, depth: 0 })
      walk(item.id, 1)
    }
  }
  return lines
}

export function childCount(categories, id) {
  return (categories ?? []).filter((item) => item.parentId === id).length
}

// The message for a name that cannot be sent, or '' when it can. `parentId` is the level the name is used at (null for
// the top level); `selfId` is the category being renamed, which may keep its own name.
export function validateCategoryName(name, categories, { parentId = null, selfId = null } = {}) {
  const wanted = key(name)
  if (!wanted) return 'Vui lòng nhập tên danh mục.'
  if (wanted.length > CATEGORY_NAME_MAX) return `Tên danh mục tối đa ${CATEGORY_NAME_MAX} ký tự.`
  const used = (categories ?? []).some(
    (item) => item.id !== selfId && (item.parentId || null) === (parentId || null) && key(item.name) === wanted,
  )
  return used ? 'Tên danh mục đã tồn tại trong cùng cấp.' : ''
}

// The body of the create call: the name trimmed, and null for a top level category.
export function createBody(name, parentId) {
  return { name: String(name ?? '').trim(), parentId: parentId || null }
}

// The body of the rename call.
export function updateBody(name) {
  return { name: String(name ?? '').trim() }
}

// The sentences for the answers the category calls can get.
export function categoryActionError(err, fallback) {
  const status = err?.response?.status
  const code = err?.response?.data?.error?.code
  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền quản lý danh mục.'
  switch (code) {
    case 'CATEGORY_HAS_CHILDREN':
      return 'Không thể xóa danh mục đang có danh mục con. Hãy xóa hoặc chuyển các danh mục con trước.'
    case 'CATEGORY_HAS_PRODUCTS':
      return 'Không thể xóa danh mục đang có sản phẩm.'
    case 'CATEGORY_NOT_FOUND':
      return 'Danh mục không còn tồn tại. Danh sách sẽ được tải lại.'
    default:
      return fallback
  }
}
