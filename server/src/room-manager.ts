import type { SessionRole } from '@visao/shared';

interface SessionState {
  sessionId: string;
  mobileId: string | null;
  bancadaId: string | null;
  createdAt: number;
  lastActivity: number;
  connected: Set<string>;
}

export class RoomManager {
  private sessions = new Map<string, SessionState>();
  private readonly SESSION_TTL = 3_600_000;
  private readonly CLEANUP_INTERVAL = 60_000;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  createSession(): string {
    this.purgeOrphanedSessions();
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      sessionId,
      mobileId: null,
      bancadaId: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      connected: new Set(),
    });
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => this.purgeOrphanedSessions(), this.CLEANUP_INTERVAL);
    }
    return sessionId;
  }

  joinSession(sessionId: string, socketId: string, role: SessionRole): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (role === 'mobile') session.mobileId = socketId;
    else session.bancadaId = socketId;

    session.connected.add(socketId);
    session.lastActivity = Date.now();
    return true;
  }

  leaveSession(sessionId: string, socketId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.connected.delete(socketId);
    if (session.mobileId === socketId) session.mobileId = null;
    if (session.bancadaId === socketId) session.bancadaId = null;
    session.lastActivity = Date.now();

    if (session.connected.size === 0) {
      this.cleanup(sessionId);
    }
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  isMobileConnected(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return !!session?.mobileId;
  }

  isBancadaConnected(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return !!session?.bancadaId;
  }

  getSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  private cleanup(sessionId: string): void {
    setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (session && session.connected.size === 0) {
        this.sessions.delete(sessionId);
      }
    }, this.SESSION_TTL);
  }

  private purgeOrphanedSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.connected.size === 0 && now - session.lastActivity > this.SESSION_TTL) {
        this.sessions.delete(id);
      }
    }
  }

  getPeerCount(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    return session ? session.connected.size : 0;
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
