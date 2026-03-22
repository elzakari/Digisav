import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/auth/Login'
import { RegisterPage } from '@/pages/auth/Register'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword'
import { ResetPasswordPage } from '@/pages/auth/ResetPassword'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { CreateGroupPage } from '@/pages/admin/CreateGroup'
import { GroupDashboard } from '@/pages/admin/GroupDashboard'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { MemberDashboard } from '@/pages/member/MemberDashboard'
import { MemberGroupDashboard } from '@/pages/member/MemberGroupDashboard'
import { JoinGroupPage } from '@/pages/member/JoinGroup'
import { MainLayout } from '@/components/layout/MainLayout'
import { CalendarPage } from '@/pages/CalendarPage'
import { SysAdminDashboard } from '@/pages/sysadmin/SysAdminDashboard'
import { SysAdminUsers } from '@/pages/sysadmin/SysAdminUsers'
import { SysAdminGroups } from '@/pages/sysadmin/SysAdminGroups'
import { SavingsGoals } from '@/pages/savings/SavingsGoals';
import { CreateGoalPage } from '@/pages/savings/CreateGoal';
import { InvestmentDashboard } from '@/pages/investments/InvestmentDashboard';
import { UnifiedDashboard } from '@/pages/dashboard/UnifiedDashboard';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { Toaster } from 'react-hot-toast';
import { authService } from '@/services/auth.service'

function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    authService.initialize().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return null
  }

  return (
    <MainLayout>
      <Toaster position="top-right" toastOptions={{ className: 'glass-toast' }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/join" element={<JoinGroupPage />} />

        <Route element={<ProtectedRoute />}>
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/calendar" element={<CalendarPage />} />
          <Route path="/admin/groups/create" element={<CreateGroupPage />} />
          <Route path="/admin/groups/:groupId" element={<GroupDashboard />} />

          {/* Member Routes */}
          <Route path="/overview" element={<UnifiedDashboard />} />
          <Route path="/member/dashboard" element={<MemberDashboard />} />
          <Route path="/member/calendar" element={<CalendarPage />} />
          <Route path="/member/groups/:groupId" element={<MemberGroupDashboard />} />

          {/* SysAdmin Routes */}
          <Route path="/sysadmin/dashboard" element={<SysAdminDashboard />} />
          <Route path="/sysadmin/users" element={<SysAdminUsers />} />
          <Route path="/sysadmin/groups" element={<SysAdminGroups />} />

          {/* Savings Routes */}
          <Route path="/savings" element={<SavingsGoals />} />
          <Route path="/savings/create" element={<CreateGoalPage />} />

          {/* Investment Routes */}
          <Route path="/investments" element={<InvestmentDashboard />} />

          {/* Settings Route */}
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </MainLayout>
  )
}

export default App
