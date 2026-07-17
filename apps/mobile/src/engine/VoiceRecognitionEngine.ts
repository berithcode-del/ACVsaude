import type { VoiceResult, VoiceState } from '@visao/shared';
import { SYSTEM_PARAMS } from '@visao/shared';

type VoiceListener = (detail: any) => void;

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

export class VoiceRecognitionEngine {
  private recognition: SpeechRecognition | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = SYSTEM_PARAMS.VOICE_RETRY_MAX;
  private readonly TIMEOUT_MS = SYSTEM_PARAMS.VOICE_TIMEOUT_MS;
  private isListening = false;
  private fallbackMode = false;
  private permissionDenied = false;
  private state: VoiceState = 'idle';
  private listeners = new Map<string, Set<VoiceListener>>();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) {
      this.fallbackMode = true;
      this.state = 'error';
      this.emit('fallbackActivated');
      return;
    }

    this.recognition = new SR();
    this.recognition!.continuous = false;
    this.recognition!.interimResults = true;
    this.recognition!.lang = 'pt-BR';
    this.recognition!.maxAlternatives = 3;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];

      const result: VoiceResult = {
        transcript: lastResult[0].transcript.trim().toUpperCase(),
        confidence: lastResult[0].confidence,
        isFinal: lastResult.isFinal,
      };

      this.emit('result', result);

      if (result.isFinal) {
        this.isListening = false;
        this.state = 'idle';
        this.retryCount = 0;
        this.clearTimeout();
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.permissionDenied = true;
        this.fallbackMode = true;
        this.state = 'error';
        this.emit('permissionDenied');
        return;
      }

      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        this.emit('retrying', { attempt: this.retryCount, max: this.MAX_RETRIES });
        setTimeout(() => this.startListening(), 500);
      } else {
        this.fallbackMode = true;
        this.state = 'error';
        this.emit('fallbackActivated');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.state === 'listening') {
        this.state = 'idle';
      }
    };
  }

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      this.fallbackMode = true;
      this.permissionDenied = true;
      return false;
    }
  }

  async startListening(): Promise<void> {
    if (this.fallbackMode) {
      this.emit('fallbackMode');
      return;
    }

    if (this.isListening) return;

    if (!this.permissionDenied) {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        this.emit('permissionDenied');
        return;
      }
    }

    try {
      this.recognition?.start();
      this.isListening = true;
      this.state = 'listening';
      this.emit('listeningStarted');

      this.timeoutId = setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
          this.state = 'idle';
          this.emit('timeout');
        }
      }, this.TIMEOUT_MS);
    } catch {
      this.handleStartError();
    }
  }

  private handleStartError(): void {
    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      setTimeout(() => this.startListening(), 1000);
    } else {
      this.fallbackMode = true;
      this.state = 'error';
      this.emit('fallbackActivated');
    }
  }

  stopListening(): void {
    this.clearTimeout();
    this.recognition?.stop();
    this.isListening = false;
    if (this.state === 'listening') {
      this.state = 'idle';
    }
  }

  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  isInFallbackMode(): boolean {
    return this.fallbackMode;
  }

  getState(): VoiceState {
    return this.state;
  }

  setState(s: VoiceState): void {
    this.state = s;
  }

  on(event: string, listener: VoiceListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: VoiceListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: string, detail?: any): void {
    this.listeners.get(event)?.forEach((cb) => cb(detail));
  }

  reset(): void {
    this.stopListening();
    this.retryCount = 0;
    this.fallbackMode = false;
    this.permissionDenied = false;
    this.state = 'idle';
    this.recognition = null;
    this.listeners.clear();
    this.initializeRecognition();
  }
}