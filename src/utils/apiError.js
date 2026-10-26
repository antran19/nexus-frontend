// The backend wraps failures as { success: false, error: { code, message, fieldErrors } }.
// Show the most specific text it gave (a field message first), else the caller's fallback.
export function errorMessage(err, fallback) {
  const apiError = err.response?.data?.error
  return apiError?.fieldErrors?.[0]?.message || apiError?.message || fallback
}
