/**
 * Per-browser speech preferences. The voice and rate a reader changes live in
 * localStorage, so they survive a reload with no settings namespace, no RPC,
 * and no host schema.
 * @module @deepseek-ai/dsh-client-ui-tts/client/settings
 */

/** The two reader-owned preferences. */
export interface TtsSettings {
  /** Voice sent to the speech route. */
  voice: string
  /** Speaking rate; 1 is the server default. */
  speed: number
}

/** Storage key holding the JSON-encoded preference object. */
const STORAGE_KEY = 'dsh.tts.settings'

/** Values used when nothing is stored or the stored value is unusable. */
export const DEFAULTS: TtsSettings = { voice: 'af_heart', speed: 1 }

/**
 * Read the stored preferences, falling back per field.
 * @returns the current voice and speed.
 */
export function loadSettings(): TtsSettings {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (raw === null || raw === undefined) return { ...DEFAULTS }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS }
    const candidate = parsed as Partial<TtsSettings>
    return {
      voice: typeof candidate.voice === 'string' && candidate.voice !== '' ? candidate.voice : DEFAULTS.voice,
      speed: typeof candidate.speed === 'number' && candidate.speed > 0 ? candidate.speed : DEFAULTS.speed,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

/**
 * Persist one preference patch.
 * @param patch - the fields to write.
 * @returns the settings after the write.
 */
export function saveSettings(patch: Partial<TtsSettings>): TtsSettings {
  const next = { ...loadSettings(), ...patch }
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // A blocked or full store leaves the in-memory value authoritative.
  }
  return next
}
