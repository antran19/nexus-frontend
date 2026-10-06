import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'

// Icon-prefixed, underline-style input. For type="password" it adds a
// show/hide toggle instead of relying on the browser's default.
export default function FormField({ icon: Icon, type = 'text', ...inputProps }) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword && revealed ? 'text' : type

  return (
    <div className="flex items-center gap-3 border-b border-gray-300 py-2.5 focus-within:border-gray-900 transition-colors">
      <Icon className="w-5 h-5 text-gray-400 shrink-0" />
      <input
        type={resolvedType}
        className="flex-1 outline-none text-sm placeholder:text-gray-400"
        {...inputProps}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="text-gray-400 hover:text-gray-700"
          aria-label={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {revealed ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
        </button>
      )}
    </div>
  )
}
