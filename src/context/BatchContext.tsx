import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchProductionBatches,
  fetchBatchDossier,
  createProductionBatch,
  confirmBatchRecipe,
  startBatchProduction,
  completeBatchProduction,
  fetchActiveIotSession
} from '../services/apiClient';

export interface BatchDossier {
  batch_id: string;
  lifecycle_status: string;
  material?: any;
  target_shade?: any;
  dye_class?: string;
  machine_id?: string;
  process_parameters?: any;
  confirmed_recipe?: any;
  confirmed_at?: string;
  confirmed_by?: string;
  wastewater_prediction?: any;
  active_session?: any;
  latest_telemetry?: any;
  comparison?: any;
  etp_recommendation?: any;
  created_at?: string;
}

interface BatchContextType {
  activeBatchId: string | null;
  activeBatch: BatchDossier | null;
  batches: any[];
  isLoadingBatches: boolean;
  isLoadingDossier: boolean;
  selectBatch: (batchId: string | null) => void;
  refreshBatches: () => Promise<void>;
  refreshActiveBatch: () => Promise<void>;
  createBatch: (payload: any) => Promise<any>;
  confirmRecipe: (batchId: string, recipe: any) => Promise<any>;
  startProduction: (batchId: string, deviceId?: string) => Promise<any>;
  completeBatch: (batchId: string, outcome?: any) => Promise<any>;
}

const BatchContext = createContext<BatchContextType | undefined>(undefined);

const STORAGE_KEY = 'sustuno_active_batch_id';

export const BatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeBatchId, setActiveBatchIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY) || null;
  });
  const [activeBatch, setActiveBatch] = useState<BatchDossier | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);

  const selectBatch = useCallback((batchId: string | null) => {
    setActiveBatchIdState(batchId);
    if (batchId) {
      localStorage.setItem(STORAGE_KEY, batchId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setActiveBatch(null);
    }
  }, []);

  const refreshBatches = useCallback(async () => {
    setIsLoadingBatches(true);
    try {
      const res = await fetchProductionBatches();
      const list = res?.batches || [];
      setBatches(list);
      // If no active batch selected yet, or selected batch no longer exists, select first available
      if (list.length > 0) {
        const stored = localStorage.getItem(STORAGE_KEY);
        const match = list.find((b: any) => (b.batch_id || b.id) === stored);
        if (match) {
          setActiveBatchIdState(match.batch_id || match.id);
        } else if (!stored) {
          const firstId = list[0].batch_id || list[0].id;
          setActiveBatchIdState(firstId);
          localStorage.setItem(STORAGE_KEY, firstId);
        }
      }
    } catch (err) {
      console.warn('Failed to load production batches:', err);
    } finally {
      setIsLoadingBatches(false);
    }
  }, []);

  const refreshActiveBatch = useCallback(async () => {
    if (!activeBatchId) {
      setActiveBatch(null);
      return;
    }
    setIsLoadingDossier(true);
    try {
      const res = await fetchBatchDossier(activeBatchId);
      if (res && res.success && res.data) {
        setActiveBatch(res.data);
      } else if (res && res.batch_id) {
        setActiveBatch(res);
      }
    } catch (err) {
      console.warn(`Failed to fetch dossier for ${activeBatchId}:`, err);
    } finally {
      setIsLoadingDossier(false);
    }
  }, [activeBatchId]);

  // Initial load
  useEffect(() => {
    refreshBatches();
    // Check if there is an active IoT session on the backend
    fetchActiveIotSession().then((sessionRes) => {
      if (sessionRes && sessionRes.active_batch_id) {
        setActiveBatchIdState((prev) => prev || sessionRes.active_batch_id);
      }
    }).catch(() => {});
  }, [refreshBatches]);

  useEffect(() => {
    refreshActiveBatch();
  }, [activeBatchId, refreshActiveBatch]);

  const handleCreateBatch = async (payload: any) => {
    const res = await createProductionBatch(payload);
    if (res && res.success && res.data) {
      const newId = res.data.batch_id || res.data.id;
      await refreshBatches();
      selectBatch(newId);
      return res;
    }
    return res;
  };

  const handleConfirmRecipe = async (batchId: string, recipe: any) => {
    const res = await confirmBatchRecipe(batchId, recipe);
    if (res && res.success) {
      await refreshActiveBatch();
      await refreshBatches();
    }
    return res;
  };

  const handleStartProduction = async (batchId: string, deviceId?: string) => {
    const res = await startBatchProduction(batchId, deviceId);
    if (res && res.success) {
      await refreshActiveBatch();
      await refreshBatches();
    }
    return res;
  };

  const handleCompleteBatch = async (batchId: string, outcome?: any) => {
    const res = await completeBatchProduction(batchId, outcome);
    if (res && res.success) {
      await refreshActiveBatch();
      await refreshBatches();
    }
    return res;
  };

  return (
    <BatchContext.Provider
      value={{
        activeBatchId,
        activeBatch,
        batches,
        isLoadingBatches,
        isLoadingDossier,
        selectBatch,
        refreshBatches,
        refreshActiveBatch,
        createBatch: handleCreateBatch,
        confirmRecipe: handleConfirmRecipe,
        startProduction: handleStartProduction,
        completeBatch: handleCompleteBatch,
      }}
    >
      {children}
    </BatchContext.Provider>
  );
};

export const useBatch = () => {
  const context = useContext(BatchContext);
  if (!context) {
    throw new Error('useBatch must be used within a BatchProvider');
  }
  return context;
};
