import { useMobileStore } from '../store';

interface CameraCardProps {
  onVideoReady: (video: HTMLVideoElement) => void;
}

export function CameraCard({ onVideoReady }: CameraCardProps) {
  const stability = useMobileStore((s) => s.stability);
  const isInRange = useMobileStore((s) => s.isInRange);

  const handleRef = (el: HTMLVideoElement | null) => {
    if (el) onVideoReady(el);
  };

  return (
    <div
      className="relative mx-auto h-[100px] w-[140px] overflow-hidden rounded-2xl border-2 border-neutral-200 bg-black"
      role="region"
      aria-label="Preview da câmera"
    >
      <video
        ref={handleRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
        aria-hidden="true"
      />
      <div
        className={`absolute bottom-1 left-1 right-1 rounded-md px-2 py-0.5 text-center text-[10px] font-semibold backdrop-blur-sm ${
          isInRange
            ? 'bg-success-500/70 text-white'
            : stability > 0.3
            ? 'bg-warning-500/70 text-white'
            : 'bg-error-500/70 text-white'
        }`}
        role="status"
        aria-label={`Estabilidade: ${Math.round(stability * 100)}%, ${isInRange ? 'em alcance' : 'fora de alcance'}`}
      >
        {Math.round(stability * 100)}%
      </div>
    </div>
  );
}
