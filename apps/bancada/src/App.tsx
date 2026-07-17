import { SessionManager } from './components/SessionManager';
import { VideoStream } from './components/VideoStream';
import { MetricsPanel } from './components/MetricsPanel';
import { DriftChart } from './components/DriftChart';
import { RoundLogsTable } from './components/RoundLogsTable';
import { ControlsPanel } from './components/ControlsPanel';
import { EventsLog } from './components/EventsLog';

export default function App() {
  return (
    <div className="min-h-full bg-neutral-50 p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">
          SaúdeSeg+ &gt; Exame de Acuidade Visual &gt; Bancada
        </h1>
      </header>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:grid-rows-4">
        <VideoStream />
        <MetricsPanel />
        <SessionManager />
        <DriftChart />
        <EventsLog />
        <ControlsPanel />
        <RoundLogsTable />
      </div>
    </div>
  );
}
