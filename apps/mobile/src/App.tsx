import { useMobileStore } from './store';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CalibrationScreen } from './components/CalibrationScreen';
import { ExamScreen } from './components/ExamScreen';
import { ResultScreen } from './components/ResultScreen';
import { ErrorScreen } from './components/ErrorScreen';
import type { ExamPhase } from '@visao/shared';

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
      onRetry={() => useMobileStore.getState().setPhase('welcome')}
    />
  );
}

function CurrentPhase() {
  const phase = useMobileStore((s) => s.phase);

  if (phase === 'error') return <ErrorScreenPhase />;
  return <ExamPhaseScreen />;
}

export default function App() {
  return (
    <div className="safe-area-top mx-auto flex h-full max-w-md flex-col bg-neutral-50">
      <CurrentPhase />
    </div>
  );
}
