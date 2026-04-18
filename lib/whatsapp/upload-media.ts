/**
 * Faz upload de um arquivo de mídia para a API da Meta e retorna o media_id.
 * Necessário para áudio gravado no browser (WebM/Opus) — WhatsApp Cloud API rejeita
 * áudio via URL se o binário não for OGG puro, mas aceita após upload pelo media_id.
 */

import type { WhatsAppCredentials } from '@/lib/whatsapp-credentials'

const META_API_VERSION = 'v24.0'

export async function uploadMediaToMeta(
  fileUrl: string,
  mimeType: string,
  credentials: WhatsAppCredentials
): Promise<string> {
  const { accessToken, phoneNumberId } = credentials
  if (!accessToken || !phoneNumberId) {
    throw new Error('Credenciais WhatsApp não configuradas')
  }

  // Baixa o arquivo do Supabase Storage
  const fileRes = await fetch(fileUrl)
  if (!fileRes.ok) {
    throw new Error(`Falha ao baixar mídia: ${fileRes.status}`)
  }
  const blob = await fileRes.blob()

  // Envia para a API de mídia da Meta
  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('file', new File([blob], 'audio.ogg', { type: mimeType }))

  const uploadRes = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/media`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  )

  if (!uploadRes.ok) {
    const errText = await uploadRes.text()
    throw new Error(`Falha no upload de mídia: ${uploadRes.status} — ${errText}`)
  }

  const data = await uploadRes.json()
  if (!data.id) {
    throw new Error('Meta não retornou media_id após upload')
  }

  return data.id as string
}
