import type { RoundLog, TelemetryFrameData, SessionSummary, DeviceInfo } from '@visao/shared';

interface ExportSessionLog {
  sessionId: string;
  deviceInfo: DeviceInfo;
  calibration: {
    ipd_ref_px: number;
    faceWidth_ref_px: number;
    faceHeight_ref_px: number;
    biometric_ratio: number;
    scale_comfort: number;
    timestamp: number;
  };
  rounds: RoundLog[];
  telemetry: TelemetryFrameData[];
  summary: SessionSummary;
}

export class LogExporter {
  private log: ExportSessionLog;

  constructor(sessionId: string) {
    this.log = {
      sessionId,
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        screenDiagonalInches: 0,
        devicePixelRatio: window.devicePixelRatio,
      },
      calibration: {
        ipd_ref_px: 0,
        faceWidth_ref_px: 0,
        faceHeight_ref_px: 0,
        biometric_ratio: 0,
        scale_comfort: 0,
        timestamp: Date.now(),
      },
      rounds: [],
      telemetry: [],
      summary: {
        startTime: Date.now(),
        endTime: 0,
        totalDurationMs: 0,
        finalLogMAR: 0,
        finalSnellen: '',
        averageResponseTimeMs: 0,
        voiceFallbackCount: 0,
        recalibrationCount: 0,
        driftEvents: 0,
      },
    };
  }

  addRound(round: RoundLog): void {
    this.log.rounds.push(round);
  }

  addTelemetry(frame: TelemetryFrameData): void {
    this.log.telemetry.push(frame);
  }

  finalize(finalLogMAR: number, finalSnellen: string): void {
    this.log.summary.endTime = Date.now();
    this.log.summary.totalDurationMs = this.log.summary.endTime - this.log.summary.startTime;
    this.log.summary.finalLogMAR = finalLogMAR;
    this.log.summary.finalSnellen = finalSnellen;
  }

  toJSON(): string {
    return JSON.stringify(this.log, null, 2);
  }

  toCSV(): string {
    const rows: string[] = [];
    rows.push('roundIndex,logMAR,angleArcmin,targetLetter,displayLetters,correct,source,responseTimeMs,distanceMm,scale,stability');

    for (const r of this.log.rounds) {
      rows.push([
        r.roundIndex,
        r.logMAR,
        r.angleArcmin,
        r.targetLetter,
        r.displayLetters.join(' '),
        r.response.correct ? '1' : '0',
        r.response.source,
        r.response.responseTimeMs,
        r.distanceAtPresentation,
        r.scaleAtPresentation,
        r.stabilityAtPresentation,
      ].join(','));
    }

    rows.push('');
    rows.push('--- TELEMETRY ---');
    rows.push('timestamp,faceDetected,faceWidthPx,faceHeightPx,ipdEstimatedPx,scaleCurrent,distanceMm,stability,isInRange');
    for (const t of this.log.telemetry) {
      rows.push([
        Date.now(),
        t.faceDetected ? '1' : '0',
        t.faceWidthPx,
        t.faceHeightPx,
        t.ipdEstimatedPx,
        t.scaleCurrent,
        t.distanceMm ?? '',
        t.stability,
        t.isInRange ? '1' : '0',
      ].join(','));
    }

    rows.push('');
    rows.push('--- SUMMARY ---');
    rows.push(`finalLogMAR,${this.log.summary.finalLogMAR}`);
    rows.push(`finalSnellen,${this.log.summary.finalSnellen}`);
    rows.push(`totalDurationMs,${this.log.summary.totalDurationMs}`);
    rows.push(`averageResponseTimeMs,${this.log.summary.averageResponseTimeMs}`);
    rows.push(`driftEvents,${this.log.summary.driftEvents}`);

    return rows.join('\n');
  }

  downloadJSON(filename = 'session-log.json'): void {
    this.download(this.toJSON(), filename, 'application/json');
  }

  downloadCSV(filename = 'session-log.csv'): void {
    this.download(this.toCSV(), filename, 'text/csv');
  }

  private download(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
