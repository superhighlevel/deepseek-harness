/**
 * Route and payload facts shared by both halves of this package. Kept free of
 * either half's imports so the browser bundle never pulls node code.
 * @module @deepseek-ai/dsh-client-ui-tts/shared
 */

/** The authenticated Connection route the browser posts synthesis requests to. */
export const SPEECH_PATH = '/api/tts.speech'

/** Voice names the speech server can serve. */
export const VOICES = [
  'af_heart', 'af_alloy', 'af_aoede', 'af_bella', 'af_jessica', 'af_kore',
  'af_nicole', 'af_nova', 'af_river', 'af_sarah', 'af_sky',
  'am_adam', 'am_echo', 'am_eric', 'am_fenrir', 'am_liam', 'am_michael',
  'am_onyx', 'am_puck', 'am_santa',
  'bf_alice', 'bf_emma', 'bf_isabella', 'bf_lily',
  'bm_daniel', 'bm_fable', 'bm_george', 'bm_lewis',
] as const

/** Speaking rates offered by the settings popover. */
export const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const

/** One synthesis request as it crosses the wire. */
export interface SpeechRequest {
  /** Text to speak. */
  text: string
  /** Voice name; the server prefixes a language code when one is absent. */
  voice?: string
  /** Speaking rate. */
  speed?: number
}

/** The route's failure body. */
export interface SpeechFailure {
  /** Stable machine-readable code. */
  error: string
}
