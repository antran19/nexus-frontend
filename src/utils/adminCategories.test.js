import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CATEGORY_NAME_MAX, categoryActionError, categoryTree, childCount, createBody, updateBody, validateCategoryName,
} from './adminCategories.js'

const categories = [
  { id: 'c', name: 'Giày dép', parentId: null },
  { id: 'a', name: 'Áo quần', parentId: null },
  { id: 'a1', name: 'Áo khoác', parentId: 'a' },
  { id: 'a2', name: 'Áo thun', parentId: 'a' },
  { id: 'a1x', name: 'Áo khoác gió', parentId: 'a1' },
  { id: 'z', name: 'Mồ côi', parentId: 'missing' },
]

test('the tree lists each parent before its children, sorted by name, with the depth of each line', () => {
  assert.deepEqual(
    categoryTree(categories).map((line) => [line.id, line.depth]),
    [['a', 0], ['a1', 1], ['a1x', 2], ['a2', 1], ['c', 0], ['z', 0]],
  )
})

test('a category whose parent is missing is shown as a top level one and nothing is lost', () => {
  const lines = categoryTree(categories)
  assert.equal(lines.length, categories.length)
  assert.equal(lines.find((line) => line.id === 'z').depth, 0)
})

test('the tree does not change the list it was given and survives an empty or odd list', () => {
  const before = JSON.stringify(categories)
  categoryTree(categories)
  assert.equal(JSON.stringify(categories), before)
  assert.deepEqual(categoryTree([]), [])
  assert.deepEqual(categoryTree(undefined), [])
})

test('a parent loop does not hang the tree', () => {
  const loop = [{ id: 'x', name: 'X', parentId: 'y' }, { id: 'y', name: 'Y', parentId: 'x' }]
  assert.equal(categoryTree(loop).length, 2)
})

test('a line knows how many direct children it has', () => {
  assert.equal(childCount(categories, 'a'), 2)
  assert.equal(childCount(categories, 'a1'), 1)
  assert.equal(childCount(categories, 'c'), 0)
})

test('the name must be there and at most 255 characters', () => {
  assert.equal(validateCategoryName('', categories), 'Vui lòng nhập tên danh mục.')
  assert.equal(validateCategoryName('   ', categories), 'Vui lòng nhập tên danh mục.')
  assert.equal(validateCategoryName(undefined, categories), 'Vui lòng nhập tên danh mục.')
  assert.equal(validateCategoryName('a'.repeat(CATEGORY_NAME_MAX + 1), categories), `Tên danh mục tối đa ${CATEGORY_NAME_MAX} ký tự.`)
  assert.equal(validateCategoryName('a'.repeat(CATEGORY_NAME_MAX), categories), '')
})

test('a name already used at the same level is refused, ignoring case, accents of the letter case and spaces', () => {
  assert.equal(validateCategoryName('  ÁO QUẦN ', categories, { parentId: null }), 'Tên danh mục đã tồn tại trong cùng cấp.')
  assert.equal(validateCategoryName('áo thun', categories, { parentId: 'a' }), 'Tên danh mục đã tồn tại trong cùng cấp.')
})

test('the same name is fine under another parent, and a category may keep its own name when renamed', () => {
  assert.equal(validateCategoryName('Áo thun', categories, { parentId: 'c' }), '')
  assert.equal(validateCategoryName('Áo thun', categories, { parentId: 'a', selfId: 'a2' }), '')
  assert.equal(validateCategoryName('Áo khoác', categories, { parentId: 'a', selfId: 'a2' }), 'Tên danh mục đã tồn tại trong cùng cấp.')
})

test('the create body trims the name and sends null for a top level category', () => {
  assert.deepEqual(createBody('  Đồng hồ  ', ''), { name: 'Đồng hồ', parentId: null })
  assert.deepEqual(createBody('Đồng hồ', undefined), { name: 'Đồng hồ', parentId: null })
  assert.deepEqual(createBody('Đồng hồ nam', 'abc'), { name: 'Đồng hồ nam', parentId: 'abc' })
})

test('the update body only carries the trimmed name', () => {
  assert.deepEqual(updateBody('  Mũ  '), { name: 'Mũ' })
})

test('each answer of the category calls has its own sentence', () => {
  const answer = (status, code) => ({ response: { status, data: { error: { code } } } })
  assert.match(categoryActionError(answer(409, 'CATEGORY_HAS_CHILDREN'), 'x'), /danh mục con/)
  assert.match(categoryActionError(answer(409, 'CATEGORY_HAS_PRODUCTS'), 'x'), /có sản phẩm/)
  assert.match(categoryActionError(answer(404, 'CATEGORY_NOT_FOUND'), 'x'), /không còn tồn tại/)
  assert.match(categoryActionError(answer(401), 'x'), /hết hạn/)
  assert.match(categoryActionError(answer(403), 'x'), /không có quyền/)
  assert.equal(categoryActionError(answer(500), 'Không lưu được.'), 'Không lưu được.')
  assert.equal(categoryActionError(undefined, 'Lỗi mạng.'), 'Lỗi mạng.')
})
