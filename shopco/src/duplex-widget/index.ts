export { AudioWaveform } from './components/duplex-widget/AudioWaveform';
export { DuplexWidgetProvider, useDuplexWidget } from './components/duplex-widget/DuplexWidgetProvider';
export { ProductAssistantPanel } from './components/duplex-widget/ProductAssistantPanel';
export { ProductMicButton } from './components/duplex-widget/ProductMicButton';
export { ProductImageGlow } from './components/duplex-widget/ProductImageGlow';
export { VoiceWidgetOverlay } from './components/duplex-widget/VoiceWidgetOverlay';
export { useFullDuplexVoice } from './hooks/useFullDuplexVoice';
export type {
  AudioChunkMessage,
  ChatMessage,
  DuplexConnectionState,
  InteractionMode,
  ProductContext,
  ServerMessage,
  SystemActionMessage,
  TranscriptMessage,
  UseFullDuplexVoiceOptions,
  UseFullDuplexVoiceReturn,
} from './types/duplex';
export { AudioQueueManager } from './utils/audioQueueManager';
