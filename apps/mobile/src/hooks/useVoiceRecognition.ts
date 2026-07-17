import { useRef, useCallback, useEffect } from 'react';
import { useMobileStore } from '../store';
import { VoiceRecognitionEngine } from '../engine/VoiceRecognitionEngine';
import { normalizeLetter } from '@visao/shared';

export function useVoiceRecognition() {
  const engineRef = useRef<VoiceRecognitionEngine | null>(null);
  const setVoiceState = useMobileStore((s) => s.setVoiceState);
  const setDockState = useMobileStore((s) => s.setDockState);
  const setVoiceEnabled = useMobileStore((s) => s.setVoiceEnabled);
  const setError = useMobileStore((s) => s.setError);

  const onResultRef = useRef<((letter: string) => void) | null>(null);

  useEffect(() => {
    const engine = new VoiceRecognitionEngine();
    engineRef.current = engine;

    engine.on('listeningStarted', () => {
      setVoiceState('listening');
      setDockState('listening');
    });

    engine.on('result', (result: { transcript: string; isFinal: boolean }) => {
      if (result.isFinal) {
        const letter = normalizeLetter(result.transcript);
        if (letter && onResultRef.current) {
          onResultRef.current(letter);
        }
        setVoiceState('idle');
        setDockState('answering');
      } else {
        setVoiceState('processing');
      }
    });

    engine.on('permissionDenied', () => {
      setVoiceEnabled(false);
      setError('Permissão do microfone negada. Use os botões manuais.');
    });

    engine.on('fallbackActivated', () => {
      setVoiceEnabled(false);
      setError('Reconhecimento de voz indisponível. Use os botões manuais.');
    });

    engine.on('timeout', () => {
      setVoiceState('idle');
      setDockState('waiting');
    });

    engine.on('fallbackMode', () => {
      setVoiceState('idle');
    });

    return () => {
      engine.reset();
    };
  }, []);

  const startListening = useCallback(async () => {
    await engineRef.current?.startListening();
  }, []);

  const stopListening = useCallback(() => {
    engineRef.current?.stopListening();
  }, []);

  const isFallback = useCallback(() => {
    return engineRef.current?.isInFallbackMode() ?? true;
  }, []);

  const onResult = useCallback((cb: (letter: string) => void) => {
    onResultRef.current = cb;
  }, []);

  return { startListening, stopListening, isFallback, onResult };
}
