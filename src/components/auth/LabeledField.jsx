import { useId, useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'

// A boxed input with its label above and its own error below, for the sign-up pages. A password gets a show/hide
// toggle. The error is tied to the input with aria-describedby so a screen reader reads it with the field.
export default function LabeledField({ label, hint, error, required, type = 'text', ...inputProps }) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword && revealed ? 'text' : type
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-800">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      <div className={`mt-1.5 flex items-center rounded-lg border bg-white px-3 focus-within:ring-2 focus-within:ring-brand/30 ${error ? 'border-red-400' : 'border-gray-300 focus-within:border-brand'}`}>
        <input
          id={id}
          type={resolvedType}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className="flex-1 min-w-0 bg-transparent py-2.5 text-sm outline-none placeholder:text-gray-400"
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
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  )
}
