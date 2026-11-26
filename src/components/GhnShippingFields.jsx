import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'

export default function GhnShippingFields({ quantity, onChange, inputClass, showFee = true }) {
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [ward, setWard] = useState('')
  const [quoteVersion, setQuoteVersion] = useState(0)
  const provinces = useGhnData('provinces')
  const districts = useGhnData(province ? `districts?provinceId=${province}` : null)
  const wards = useGhnData(district ? `wards?districtId=${district}` : null)
  const quote = useGhnData(district && ward && quantity > 0
    ? `quote?districtId=${district}&wardCode=${encodeURIComponent(ward)}&quantity=${quantity}` : null, quoteVersion)
  const city = provinces.data?.find((place) => place.id === province)?.name
  const enabled = Boolean(provinces.data?.length)

  useEffect(() => {
    if (provinces.data?.length === 0) onChange({ ready: true, city: null, fields: {} })
    else if (quote.data && city) onChange({ ready: true, city, fields: {
      districtId: Number(district), wardCode: ward, quotedFee: quote.data.fee,
    } })
    else onChange({ ready: false, city, fields: {} })
  }, [provinces.data, quote.data, city, district, ward, onChange])

  if (provinces.data?.length === 0) {
    return showFee ? null : <p role="status" className="mt-3 text-sm">GHN chưa được bật cho cửa hàng này.</p>
  }
  return (
    <fieldset className="my-3 grid gap-3 rounded-lg border border-tray bg-white p-3 sm:grid-cols-3">
      <legend className="px-1 text-sm font-medium text-cocoa">Địa chỉ vận chuyển GHN</legend>
      {enabled && <>
        <label className="grid gap-1 text-sm">Tỉnh / Thành phố
          <select className={inputClass} value={province} onChange={(e) => {
            setProvince(e.target.value); setDistrict(''); setWard('')
          }}>
            <option value="">Chọn tỉnh / thành</option>
            {provinces.data.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">Quận / Huyện
          <select className={inputClass} value={district} disabled={!districts.data} onChange={(e) => {
            setDistrict(e.target.value); setWard('')
          }}>
            <option value="">Chọn quận / huyện</option>
            {districts.data?.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">Phường / Xã
          <select className={inputClass} value={ward} disabled={!wards.data} onChange={(e) => setWard(e.target.value)}>
            <option value="">Chọn phường / xã</option>
            {wards.data?.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
          </select>
        </label>
      </>}
      {[provinces, districts, wards, quote].some((state) => state.error) || districts.data?.length === 0 || wards.data?.length === 0 ? (
        <p role="alert" className="text-sm text-red-700 sm:col-span-3">GHN chưa trả được dữ liệu. Hãy thử chọn lại địa chỉ hoặc tải lại trang.</p>
      ) : quote.data && showFee ? (
        <p role="status" className="text-sm text-cocoa sm:col-span-3">
          Phí GHN {Number(quote.data.fee).toLocaleString('vi-VN')} đ
          {quote.data.expectedDeliveryAt
            ? ` · Dự kiến giao ${new Date(quote.data.expectedDeliveryAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
            : ' · GHN chưa có ngày giao dự kiến'}
        </p>
      ) : (!enabled || (ward && !quote.data)) && <p role="status" className="text-sm sm:col-span-3">Đang tải dữ liệu GHN…</p>}
      {ward && <button type="button" className="w-fit text-sm text-brand underline sm:col-span-3"
        onClick={() => setQuoteVersion((version) => version + 1)}>Cập nhật báo phí GHN</button>}
    </fieldset>
  )
}

function useGhnData(path, version = 0) {
  const [state, setState] = useState({})
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    apiClient.get(`/api/v1/orders/shipping/${path}`, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setState({ path, version, data }) })
      .catch(() => { if (!controller.signal.aborted) setState({ path, version, error: true }) })
    return () => controller.abort()
  }, [path, version])
  return path && state.path === path && state.version === version ? state : {}
}
