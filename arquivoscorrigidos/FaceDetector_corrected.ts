import type { FaceMeshResult, Landmark } from '@visao/shared';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { MEDIAPIPE_CONFIG } from '@visao/shared';

export type FaceDetectorState = 'idle' | 'loading' | 'ready' | 'error' | 'model-loading';
export type CameraErrorType =
  | 'not-allowed'
  | 'not-found'
  | 'not-readable'
  | 'overconstrained'
  | 'security'
  | 'model-timeout'
  | 'model-failed'
  | 'generic';

export interface CameraErrorDetail {
  type: CameraErrorType;
  message: string;
  userAction?: string;
}

type DetectorListener = (detail: any) => void;

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

export class FaceDetector {
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private state: FaceDetectorState = 'idle';
  private animationId: number | null = null;
  private listeners = new Map<string, Set<DetectorListener>>();
  private faceLandmarker: FaceLandmarker | null = null;
  private lastResult: FaceMeshResult | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frameSkip = 0;
  private modelLoadTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Inicializa câmera + MediaPipe com tratamento de erro específico e timeout
   */
  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    if (this.state !== 'idle') this.stop();
    this.video = videoElement;
    this.state = 'loading';
    this.emit('loading');

    // --- PASSO 1: Acessar câmera com tratamento de erro específico ---
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
    } catch (err: any) {
      const errorDetail = this.parseGetUserMediaError(err);
      this.state = 'error';
      this.emit('error', errorDetail);
      return false;
    }

    this.video.srcObject = this.stream;

    // ✅ Aguardar metadados do vídeo antes de play()
    await new Promise<void>((resolve, reject) => {
      if (!this.video) return reject();
      this.video.onloadedmetadata = () => resolve();
      this.video.onerror = () => reject();
      this.video.play().catch(reject);
    });

    // --- PASSO 2: Carregar MediaPipe com timeout ---
    this.state = 'model-loading';
    this.emit('model-loading');

    try {
      const vision = await this.loadMediaPipeWithTimeout();

      // Tentar GPU primeiro, fallback para CPU
      let delegate: 'GPU' | 'CPU' = 'GPU';
      try {
        this.faceLandmarker = await this.createLandmarker(vision, delegate);
      } catch {
        // Fallback para CPU
        delegate = 'CPU';
        this.emit('fallback-gpu', { message: 'GPU não disponível, usando CPU' });
        this.faceLandmarker = await this.createLandmarker(vision, delegate);
      }

    } catch (err: any) {
      const errorDetail: CameraErrorDetail = {
        type: 'model-failed',
        message: 'Falha ao carregar modelo de detecção facial. Verifique sua conexão.',
        userAction: 'Verifique se está conectado à internet e tente novamente.',
      };
      this.state = 'error';
      this.emit('error', errorDetail);
      this.cleanupStream();
      return false;
    }

    this.state = 'ready';
    this.emit('ready');
    this.startLoop();
    return true;
  }

  /**
   * Carrega MediaPipe com timeout configurável
   */
  private async loadMediaPipeWithTimeout(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.modelLoadTimeout = setTimeout(() => {
        reject(new Error('MediaPipe model load timeout'));
      }, MEDIAPIPE_CONFIG.MODEL_LOAD_TIMEOUT_MS);

      FilesetResolver.forVisionTasks(WASM_CDN)
        .then((vision) => {
          if (this.modelLoadTimeout) clearTimeout(this.modelLoadTimeout);
          resolve(vision);
        })
        .catch((err) => {
          if (this.modelLoadTimeout) clearTimeout(this.modelLoadTimeout);
          reject(err);
        });
    });
  }

  /**
   * Cria FaceLandmarker com delegate específico
   */
  private async createLandmarker(vision: any, delegate: 'GPU' | 'CPU'): Promise<FaceLandmarker> {
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate,
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      canvas: this.canvas,
    });
  }

  /**
   * Converte erros getUserMedia em mensagens específicas para o usuário
   */
  private parseGetUserMediaError(err: any): CameraErrorDetail {
    const name = err?.name || '';
    switch (name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          type: 'not-allowed',
          message: 'Permissão de câmera negada',
          userAction: 'Toque no ícone de cadeado 🔒 na barra de endereço e permita o acesso à câmera.',
        };
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          type: 'not-found',
          message: 'Nenhuma câmera encontrada',
          userAction: 'Verifique se o dispositivo possui câmera frontal e se não está sendo usada por outro app.',
        };
      case 'NotReadableError':
      case 'TrackStartError':
        return {
          type: 'not-readable',
          message: 'Câmera em uso por outro aplicativo',
          userAction: 'Feche outros apps que possam estar usando a câmera (Zoom, Instagram, etc.) e tente novamente.',
        };
      case 'OverconstrainedError':
        return {
          type: 'overconstrained',
          message: 'Resolução de câmera não suportada',
          userAction: 'Tentando resolução alternativa...',
        };
      case 'SecurityError':
        return {
          type: 'security',
          message: 'Contexto não seguro',
          userAction: 'Acesse o aplicativo via HTTPS ou localhost (http://localhost:3000).',
        };
      default:
        return {
          type: 'generic',
          message: 'Falha ao acessar câmera',
          userAction: 'Verifique as permissões do navegador e tente novamente.',
        };
    }
  }

  private startLoop(): void {
    const loop = () => {
      if (this.state !== 'ready' || !this.video || !this.faceLandmarker) return;

      // ✅ Verificar readyState antes de drawImage
      if (this.video.readyState < 2) {
        this.animationId = requestAnimationFrame(loop);
        return;
      }

      this.drawFrame();
      this.frameSkip++;
      if (this.frameSkip % 2 === 0) {
        this.detect();
      }
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  private detect(): void {
    if (!this.video || !this.faceLandmarker) return;
    try {
      const result = this.faceLandmarker.detectForVideo(this.video, performance.now());
      if (result.faceLandmarks?.length) {
        this.lastResult = {
          multiFaceLandmarks: result.faceLandmarks.map((landmarks) =>
            landmarks.map((lm): Landmark => ({ x: lm.x, y: lm.y, z: lm.z }))
          ),
        };
      } else {
        this.lastResult = { multiFaceLandmarks: [] };
      }
    } catch {
      this.lastResult = { multiFaceLandmarks: [] };
    }
  }

  private drawFrame(): void {
    if (!this.video || !this.video.videoWidth) return;
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getImageData(): string {
    return this.canvas.toDataURL('image/jpeg', 0.6);
  }

  getState(): FaceDetectorState {
    return this.state;
  }

  getFaceDetectionResult(): FaceMeshResult {
    return this.lastResult ?? { multiFaceLandmarks: [] };
  }

  isFaceDetected(): boolean {
    return (this.lastResult?.multiFaceLandmarks?.length ?? 0) > 0;
  }

  /**
   * Para completamente e libera todos os recursos
   */
  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.cleanupStream();
    this.faceLandmarker?.close();
    this.faceLandmarker = null;
    this.lastResult = null;
    this.state = 'idle';
  }

  private cleanupStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video = null;
    }
    if (this.modelLoadTimeout) {
      clearTimeout(this.modelLoadTimeout);
      this.modelLoadTimeout = null;
    }
  }

  on(event: string, listener: DetectorListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: DetectorListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: string, detail?: any): void {
    this.listeners.get(event)?.forEach((cb) => cb(detail));
  }
}
