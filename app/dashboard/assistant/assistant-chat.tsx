'use client'

// Chat avec l'assistant IA (voir lib/rive/assistant-agent.ts pour la logique
// serveur). Deux états séparés volontairement : `apiMessages` est l'échange
// complet au format Claude (avec les blocs tool_use/tool_result), envoyé et
// renvoyé intact à chaque tour pour que l'assistant garde le contexte d'une
// question à l'autre ("et son numéro, mets-le à jour" doit savoir de qui on
// parle) ; `log` est la version simplifiée affichée à l'écran (juste ce que
// l'agent a écrit/dicté et la confirmation finale de l'assistant — jamais le
// détail des outils appelés entre les deux, pour rester lisible sur
// téléphone). Conversation en mémoire seulement : elle repart de zéro si la
// page est rechargée, pas encore persistée en base.
import { useRef, useState, useTransition, useEffect } from 'react'
import { sendAssistantMessage } from '@/app/actions/assistant'
import type { ChatMessage } from '@/lib/rive/assistant-agent'
import { MicIcon, SendIcon } from '../_components/icons'

type DisplayMessage = { role: 'user' | 'assistant' | 'error'; text: string }

const WELCOME: DisplayMessage = {
  role: 'assistant',
  text: "Salut ! Dis-moi ce que tu veux faire : chercher un prospect, ajouter une note, le faire avancer dans son pipeline, mettre à jour un champ de sa fiche, créer un nouveau prospect, créer un rendez-vous, ou me demander une statistique (contacts cette semaine, taux de conversion, mandats signés ce mois-ci, relances en retard, honoraires prévisionnels). Tu peux écrire ou utiliser le micro.",
}

// Web Speech API : pas de type officiel dans le DOM lib TypeScript standard.
type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  onresult: ((event: { results: { length: number; [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

export default function AssistantChat() {
  const [apiMessages, setApiMessages] = useState<ChatMessage[]>([])
  const [log, setLog] = useState<DisplayMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [pending, startTransition] = useTransition()
  const [listening, setListening] = useState(false)
  // Détecté une fois à l'initialisation (pas de setState dans l'effet
  // ci-dessous — la disponibilité de l'API ne change pas en cours de vie du
  // composant) : évite le cascading-render que déclencherait un setState
  // synchrone dans le corps d'un effet.
  const [micSupported] = useState(() => {
    if (typeof window === 'undefined') return false
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
  })
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  // Ce qu'il y avait déjà dans le champ avant de commencer à dicter — permet
  // d'enchaîner plusieurs dictées à la suite sans effacer ce qui précède.
  const baseInputRef = useRef('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log, pending])

  // Une NOUVELLE instance de reconnaissance à chaque dictée plutôt qu'une
  // seule réutilisée d'un clic sur l'autre : sur mobile (Safari iOS en
  // particulier), redémarrer une reconnaissance déjà arrêtée se comporte
  // mal et peut ne renvoyer aucun résultat — symptôme exact du bug remonté
  // ("je dois refaire plusieurs fois mon message vocal"). interimResults à
  // true + mise à jour du champ au fil de la phrase (pas seulement à la
  // toute fin) : le texte devient visible tout de suite pendant qu'on
  // parle, au lieu d'attendre un résultat "final" qui peut ne jamais
  // arriver si la reconnaissance s'arrête un peu tôt (silence, coupure
  // réseau...). continuous à true pour ne pas couper au premier silence
  // entre deux mots.
  function startListening() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'fr-FR'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1
    baseInputRef.current = input

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i]?.[0]?.transcript ?? ''
      }
      const base = baseInputRef.current
      setInput(base ? `${base} ${transcript}` : transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function toggleMic() {
    if (listening) stopListening()
    else startListening()
  }

  function send(rawText: string) {
    const text = rawText.trim()
    if (!text || pending) return
    setInput('')
    setLog((prev) => [...prev, { role: 'user', text }])
    startTransition(async () => {
      const res = await sendAssistantMessage(apiMessages, text)
      setApiMessages(res.messages)
      setLog((prev) => [
        ...prev,
        res.error ? { role: 'error', text: res.error } : { role: 'assistant', text: res.reply },
      ])
    })
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[24rem] flex-col gap-3">
      <div className="flex-1 overflow-y-auto rounded-2xl border border-neutral-200 bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {log.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-accent text-accent-ink'
                    : m.role === 'error'
                      ? 'bg-danger-soft text-danger'
                      : 'bg-neutral-100 text-neutral-800'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl bg-neutral-100 px-3.5 py-2 text-sm text-neutral-400">…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex items-center gap-2"
      >
        {micSupported && (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? 'Arrêter la dictée' : 'Dicter le message'}
            title={listening ? 'Arrêter la dictée' : 'Dicter le message'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
              listening
                ? 'animate-pulse border-danger bg-danger-soft text-danger'
                : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <MicIcon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écris ou dicte ta demande…"
          className="flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label="Envoyer"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition hover:bg-accent-hover disabled:opacity-50"
        >
          <SendIcon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}