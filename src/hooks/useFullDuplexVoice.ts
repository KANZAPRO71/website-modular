'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  DuplexConnectionState,
  InteractionMode,
  ProductContext,
  ServerMessage,
  UseFullDuplexVoiceOptions,
  UseFullDuplexVoiceReturn,
} from '../types/duplex';
import { AudioQueueManager } from '../utils/audioQueueManager';
import { downsampleFloat32ToPcm16, GEMINI_INPUT_RATE, pcm16ToBase64 } from '../utils/pcmCapture';

const DEFAULT_CHUNK_INTERVAL_MS = 100;

export function useFullDuplexVoice(options: UseFullDuplexVoiceOptions): UseFullDuplexVoiceReturn {
  const {
    wsUrl,
    productContext = null,
    chunkIntervalMs = DEFAULT_CHUNK_INTERVAL_MS,
    vadThreshold = 0.06,
    playbackSampleRate = 24_000,
    onSystemAction,
    onConnectionChange,
    onTranscript,
    onError,
  } = options;

  const [connectionState, setConnectionState] = useState<DuplexConnectionState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioMuted, setIsAudioMutedState] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const pcmProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmSinkRef = useRef<GainNode | null>(null);
  const vadFrameRef = useRef<number | null>(null);
  const audioQueueRef = useRef<AudioQueueManager | null>(null);
  const productContextRef = useRef<ProductContext | null>(productContext);
  const connectionStateRef = useRef<DuplexConnectionState>('idle');
  const isAudioMutedRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const speakingStartedAtRef = useRef(0);
  const micUploadEnabledRef = useRef(false);
  const greetingFallbackTimerRef = useRef<number | null>(null);

  const enableMicUpload = useCallback(() => {
    micUploadEnabledRef.current = true;

    if (greetingFallbackTimerRef.current !== null) {
      window.clearTimeout(greetingFallbackTimerRef.current);
      greetingFallbackTimerRef.current = null;
    }
  }, []);

  const disableMicUpload = useCallback(() => {
    micUploadEnabledRef.current = false;

    if (greetingFallbackTimerRef.current !== null) {
      window.clearTimeout(greetingFallbackTimerRef.current);
      greetingFallbackTimerRef.current = null;
    }
  }, []);

  const scheduleGreetingFallback = useCallback(() => {
    disableMicUpload();
    greetingFallbackTimerRef.current = window.setTimeout(() => {
      micUploadEnabledRef.current = true;
      greetingFallbackTimerRef.current = null;
    }, 3500);
  }, [disableMicUpload]);

  const updateConnectionState = useCallback(
    (state: DuplexConnectionState) => {
      connectionStateRef.current = state;
      setConnectionState(state);
      onConnectionChange?.(state);
    },
    [onConnectionChange],
  );

  const reportError = useCallback(
    (error: Error) => {
      updateConnectionState('error');
      onError?.(error);
    },
    [onError, updateConnectionState],
  );

  const getAudioQueue = useCallback(() => {
    if (!audioQueueRef.current) {
      audioQueueRef.current = new AudioQueueManager(playbackSampleRate);
    }

    return audioQueueRef.current;
  }, [playbackSampleRate]);

  const syncAnalyser = useCallback(() => {
    const analyser = getAudioQueue().analyserNode;
    setAnalyserNode(analyser);
  }, [getAudioQueue]);

  const interrupt = useCallback(() => {
    getAudioQueue().interrupt();
    setIsSpeaking(false);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'INTERRUPT' }));
    }
  }, [getAudioQueue]);

  const stopVadLoop = useCallback(() => {
    if (vadFrameRef.current !== null) {
      cancelAnimationFrame(vadFrameRef.current);
      vadFrameRef.current = null;
    }
  }, []);

  const startVadLoop = useCallback(() => {
    stopVadLoop();

    const analyser = micAnalyserRef.current;
    if (!analyser) {
      return;
    }

    const buffer = new Float32Array(analyser.fftSize);

    const tick = () => {
      analyser.getFloatTimeDomainData(buffer);

      let sumSquares = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        sumSquares += buffer[i] * buffer[i];
      }

      const rms = Math.sqrt(sumSquares / buffer.length);
      const speakingGraceMs = 900;
      const pastGracePeriod =
        Date.now() - speakingStartedAtRef.current > speakingGraceMs;

      if (rms > vadThreshold && getAudioQueue().isPlaying && pastGracePeriod) {
        interrupt();
      }

      vadFrameRef.current = requestAnimationFrame(tick);
    };

    vadFrameRef.current = requestAnimationFrame(tick);
  }, [getAudioQueue, interrupt, stopVadLoop, vadThreshold]);

  const handleServerMessage = useCallback(
    async (raw: MessageEvent<string>) => {
      let message: ServerMessage;

      try {
        message = JSON.parse(raw.data) as ServerMessage;
      } catch {
        return;
      }

      if (message.type === 'AUDIO_CHUNK') {
        if (isAudioMutedRef.current) {
          return;
        }

        enableMicUpload();

        if (!getAudioQueue().isPlaying) {
          speakingStartedAtRef.current = Date.now();
        }

        updateConnectionState('speaking');
        setIsSpeaking(true);
        syncAnalyser();

        await getAudioQueue().enqueue(
          message.data,
          message.format ?? 'pcm16',
          message.sampleRate ?? playbackSampleRate,
          message.channels ?? 1,
        );

        if (!getAudioQueue().isPlaying) {
          setIsSpeaking(false);
          if (connectionStateRef.current !== 'listening') {
            updateConnectionState('connected');
          }
        }

        return;
      }

      if (message.type === 'TRANSCRIPT') {
        onTranscript?.(message.role, message.text, message.final);
        return;
      }

      if (message.type === 'SYSTEM_ACTION') {
        onSystemAction?.(message.action, message.payload);
        return;
      }

      if (message.type === 'ERROR') {
        reportError(new Error(message.message));
      }
    },
    [
      enableMicUpload,
      getAudioQueue,
      onSystemAction,
      onTranscript,
      playbackSampleRate,
      reportError,
      syncAnalyser,
      updateConnectionState,
    ],
  );

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    updateConnectionState('connecting');

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        updateConnectionState('connected');
        resolve();
      };

      ws.onmessage = (event) => {
        void handleServerMessage(event as MessageEvent<string>);
      };

      ws.onerror = () => {
        reportError(new Error('WebSocket connection failed'));
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        if (connectionStateRef.current !== 'error') {
          updateConnectionState('idle');
        }
      };
    });
  }, [handleServerMessage, reportError, updateConnectionState, wsUrl]);

  const startSession = useCallback(
    async (context?: ProductContext | null, mode: InteractionMode = 'text') => {
      if (context) {
        productContextRef.current = context;
      }

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await connect();
      }

      if (sessionStartedRef.current) {
        return;
      }

      scheduleGreetingFallback();

      wsRef.current?.send(
        JSON.stringify({
          type: 'SESSION_START',
          context: productContextRef.current,
          mode,
        }),
      );

      sessionStartedRef.current = true;
    },
    [connect, scheduleGreetingFallback],
  );

  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'TEXT_MESSAGE',
        text,
        context: productContextRef.current,
      }),
    );
  }, []);

  const setAudioMuted = useCallback(
    (muted: boolean) => {
      isAudioMutedRef.current = muted;
      setIsAudioMutedState(muted);

      if (muted) {
        getAudioQueue().interrupt();
        setIsSpeaking(false);
      }
    },
    [getAudioQueue],
  );

  const resetSession = useCallback(() => {
    sessionStartedRef.current = false;
    disableMicUpload();
  }, [disableMicUpload]);

  const updateProductContext = useCallback((context: ProductContext) => {
    productContextRef.current = context;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UPDATE_PRODUCT_CONTEXT',
          context,
        }),
      );
    }
  }, []);

  const stopListening = useCallback(() => {
    stopVadLoop();

    if (pcmProcessorRef.current) {
      pcmProcessorRef.current.disconnect();
      pcmProcessorRef.current.onaudioprocess = null;
      pcmProcessorRef.current = null;
    }

    pcmSinkRef.current?.disconnect();
    pcmSinkRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    micAnalyserRef.current = null;

    setIsListening(false);

    if (connectionStateRef.current !== 'speaking') {
      updateConnectionState(wsRef.current?.readyState === WebSocket.OPEN ? 'connected' : 'idle');
    }
  }, [stopVadLoop, updateConnectionState]);

  const startListening = useCallback(
    async (context?: ProductContext | null) => {
      if (context) {
        productContextRef.current = context;
      }

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await connect();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const audioContext = await getAudioQueue().ensureContext();
      const micSource = audioContext.createMediaStreamSource(stream);
      const micAnalyser = audioContext.createAnalyser();
      micAnalyser.fftSize = 512;
      micSource.connect(micAnalyser);
      micAnalyserRef.current = micAnalyser;

      if (!sessionStartedRef.current) {
        scheduleGreetingFallback();

        wsRef.current?.send(
          JSON.stringify({
            type: 'SESSION_START',
            context: productContextRef.current,
            mode: 'voice',
          }),
        );
        sessionStartedRef.current = true;
      }

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const sink = audioContext.createGain();
      sink.gain.value = 0;

      processor.onaudioprocess = (event) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN || !micUploadEnabledRef.current) {
          return;
        }

        const pcm16 = downsampleFloat32ToPcm16(
          event.inputBuffer.getChannelData(0),
          audioContext.sampleRate,
          GEMINI_INPUT_RATE,
        );

        wsRef.current.send(
          JSON.stringify({
            type: 'AUDIO_CHUNK',
            data: pcm16ToBase64(pcm16),
            format: 'pcm16',
            sampleRate: GEMINI_INPUT_RATE,
            context: productContextRef.current,
          }),
        );
      };

      micSource.connect(processor);
      processor.connect(sink);
      sink.connect(audioContext.destination);

      pcmProcessorRef.current = processor;
      pcmSinkRef.current = sink;

      updateConnectionState('listening');
      setIsListening(true);
      startVadLoop();
    },
    [connect, getAudioQueue, scheduleGreetingFallback, startVadLoop, updateConnectionState],
  );

  const disconnect = useCallback(() => {
    stopListening();
    interrupt();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    void getAudioQueue().destroy();
    audioQueueRef.current = null;
    sessionStartedRef.current = false;
    disableMicUpload();
    setAnalyserNode(null);
    updateConnectionState('idle');
  }, [disableMicUpload, getAudioQueue, interrupt, stopListening, updateConnectionState]);

  useEffect(() => {
    productContextRef.current = productContext;
  }, [productContext]);

  useEffect(() => {
    const queue = getAudioQueue();
    const interval = window.setInterval(() => {
      const speaking = queue.isPlaying;
      setIsSpeaking(speaking);

      if (!speaking && connectionStateRef.current === 'speaking') {
        updateConnectionState(isListening ? 'listening' : 'connected');
      }
    }, 120);

    return () => {
      window.clearInterval(interval);
    };
  }, [getAudioQueue, isListening, updateConnectionState]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    isListening,
    isSpeaking,
    isAudioMuted,
    connect,
    disconnect,
    startSession,
    startListening,
    stopListening,
    sendTextMessage,
    setAudioMuted,
    resetSession,
    updateProductContext,
    interrupt,
    analyserNode,
  };
}
