/** Extrai o primeiro número de um texto como "1.2340", "38.000-38.200" ou "R$ 5,42". */
export function parsePrice(text: string): number | null {
  const m = text.replace(/\s/g, '').match(/\d[\d.,]*/)
  if (!m) return null
  let s = m[0]
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

/** Relação risco/retorno a partir de entrada, stop e alvo (texto livre). */
export function riskReward(entrada: string, stop: string, alvo: string): number | null {
  const e = parsePrice(entrada)
  const s = parsePrice(stop)
  const t = parsePrice(alvo)
  if (e === null || s === null || t === null) return null
  const risco = Math.abs(e - s)
  if (risco === 0) return null
  const rr = Math.abs(t - e) / risco
  return Number.isFinite(rr) ? Math.round(rr * 10) / 10 : null
}

/** Reduz a imagem para no máximo `max` px no maior lado e devolve JPEG em base64. */
export function resizeImage(file: File, max: number, quality: number): Promise<{ dataUrl: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error('Canvas indisponível')) }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      URL.revokeObjectURL(url)
      resolve({ dataUrl, base64: dataUrl.split(',')[1] })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')) }
    img.src = url
  })
}
