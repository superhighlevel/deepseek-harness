/**
 * TTS surface plugin, browser half: the speak control in the
 * conversation.chat.assistant-actions strip. It posts to the authenticated
 * route the node half registers, so the speech endpoint never reaches the page.
 * @module @deepseek-ai/dsh-client-ui-tts/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the ui-chat SlotMap merge and the SessionStandardProps.useChat seat.
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { SpeakAction } from './SpeakAction.tsx'
import { en, zh } from './locales.ts'

export type { SpeakActionProps } from './slots.ts'
export type { TtsKey } from './locales.ts'
export type { TtsSettings } from './settings.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'tts'

/** The slot this plugin contributes one entry to. */
const SLOT = 'conversation.chat.assistant-actions'

/** Required services: the slot registry and the locale. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: one speak entry per finalized assistant message.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-tts: dictionaries')
  ctx.slots.inject(SLOT, () => ctx.slots.register({
    name: SLOT,
    id: 'tts',
    // After the feedback controls (order 10), so the speak button sits at the
    // end of the injected cluster rather than between copy and the thumbs.
    order: 20,
    locale: NS,
  }, SpeakAction))
}
