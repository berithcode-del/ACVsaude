import type { RoundLog, TelemetryFrameData, ExamSummary, DeviceInfo } from '@visao/shared';

interface ExportSessionLog {
  sessionId: string;
  deviceInfo: DeviceInfo;
  calibration: {
    ipdRefPx: number;
    faceWidthRefPx: number;
    faceHeightRefPx: number;
    biometricRatio: number;
    scaleComfort: number;
    timestamp: number;
  };
  rounds: RoundLog[];
  telemetry: TelemetryFrameData[];
  summary: ExamSummary;
  timestamps: { start: number; end: number };
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
        ipdRefPx: 0,
        faceWidthRefPx: 0,
        faceHeightRefPx: 0,
        biometricRatio: 0,
        scaleComfort: 0,
        timestamp: Date.now(),
      },
      rounds: [],
      telemetry: [],
      summary: {
        totalRounds: 0,
        correctCount: 0,
        incorrectCount: 0,
        finalLogMAR: 0,
        finalSnellen: '',
        finalDecimal: 0,
        averageResponseTimeMs: 0,
        voiceFallbackCount: 0,
        recalibrationCount: 0,
        driftEventsCount: 0,
      },
      timestamps: { start: Date.now(), end: 0 },
    };
  }

  addRound(round: RoundLog): void {
    this.log.rounds.push(round);
  }

  addTelemetry(frame: TelemetryFrameData): void {
    this.log.telemetry.push(frame);
  }

  finalize(finalLogMAR: number, finalSnellen: string): void {
    this.log.timestamps.end = Date.now();
    this.log.summary.finalLogMAR = finalLogMAR;
    this.log.summary.finalSnellen = finalSnellen;
    this.log.summary.totalRounds = this.log.rounds.length;
    this.log.summary.correctCount = this.log.rounds.filter(r => r.correct).length;
    this.log.summary.incorrectCount = this.log.rounds.filter(r => !r.correct).length;
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
        r.correct ? '1' : '0',
        r.responseSource,
        r.responseTimeMs,
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
    rows.push(`totalRounds,${this.log.summary.totalRounds}`);
    rows.push(`correctCount,${this.log.summary.correctCount}`);
    rows.push(`averageResponseTimeMs,${this.log.summary.averageResponseTimeMs}`);
    rows.push(`driftEventsCount,${this.log.summary.driftEventsCount}`);

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
