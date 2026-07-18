import { useEffect } from 'react';
import { useMobileStore } from './store';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CalibrationScreen } from './components/CalibrationScreen';
import { ExamScreen } from './components/ExamScreen';
import { ResultScreen } from './components/ResultScreen';
import { ErrorScreen } from './components/ErrorScreen';
import { onControlEvent } from './hooks/useWebSocket';
import type { ExamPhase, ControlAction, ControlParameter } from '@visao/shared';

function extractSessionIdFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/session\/([a-f0-9-]+)$/i);
  return match ? match[1] : null;
}

interface PhaseConfig {
  Screen: () => JSX.Element;
  ariaLabel: string;
}

function isExamPhase(phase: string): phase is Exclude<ExamPhase, 'error'> {
  return phase !== 'error';
}

function ExamPhaseScreen() {
  const phase = useMobileStore((s) => s.phase);

  const SCREENS: Record<Exclude<ExamPhase, 'error'>, PhaseConfig> = {
    welcome: { Screen: WelcomeScreen, ariaLabel: 'Tela inicial' },
    calibration_step1: { Screen: CalibrationScreen, ariaLabel: 'Calibração - braço esticado' },
    calibration_step2: { Screen: CalibrationScreen, ariaLabel: 'Calibração - posição confortável' },
    calibration_complete: { Screen: ExamScreen, ariaLabel: 'Exame em andamento' },
    exam_running: { Screen: ExamScreen, ariaLabel: 'Exame em andamento' },
    exam_paused: { Screen: ExamScreen, ariaLabel: 'Exame pausado' },
    exam_finished: { Screen: ResultScreen, ariaLabel: 'Resultado do exame' },
  };

  if (!isExamPhase(phase)) return null;

  const config = SCREENS[phase];
  return <config.Screen />;
}

function ErrorScreenPhase() {
  const errorType = useMobileStore((s) => s.errorType);
  const errorMessage = useMobileStore((s) => s.errorMessage);

  return (
    <ErrorScreen
      type={errorType ?? 'generic'}
      message={errorMessage ?? undefined}
      onRetry={() => {
        useMobileStore.getState().setError(null);
        const hasCalibration = useMobileStore.getState().calibrationState?.isCalibrated;
        useMobileStore.getState().setPhase(hasCalibration ? 'calibration_complete' : 'welcome');
      }}
    />
  );
}

function CurrentPhase() {
  const phase = useMobileStore((s) => s.phase);

  if (phase === 'error') return <ErrorScreenPhase />;
  return <ExamPhaseScreen />;
}

export default function App() {
  const setSessionId = useMobileStore((s) => s.setSessionId);
  const updateParam = useMobileStore((s) => s.updateParam);
  const setPhase = useMobileStore((s) => s.setPhase);
  const reset = useMobileStore((s) => s.reset);

  useEffect(() => {
    const sessionIdFromUrl = extractSessionIdFromUrl();
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
    }
  }, [setSessionId]);

  useEffect(() => {
    const cleanup = onControlEvent((action: ControlAction, parameter?: ControlParameter) => {
      console.log('[mobile] Controle remoto:', action, parameter);
      switch (action) {
        case 'abort_test':
          reset();
          setPhase('welcome');
          break;
        case 'adjust_parameter':
          if (parameter) {
            updateParam(parameter.name, parameter.value);
          }
          break;
        case 'request_calibration':
          setPhase('calibration_step1');
          break;
        case 'start_test':
        case 'pause_test':
        case 'resume_test':
          console.log('[mobile] Ação de exame ignorada (mobile é auto-guiado):', action);
          break;
      }
    });
    return cleanup;
  }, [updateParam, setPhase, reset]);

  return (
    <div className="safe-area-top mx-auto flex h-full max-w-md flex-col bg-neutral-50">
      <CurrentPhase />
    </div>
  );
}
