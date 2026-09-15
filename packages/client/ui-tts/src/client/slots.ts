/**
 * The entry this package contributes. The 'conversation.chat.assistant-actions'
 * slot is declared and typed by ui-chat; this package only adds an entry, so no
 * SlotMap merge lives here. The owner's currency is a MessageId, and the
 * component reads its own text from the `useChat` standard prop.
 * @module @deepseek-ai/dsh-client-ui-tts/client/slots
 */

import type {
  PropsLocale, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
// Type-only: pulls this package's LocaleNamespaceMap merge (the 'tts' seat).
import type {} from './locales.ts'

/** Full props of one assistant-message speak entry. */
export type SpeakActionProps =
  PropsRuntime<'conversation.chat.assistant-actions'>
  & PropsLocale<'tts'>
