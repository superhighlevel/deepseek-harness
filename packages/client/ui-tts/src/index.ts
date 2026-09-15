/**
 * Text-to-speech plugin, node half. Registers the authenticated speech route
 * that synthesizes a reply through a Kokoro OpenAI-compatible endpoint. The
 * browser half is discovered through the package.json `dsh.client` declaration.
 * @module @deepseek-ai/dsh-client-ui-tts
 */

import type { Context } from '@deepseek-ai/cordis'
import s from '@deepseek-ai/schemastery'
// Type-only: pulls the Connection service merge (ctx.connection).
import type {} from '@deepseek-ai/dsh-client-connection'
import { handleSpeech, type SpeechConfig } from './speech-route.ts'
import { SPEECH_PATH } from './shared.ts'

/** Deployment configuration for the speech route. */
export interface Config {
  /** Base URL of the OpenAI-compatible speech server. */
  baseUrl: string
  /** Voice used when a request names none. */
  voice: string
  /** Speaking rate used when a request names none. */
  speed: number
  /** Upper bound on synthesized input, in characters. */
  maxChars: number
}

/** The route requires the Connection fetch registry. */
export const inject = ['connection']

/** Loader validation for the route's deployment configuration. */
export const Config: s<Config> = s.object({
  baseUrl: s.string().default('http://127.0.0.1:8880'),
  voice: s.string().default('af_heart'),
  speed: s.number().default(1),
  maxChars: s.number().step(1).min(1).default(4000),
})

/**
 * Register the authenticated speech route.
 * @param ctx - host context carrying the Connection fetch registry.
 * @param config - resolved deployment configuration.
 */
export function apply(ctx: Context, config: Config): void {
  const resolved: SpeechConfig = {
    baseUrl: config.baseUrl.replace(/\/+$/, ''),
    voice: config.voice,
    speed: config.speed,
    maxChars: config.maxChars,
  }
  ctx.connection.fetch.register({
    path: SPEECH_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: request => handleSpeech(resolved, request),
  })
}
