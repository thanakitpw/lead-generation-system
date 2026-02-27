import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/common/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CampaignsPage from './pages/Campaigns/CampaignsPage'
import NewCampaignPage from './pages/Campaigns/NewCampaignPage'
import CampaignDetailPage from './pages/Campaigns/CampaignDetailPage'
import DraftsPage from './pages/Drafts/DraftsPage'
import DraftReviewPage from './pages/Drafts/DraftReviewPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="campaigns/new" element={<NewCampaignPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="drafts" element={<DraftsPage />} />
          <Route path="drafts/:id" element={<DraftReviewPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
