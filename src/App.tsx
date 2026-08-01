import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { OverviewPage } from './pages/OverviewPage'
import { ProductionPage } from './pages/ProductionPage'
import { IotMonitoringPage } from './pages/IotMonitoringPage'
import { AiPredictionPage } from './pages/AiPredictionPage'
import { EtpDecisionSupportPage } from './pages/EtpDecisionSupportPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ReportsPage } from './pages/ReportsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="/production" element={<ProductionPage />} />
        <Route path="/iot" element={<IotMonitoringPage />} />
        <Route path="/prediction" element={<AiPredictionPage />} />
        <Route path="/etp" element={<EtpDecisionSupportPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  )
}
