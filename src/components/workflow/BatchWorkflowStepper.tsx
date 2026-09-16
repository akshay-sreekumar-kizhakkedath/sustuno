import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBatch } from '../../context/BatchContext';
import { Icon } from '../ui/Icon';

const STEPS = [
  { id: 'OPTIMIZATION_PENDING', label: '1. Batch Input', path: '/production', icon: 'assignment' },
  { id: 'OPTIMIZATION_READY', label: '2. AI Optimization', path: '/dye-optimizer', icon: 'auto_awesome' },
  { id: 'RECIPE_CONFIRMED', label: '3. Recipe Confirmed', path: '/dye-optimizer', icon: 'check_circle' },
  { id: 'PRODUCTION_ACTIVE', label: '4. IoT Production', path: '/iot', icon: 'sensors' },
  { id: 'ETP_REVIEW', label: '5. ETP Decision', path: '/etp', icon: 'science' },
  { id: 'BATCH_COMPLETED', label: '6. Batch Complete', path: '/production', icon: 'model_training' },
];

export const BatchWorkflowStepper: React.FC = () => {
  const { activeBatchId, activeBatch } = useBatch();
  const navigate = useNavigate();

  if (!activeBatchId) return null;

  const currentStatus = activeBatch?.lifecycle_status || 'OPTIMIZATION_PENDING';

  const getStepState = (stepId: string) => {
    const statusOrder = ['OPTIMIZATION_PENDING', 'OPTIMIZATION_READY', 'RECIPE_CONFIRMED', 'PRODUCTION_ACTIVE', 'ETP_REVIEW', 'BATCH_COMPLETED'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepTargetIndex = statusOrder.indexOf(stepId);

    if (currentStatus === stepId) return 'current';
    if (currentIndex >= stepTargetIndex) return 'completed';
    return 'upcoming';
  };

  return (
    <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="linear_scale" className="text-[18px]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Active Batch Pipeline:</span>
              <span className="font-mono-data text-[13px] font-bold text-primary">{activeBatchId}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {currentStatus}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              {activeBatch?.material?.fabric_id || 'Standard Material'} · {activeBatch?.material?.weight_kg ?? 200} kg · {activeBatch?.dye_class || 'Reactive'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px]">
          {currentStatus === 'RECIPE_CONFIRMED' && (
            <button
              onClick={() => navigate('/iot')}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <Icon name="play_arrow" className="text-[16px]" />
              Start IoT Monitoring
            </button>
          )}
          {currentStatus === 'PRODUCTION_ACTIVE' && (
            <button
              onClick={() => navigate('/etp')}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-primary/90"
            >
              <Icon name="arrow_forward" className="text-[16px]" />
              View ETP Decision
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((step, idx) => {
          const state = getStepState(step.id);
          return (
            <button
              key={step.id}
              onClick={() => navigate(step.path)}
              className={`group flex items-center gap-2 rounded-lg p-2 text-left transition ${
                state === 'current'
                  ? 'bg-primary/10 ring-1 ring-primary'
                  : state === 'completed'
                  ? 'bg-emerald-50/70 hover:bg-emerald-100/60'
                  : 'bg-slate-50 opacity-60 hover:opacity-100'
              }`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  state === 'current'
                    ? 'bg-primary text-white'
                    : state === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {state === 'completed' ? '✓' : idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-[11px] font-semibold ${
                    state === 'current'
                      ? 'text-primary'
                      : state === 'completed'
                      ? 'text-emerald-800'
                      : 'text-slate-600'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
