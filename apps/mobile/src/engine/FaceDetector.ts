import type { FaceMeshResult, Landmark } from '@visao/shared';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type FaceDetectorState = 'idle' | 'loading' | 'ready' | 'error';

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

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d')!;
  }

  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    if (this.state !== 'idle') this.stop();
    this.video = videoElement;
    this.state = 'loading';
    this.emit('loading');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      this.video.srcObject = this.stream;
      await this.video.play();

      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        canvas: this.canvas,
      });

      this.state = 'ready';
      this.emit('ready');
      this.startLoop();
      return true;
    } catch {
      this.state = 'error';
      this.emit('error', { message: 'Falha ao acessar câmera' });
      return false;
    }
  }

  private startLoop(): void {
    const loop = () => {
      if (this.state !== 'ready' || !this.video || !this.faceLandmarker) return;
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

  stop(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video = null;
    this.faceLandmarker?.close();
    this.faceLandmarker = null;
    this.lastResult = null;
    this.state = 'idle';
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
