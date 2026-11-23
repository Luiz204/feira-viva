/**
 * Reduz a foto no navegador antes do envio (lado maior até 1200 px, JPEG ~80%).
 * Fotos de celular passam de 5 MB; depois disso ficam com 100–300 KB.
 */
export async function prepararFoto(arquivo: File, ladoMaximo = 1200): Promise<Blob> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem')
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível ler a foto'))), 'image/jpeg', 0.8),
  )
}
