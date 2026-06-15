import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import LifeMap from '@/modules/lifemap/LifeMap';
import Reminders from '@/modules/reminders/Reminders';
import Wishlist from '@/modules/wishlist/Wishlist';
import AssignmentTracker from '@/modules/tracker/AssignmentTracker';
import DashboardPage from '@/modules/dashboard/DashboardPage';
import { JobTrackerPage } from '@/modules/job-tracker/JobTrackerPage';
import ShoppingListPage from '@/modules/shopping/ShoppingListPage';
import AuthWrapper from '@/modules/auth/AuthWrapper';
import ThoughtIncubatorPage from '@/modules/incubator/ThoughtIncubatorPage';
import FinancePage from '@/modules/finance/FinancePage';
import QuickCapture from '@/modules/capture/QuickCapture';
import { Toaster } from '@/components/ui/sonner';

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
            <Route path="shopping" element={<ShoppingListPage />} />
            <Route path="incubator" element={<ThoughtIncubatorPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="quick-capture" element={<QuickCapture />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthWrapper>
  );
}

export default App;
