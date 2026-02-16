import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import LifeMap from '@/modules/lifemap/LifeMap';
import Reminders from '@/modules/reminders/Reminders';
import Wishlist from '@/modules/wishlist/Wishlist';
import AssignmentTracker from '@/modules/tracker/AssignmentTracker';
import DashboardPage from '@/modules/dashboard/DashboardPage';
import { JobTrackerPage } from '@/modules/job-tracker/JobTrackerPage';
import AuthWrapper from '@/modules/auth/AuthWrapper';

function App() {
  return (
    <AuthWrapper>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="life-map" element={<LifeMap />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="tracker" element={<AssignmentTracker />} />
            <Route path="jobs" element={<JobTrackerPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthWrapper>
  );
}

export default App;
