import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { OverviewPage } from './pages/OverviewPage'
import { ProductionPage } from './pages/ProductionPage'
import { IotMonitoringPage } from './pages/IotMonitoringPage'
import { AiPredictionPage } from './pages/AiPredictionPage'
import { DyeOptimizerPage } from './pages/DyeOptimizerPage'
import { EtpDecisionSupportPage } from './pages/EtpDecisionSupportPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ReportsPage } from './pages/ReportsPage'
import { BatchWorkspacePage } from './pages/BatchWorkspacePage'
import { BatchProvider } from './context/BatchContext'

export default function App() {
  return (
    <BatchProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="/production" element={<ProductionPage />} />
          <Route path="/production/orders/:orderId" element={<ProductionPage />} />
          <Route path="/production/batches/:batchId" element={<BatchWorkspacePage />} />
          <Route path="/production/batches/:batchId/workspace" element={<BatchWorkspacePage />} />
          <Route path="/production/batches/:batchId/shade" element={<BatchWorkspacePage />} />
          <Route path="/production/batches/:batchId/wastewater" element={<BatchWorkspacePage />} />
          <Route path="/production/batches/:batchId/etp" element={<BatchWorkspacePage />} />
          <Route path="/production/batches/:batchId/report" element={<BatchWorkspacePage />} />
          <Route path="/iot" element={<IotMonitoringPage />} />
          <Route path="/prediction" element={<AiPredictionPage />} />
          <Route path="/dye-optimizer" element={<DyeOptimizerPage />} />
          <Route path="/dye-optimizer/:orderId" element={<DyeOptimizerPage />} />
          <Route path="/etp" element={<EtpDecisionSupportPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BatchProvider>
  )
}

