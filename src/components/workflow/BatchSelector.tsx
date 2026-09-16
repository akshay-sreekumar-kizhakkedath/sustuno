import React, { useState } from 'react';
import { useBatch } from '../../context/BatchContext';
import { Icon } from '../ui/Icon';

export const BatchSelector: React.FC = () => {
  const { activeBatchId, batches, selectBatch, isLoadingBatches } = useBatch();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-on-surface shadow-xs transition hover:border-primary/50"
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-on-surface-variant">Batch:</span>
        <span className="font-mono-data font-bold text-primary">
          {activeBatchId || (isLoadingBatches ? 'Loading...' : 'None')}
        </span>
        <Icon name="unfold_more" className="text-[16px] text-outline" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Active Batches ({batches.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  window.location.hash = '#/production';
                }}
                className="text-[11.5px] font-semibold text-primary hover:underline"
              >
                Manage All
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {batches.length === 0 ? (
                <p className="p-3 text-center text-[12px] text-on-surface-variant">No batches recorded</p>
              ) : (
                batches.map((b) => {
                  const bId = b.batch_id || b.id;
                  const isSelected = bId === activeBatchId;
                  return (
                    <button
                      key={bId}
                      type="button"
                      onClick={() => {
                        selectBatch(bId);
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] transition ${
                        isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-slate-50 text-on-surface'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono-data font-medium">{bId}</p>
                        <p className="truncate text-[11px] text-on-surface-variant">
                          {b.fabric_type || b.dye_class || 'Textile Batch'}
                        </p>
                      </div>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-slate-600">
                        {b.lifecycle_status || b.status || 'DRAFT'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
