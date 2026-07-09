// Journal photo compression — the app's only image-processing code
// (DATA_MODEL.md §12d). No library: createImageBitmap + canvas + toBlob is
// the whole implementation (ARCHITECTURE.md §3 justification — a
// compression library would add a worker bundle for no extra capability
// here). Client-side compression is a REQUIREMENT, not a nice-to-have —
// mobile data in Japan.
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.8

/** Decode (honouring EXIF orientation via createImageBitmap), scale so the
 * longest edge is ≤1600px (never upscale), and re-encode as JPEG q0.8. A
 * 12MP phone photo lands around 150–400 KB. */
export async function compressImage(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  const longestEdge = Math.max(width, height)
  const scale = longestEdge > MAX_EDGE ? MAX_EDGE / longestEdge : 1 // never upscale

  const targetWidth = Math.round(width * scale)
  const targetHeight = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('canvas toBlob failed'))
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}
