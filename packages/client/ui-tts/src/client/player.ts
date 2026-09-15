/**
 * The single speech player, owned outside React.
 *
 * A message-row control unmounts whenever the transcript virtualizes it out or
 * the reader switches Session, so playback must not live in that component:
 * an element owned there is paused by its own cleanup. This module owns the one
 * `Audio` element for the whole page, and components subscribe to it.
 * @module @deepseek-ai/dsh-client-ui-tts/client/player
 */

/** What the page is currently doing. */
export type PlayerState =
  /** Nothing is playing. */
  | { readonly status: 'idle' }
  /** A synthesis request is in flight. */
  | { readonly status: 'loading'; readonly messageId: string }
  /** Audio for one message is playing. */
  | { readonly status: 'playing'; readonly messageId: string }
  /** The last attempt for one message failed with a copy key. */
  | { readonly status: 'failed'; readonly messageId: string; readonly reason: 'synth' | 'playback' }

/** One synthesis request the player needs to perform. */
export interface SpeakRequest {
  /** The message being read. */
  readonly messageId: string
  /** Text to synthesize. */
  readonly text: string
  /** Voice name. */
  readonly voice: string
  /** Speaking rate. */
  readonly speed: number
  /** The authenticated route to post to. */
  readonly path: string
}

type Listener = () => void

/** The one player instance for this page. */
class SpeechPlayer {
  private state: PlayerState = { status: 'idle' }
  private readonly listeners = new Set<Listener>()
  private audio: HTMLAudioElement | null = null
  private url: string | null = null
  private readonly requests = new Map<string, AbortController>()

  /** @returns the current player state. */
  getSnapshot = (): PlayerState => this.state

  /**
   * Subscribe to player state changes.
   * @param listener - invoked after each change.
   * @returns the unsubscribe function.
   */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Start reading one message, or stop if it is already the active one.
   * @param request - the message, its text, and the reader's preferences.
   */
  toggle = (request: SpeakRequest): void => {
    const current = this.state
    if (current.status !== 'idle' && current.messageId === request.messageId) {
      this.stop()
      return
    }
    this.releaseAudio()
    this.abortPending()
    this.setState({ status: 'loading', messageId: request.messageId })
    const controller = new AbortController()
    this.requests.set(request.messageId, controller)
    void this.synthesize(request, controller)
  }

  /** Stop playback and cancel any in-flight synthesis. */
  stop = (): void => {
    this.abortPending()
    this.releaseAudio()
    this.setState({ status: 'idle' })
  }

  private async synthesize(request: SpeakRequest, controller: AbortController): Promise<void> {
    try {
      const response = await fetch(request.path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: request.text, voice: request.voice, speed: request.speed }),
        signal: controller.signal,
      })
      if (this.requests.get(request.messageId) !== controller) return
      if (!response.ok) {
        this.fail(request.messageId, 'synth')
        return
      }
      const blob = await response.blob()
      if (this.requests.get(request.messageId) !== controller) return
      this.requests.delete(request.messageId)
      this.url = URL.createObjectURL(blob)
      const audio = new Audio(this.url)
      this.audio = audio
      audio.onended = () => {
        if (this.audio !== audio) return
        this.releaseAudio()
        this.setState({ status: 'idle' })
      }
      audio.onerror = () => {
        if (this.audio !== audio) return
        this.releaseAudio()
        this.fail(request.messageId, 'playback')
      }
      this.setState({ status: 'playing', messageId: request.messageId })
      await audio.play()
    } catch (error) {
      if (controller.signal.aborted) return
      if (this.requests.get(request.messageId) !== controller) return
      this.requests.delete(request.messageId)
      void error
      this.fail(request.messageId, 'synth')
    }
  }

  private fail(messageId: string, reason: 'synth' | 'playback'): void {
    this.requests.delete(messageId)
    this.setState({ status: 'failed', messageId, reason })
  }

  private abortPending(): void {
    for (const controller of this.requests.values()) controller.abort()
    this.requests.clear()
  }

  private releaseAudio(): void {
    const audio = this.audio
    this.audio = null
    if (audio !== null) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
    }
    if (this.url !== null) {
      URL.revokeObjectURL(this.url)
      this.url = null
    }
  }

  private setState(next: PlayerState): void {
    this.state = next
    for (const listener of this.listeners) listener()
  }
}

/** The page-wide player. */
export const speechPlayer = new SpeechPlayer()
