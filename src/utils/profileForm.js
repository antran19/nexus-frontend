// Pure helpers for the profile form, kept apart from React so `npm test` can cover them.
// The server checks the same rules again (API.md 2.11); this only saves a round trip.

const MAX_LENGTH = 255

// Same cleaning the server does: spaces, dots and dashes are dropped.
export function normalizePhone(phone) {
  return (phone ?? '').replace(/[\s.-]/g, '')
}

export function isVietnamesePhone(phone) {
  return /^(0\d{9}|\+84\d{9})$/.test(normalizePhone(phone))
}

// Returns { fullName?, phone? } with a message per bad field; an empty object means the form is fine.
export function validateProfile({ fullName, phone }) {
  const errors = {}
  const name = (fullName ?? '').trim()
  if (!name) errors.fullName = 'Vui lòng nhập họ và tên'
  else if (name.length > MAX_LENGTH) errors.fullName = `Họ và tên tối đa ${MAX_LENGTH} ký tự`
  // An empty phone is allowed: it removes the number.
  if (normalizePhone(phone) && !isVietnamesePhone(phone)) {
    errors.phone = 'Số điện thoại phải là số Việt Nam (0xxxxxxxxx hoặc +84xxxxxxxxx)'
  }
  return errors
}

// What was typed, in the shape the API takes.
export function toUpdateBody({ fullName, phone }) {
  return { fullName: fullName.trim(), phone: normalizePhone(phone) }
}

// True when the form differs from the saved profile, so the save button can stay off until then.
export function isChanged(profile, { fullName, phone }) {
  return fullName.trim() !== (profile.fullName ?? '') || normalizePhone(phone) !== (profile.phone ?? '')
}

// The server's fieldErrors ({ field, message }) as { field: message }, first message per field.
export function fieldErrorMap(apiError) {
  const map = {}
  for (const fe of apiError?.fieldErrors ?? []) {
    if (!(fe.field in map)) map[fe.field] = fe.message
  }
  return map
}
