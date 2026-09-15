/**
 * The per-message speak control: a speaker button inside the assistant
 * message's IconActions row, plus a popover for voice and rate. Playback is
 * owned by the page-wide player, not by this component, so scrolling the row
 * out of the transcript or switching Session does not stop the audio.
 * @module @deepseek-ai/dsh-client-ui-tts/client/SpeakAction
 */

import { useCallback, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import {
  Tooltip, useAnchoredPosition, useDismissOnOutsidePointer,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { SPEECH_PATH, SPEEDS, VOICES } from '../shared.ts'
import { speechPlayer } from './player.ts'
import { DEFAULTS, loadSettings, saveSettings, type TtsSettings } from './settings.ts'
import type { SpeakActionProps } from './slots.ts'
import css from './SpeakAction.module.css'

/** The Assistant row payload fields this control reads. */
interface AssistantStepData {
  readonly blocks: readonly { readonly kind: string; readonly text?: string }[]
  readonly finalNode?: { readonly messageId?: string }
}

/**
 * One message's speak control and its settings popover.
 * @param props - the owner's message identity, the useChat seat, and the locale.
 * @returns the speaker button and, while open, the settings popover.
 */
export function SpeakAction({ messageId, useChat, t }: SpeakActionProps) {
  const [settings, setSettings] = useState<TtsSettings>(() => loadSettings())
  const [open, setOpen] = useState(false)
  const gearRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  // The action row clips and scrolls with the transcript, so the panel is
  // portaled to the body and positioned from the gear's viewport rect.
  const panelPosition = useAnchoredPosition({
    open, anchorRef: gearRef, panelRef, side: 'top', gap: 6, margin: 8,
  })
  useDismissOnOutsidePointer(gearRef, open, setOpen, panelRef)

  // The player is a plain external store, so the control re-renders from it
  // without owning the audio element that outlives this mount.
  const player = useSyncExternalStore(speechPlayer.subscribe, speechPlayer.getSnapshot)
  const mine = player.status !== 'idle' && player.messageId === messageId
  const state = mine ? player.status : 'idle'

  // The message body is resolved from the Chat snapshot. The selector returns
  // a stable string, so this re-renders only when this message's own text moves.
  const text = useChat((snapshot) => {
    for (const node of snapshot.nodes.values()) {
      if (node.kind !== 'assistant-step') continue
      // The node payload is read structurally: this package does not merge into
      // ui-chat's ChatNodeDataMap, so the discriminant does not narrow `data`.
      const data = node.data as AssistantStepData | undefined
      if (data?.finalNode?.messageId !== messageId) continue
      return data.blocks
        .flatMap(block => block.kind === 'text' ? [block.text] : [])
        .join('')
    }
    return ''
  })

  const onClick = useCallback(() => {
    if (text.trim() === '') return
    speechPlayer.toggle({
      messageId,
      text,
      voice: settings.voice,
      speed: settings.speed,
      path: SPEECH_PATH,
    })
  }, [messageId, settings.speed, settings.voice, text])

  const chooseVoice = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(saveSettings({ voice: event.target.value }))
  }, [])

  const chooseSpeed = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const speed = Number(event.target.value)
    setSettings(saveSettings({ speed: Number.isFinite(speed) && speed > 0 ? speed : DEFAULTS.speed }))
  }, [])

  const label = state === 'playing'
    ? t('action.speaking')
    : state === 'loading'
      ? t('action.loading')
      : t('action.speak')

  return (
    <>
      <Tooltip label={label} side="bottom">
        <button
          type="button"
          className={css.action}
          aria-label={label}
          aria-pressed={state === 'playing'}
          data-active={state !== 'idle' || undefined}
          onClick={onClick}
        >
          {state === 'loading' ? <Spinner /> : <Speaker />}
        </button>
      </Tooltip>
      <Tooltip label={t('settings.title')} side="bottom">
        <button
          ref={gearRef}
          type="button"
          className={css.gear}
          aria-label={t('settings.title')}
          aria-expanded={open}
          onClick={() => { setOpen(!open) }}
        >
          <Gear />
        </button>
      </Tooltip>
      {/* A failure is reported wherever it happened, since the row that started
          the read may already be scrolled out of the transcript. */}
      {player.status === 'failed' && player.messageId === messageId && (
        <span className={css.failure} role="status">
          {player.reason === 'playback' ? t('error.playback') : t('error.synth')}
        </span>
      )}
      {open && createPortal(
        <div
          ref={panelRef}
          className={css.popover}
          role="dialog"
          aria-label={t('settings.title')}
          style={panelPosition ?? { visibility: 'hidden' }}
        >
          <label className={css.row}>
            <span className={css.label}>{t('settings.voice')}</span>
            <select className={css.select} value={settings.voice} onChange={chooseVoice}>
              {VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
            </select>
          </label>
          <label className={css.row}>
            <span className={css.label}>
              {t('settings.speed')}
              <span className={css.value}>{t('settings.speedValue', { value: String(settings.speed) })}</span>
            </span>
            <input
              className={css.range}
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={settings.speed}
              onChange={chooseSpeed}
            />
          </label>
          <div className={css.presets}>
            {SPEEDS.map(speed => (
              <button
                key={speed}
                type="button"
                className={css.preset}
                data-active={settings.speed === speed || undefined}
                onClick={() => { setSettings(saveSettings({ speed })) }}
              >
                {speed}×
              </button>
            ))}
          </div>
          <button type="button" className={css.close} onClick={() => { setOpen(false) }}>
            {t('settings.close')}
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}

/** A speaker glyph; ui-primitives ships no audio icon. */
function Speaker() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.5 4.5 5.5H2.5v5h2L8 13.5z"
        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
      />
      <path d="M10.5 6.2a2.6 2.6 0 0 1 0 3.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12.3 4.4a5.2 5.2 0 0 1 0 7.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

/** A four-segment ring marking an in-flight synthesis. */
function Spinner() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={css.spin}>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" opacity="0.25" />
      <path d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** A compact gear for the settings entry point. */
function Gear() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 1.8v1.4M8 12.8v1.4M1.8 8h1.4M12.8 8h1.4M3.6 3.6l1 1M11.4 11.4l1 1M12.4 3.6l-1 1M4.6 11.4l-1 1"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
      />
    </svg>
  )
}
