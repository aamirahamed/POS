import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import LifeMap from '@/modules/lifemap/LifeMap';
import Reminders from '@/modules/reminders/Reminders';
import Wishlist from '@/modules/wishlist/Wishlist';
import DashboardPage from '@/modules/dashboard/DashboardPage';
import { JobTrackerPage } from '@/modules/job-tracker/JobTrackerPage';
import ShoppingListPage from '@/modules/shopping/ShoppingListPage';
import AuthWrapper from '@/modules/auth/AuthWrapper';
import FinancePage from '@/modules/finance/FinancePage';
import MentorPage from '@/modules/mentor/MentorPage';
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
            <Route path="jobs" element={<JobTrackerPage />} />
            <Route path="shopping" element={<ShoppingListPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="mentor" element={<MentorPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthWrapper>
  );
}

export default App;
