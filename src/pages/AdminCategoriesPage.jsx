import { useCallback, useEffect, useRef, useState } from 'react'
import { createCategory, deleteCategory, getCategories, updateCategory } from '../api/categories'
import PageHero from '../components/PageHero'
import { useAuth } from '../context/AuthContext'
import { categoryActionError, categoryTree, childCount, createBody, updateBody, validateCategoryName } from '../utils/adminCategories'
import { errorMessage } from '../utils/apiError'
import { isAdmin } from '../utils/sellerRequests'

// Admin: the product categories as a tree. Add a top level one or one under another, rename, delete. The server refuses
// to delete a category that still has children or products; its answer is shown as a sentence.
export default function AdminCategoriesPage() {
  const { user } = useAuth()
  const admin = isAdmin(user)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', categories: [], message: '' })
  // What the admin is doing: { kind: 'add' | 'rename' | 'delete', id, parentId } or null.
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)

  useEffect(() => {
    if (!admin) return undefined
    let cancelled = false
    getCategories()
      .then(({ data }) => {
        if (!cancelled) setState({ status: 'ready', categories: Array.isArray(data) ? data : [], message: '' })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', categories: [], message: errorMessage(err, 'Không tải được danh mục, vui lòng thử lại.') })
      })
    return () => {
      cancelled = true
    }
  }, [admin, attempt])

  const reload = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }))
    setAttempt((value) => value + 1)
  }, [])

  const open = (next, initialName = '') => {
    setEditing(next)
    setName(initialName)
    setFieldError('')
    setNotice(null)
  }
  const close = () => {
    setEditing(null)
    setName('')
    setFieldError('')
  }

  // One call at a time: a double click does not send twice.
  async function run(call, done, fallback) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    try {
      await call()
      close()
      setNotice({ kind: 'ok', text: done })
      reload()
    } catch (err) {
      setNotice({ kind: 'error', text: categoryActionError(err, errorMessage(err, fallback)) })
      if (err?.response?.data?.error?.code === 'CATEGORY_NOT_FOUND') {
        close()
        reload()
      }
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  function submit(event) {
    event.preventDefault()
    if (!editing || editing.kind === 'delete') return
    const parentId = editing.parentId ?? null
    const problem = validateCategoryName(name, state.categories, { parentId, selfId: editing.kind === 'rename' ? editing.id : null })
    setFieldError(problem)
    if (problem) return
    if (editing.kind === 'add') run(() => createCategory(createBody(name, parentId)), 'Đã thêm danh mục.', 'Không thêm được danh mục, vui lòng thử lại.')
    else run(() => updateCategory(editing.id, updateBody(name)), 'Đã đổi tên danh mục.', 'Không đổi được tên, vui lòng thử lại.')
  }

  if (!admin) {
    return (
      <>
        <PageHero eyebrow="Quản trị" title="Danh mục sản phẩm" />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p role="alert" className="text-sm text-gray-700">Chỉ quản trị viên mới xem được trang này.</p>
        </div>
      </>
    )
  }

  const lines = categoryTree(state.categories)
  const form = (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-start gap-2" noValidate>
      <div>
        <label htmlFor="category-name" className="sr-only">Tên danh mục</label>
        <input
          id="category-name"
          value={name}
          onChange={(event) => { setName(event.target.value); setFieldError('') }}
          disabled={busy}
          autoFocus
          maxLength={300}
          aria-invalid={Boolean(fieldError)}
          placeholder="Tên danh mục"
          className="border border-gray-300 rounded px-3 py-2 text-sm w-64"
        />
        {fieldError && <p role="alert" className="mt-1 text-xs text-red-600">{fieldError}</p>}
      </div>
      <button type="submit" disabled={busy} className="rounded bg-brand text-white text-sm px-4 py-2 disabled:opacity-60">
        {busy ? 'Đang lưu...' : 'Lưu'}
      </button>
      <button type="button" onClick={close} disabled={busy} className="text-sm underline text-gray-700 py-2">Hủy</button>
    </form>
  )

  return (
    <>
      <PageHero eyebrow="Quản trị" title="Danh mục sản phẩm" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {state.status === 'ready' ? `${state.categories.length} danh mục` : 'Danh mục dùng khi người bán đăng sản phẩm.'}
          </p>
          <button
            type="button"
            disabled={busy || state.status !== 'ready'}
            onClick={() => open({ kind: 'add', parentId: null })}
            className="rounded bg-brand text-white text-sm px-4 py-2 disabled:opacity-60"
          >
            + Thêm danh mục
          </button>
        </div>

        {editing?.kind === 'add' && editing.parentId == null && form}

        {notice && (
          <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-4 text-sm ${notice.kind === 'error' ? 'text-red-600' : 'text-green-700'}`}>
            {notice.text}
          </p>
        )}
        {state.status === 'loading' && <p role="status" className="mt-6 text-sm text-gray-500">Đang tải...</p>}
        {state.status === 'error' && (
          <p role="alert" className="mt-6 text-sm text-red-600">
            {state.message}{' '}
            <button type="button" onClick={reload} className="underline">Thử lại</button>
          </p>
        )}
        {state.status === 'ready' && lines.length === 0 && <p className="mt-6 text-sm text-gray-500">Chưa có danh mục nào.</p>}

        <ul className="mt-6 space-y-2">
          {lines.map((line) => {
            const children = childCount(state.categories, line.id)
            const mine = editing && editing.id === line.id
            return (
              <li key={line.id} style={{ marginLeft: `${Math.min(line.depth, 6) * 1.5}rem` }} className="border border-gray-200 bg-white rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-gray-900 break-words">
                    {line.name}
                    {children > 0 && <span className="ml-2 text-xs text-gray-500">{children} danh mục con</span>}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <button type="button" disabled={busy} onClick={() => open({ kind: 'add', parentId: line.id })} className="underline text-gray-700">Thêm danh mục con</button>
                    <button type="button" disabled={busy} onClick={() => open({ kind: 'rename', id: line.id, parentId: line.parentId ?? null }, line.name)} className="underline text-gray-700">Đổi tên</button>
                    <button type="button" disabled={busy} onClick={() => open({ kind: 'delete', id: line.id })} className="underline text-red-700">Xóa</button>
                  </div>
                </div>
                {editing?.kind === 'add' && editing.parentId === line.id && form}
                {mine && editing.kind === 'rename' && form}
                {mine && editing.kind === 'delete' && (
                  <div className="mt-3 text-sm">
                    <p className="text-gray-800">Xóa danh mục <strong>{line.name}</strong>? Không thể hoàn tác.</p>
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => deleteCategory(line.id), 'Đã xóa danh mục.', 'Không xóa được danh mục, vui lòng thử lại.')}
                        className="rounded bg-red-700 text-white px-4 py-2 disabled:opacity-60"
                      >
                        {busy ? 'Đang xóa...' : 'Xác nhận xóa'}
                      </button>
                      <button type="button" onClick={close} disabled={busy} className="underline text-gray-700">Hủy</button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
