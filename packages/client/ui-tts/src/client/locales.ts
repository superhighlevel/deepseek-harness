/** `tts` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'action.speak': '朗读这条回答',
  'action.speaking': '正在朗读，点击停止',
  'action.loading': '正在合成语音',
  'settings.title': '语音设置',
  'settings.voice': '音色',
  'settings.speed': '语速',
  'settings.speedValue': '{value} 倍',
  'settings.close': '关闭',
  'error.synth': '语音合成失败',
  'error.playback': '音频播放失败',
  'error.unavailable': '未能连接到语音服务',
} satisfies Record<string, string>

/** The tts namespace key union. */
export type TtsKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The TTS surface's copy: the speak control and its settings popover. */
    tts: TtsKey
  }
}

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'action.speak': 'Read this response aloud',
  'action.speaking': 'Speaking; click to stop',
  'action.loading': 'Synthesizing speech',
  'settings.title': 'Speech settings',
  'settings.voice': 'Voice',
  'settings.speed': 'Speed',
  'settings.speedValue': '{value}×',
  'settings.close': 'Close',
  'error.synth': 'Speech synthesis failed',
  'error.playback': 'Audio playback failed',
  'error.unavailable': 'Could not reach the speech service',
} satisfies Record<TtsKey, string>
