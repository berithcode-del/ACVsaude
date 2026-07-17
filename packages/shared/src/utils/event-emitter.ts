type Listener<T = any> = (detail: T) => void;

export class EventEmitter<EventMap extends Record<string, any> = {}> {
  private listeners = new Map<string, Set<Listener<any>>>();

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    const key = String(event);
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(listener);
  }

  off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    this.listeners.get(String(event))?.delete(listener);
  }

  emit<K extends keyof EventMap>(event: K, detail?: EventMap[K]): void {
    this.listeners.get(String(event))?.forEach((cb) => cb(detail));
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
