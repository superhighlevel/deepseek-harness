/**
 * The authenticated speech route: synthesizes one text through a Kokoro
 * OpenAI-compatible endpoint and returns the audio bytes.
 *
 * Registered on Connection's fetch registry, so it inherits the browser-trust
 * fence and the endpoint never reaches the page.
 * @module @deepseek-ai/dsh-client-ui-tts/speech-route
 */

import type { SpeechRequest } from './shared.ts'

/** Resolved deployment configuration for the speech route. */
export interface SpeechConfig {
  /** Base URL of the OpenAI-compatible speech server. */
  baseUrl: string
  /** Voice used when a request names none. */
  voice: string
  /** Speaking rate used when a request names none. */
  speed: number
  /** Upper bound on synthesized input, in characters. */
  maxChars: number
}

/**
 * Synthesize one request through the configured server.
 * @param config - resolved deployment configuration.
 * @param request - the authenticated HTTP request from Connection.
 * @returns WAV audio on success, or a JSON failure with a stable code.
 */
export async function handleSpeech(config: SpeechConfig, request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { allow: 'POST' } })
  }
  let body: SpeechRequest
  try {
    body = await request.json() as SpeechRequest
  } catch {
    return failure('invalid-body', 400)
  }
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (text === '') return failure('empty-text', 400)
  const voice = typeof body.voice === 'string' && body.voice !== '' ? body.voice : config.voice
  const speed = typeof body.speed === 'number' && Number.isFinite(body.speed) && body.speed > 0
    ? body.speed
    : config.speed
  const clipped = text.length > config.maxChars ? text.slice(0, config.maxChars) : text
  try {
    const upstream = await fetch(`${config.baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'kokoro', input: clipped, voice, speed, response_format: 'wav' }),
      signal: request.signal,
    })
    if (!upstream.ok) return failure(`upstream-${String(upstream.status)}`, 502)
    const audio = await upstream.arrayBuffer()
    return new Response(audio, {
      status: 200,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'audio/wav',
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    request.signal.throwIfAborted()
    return failure(error instanceof Error ? error.message : 'request-failed', 502)
  }
}

/**
 * Build one JSON failure response.
 * @param error - stable machine-readable code.
 * @param status - HTTP status for the response.
 * @returns the failure response.
 */
function failure(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
