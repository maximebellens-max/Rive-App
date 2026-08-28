// Appel direct à l'API Claude (Anthropic) pour générer le texte de
// l'assistant IA depuis Rive — plus besoin de copier/coller vers un chat
// externe. Nécessite la variable d'environnement ANTHROPIC_API_KEY.
const MODEL = 'claude-haiku-4-5-20251001'

export async function generateWithClaude(prompt: string): Promise<{ text?: string; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { error: "La clé API Claude n'est pas configurée sur ce déploiement (variable ANTHROPIC_API_KEY manquante)." }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { error: `Erreur de l'API Claude (${res.status}) : ${body.slice(0, 200)}` }
    }

    const data = await res.json()
    const text = data?.content?.find((b: { type: string; text?: string }) => b.type === 'text')?.text
    if (!text) return { error: "Réponse inattendue de l'API Claude." }
    return { text }
  } catch {
    return { error: "Impossible de contacter l'API Claude pour le moment." }
  }
}
