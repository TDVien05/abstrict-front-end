import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireActor } from './guards/RequireActor'
import { RouteErrorBoundary } from './errors/RouteErrorBoundary'
import { AdminLayout } from './layouts/AdminLayout'
import { AppLayout } from './layouts/AppLayout'
import { PartnerLayout } from './layouts/PartnerLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { AdminApprovalsPage, AdminDisputesPage } from '../pages/admin/AdminPages'
import { BookingCreatePage, OrderDetailPage, OrdersPage } from '../pages/customer/CustomerPages'
import {
  PartnerAvailabilityPage,
  PartnerDashboardPage,
  PartnerOrderDetailPage,
  PartnerPlansPage,
} from '../pages/partner/PartnerPages'
import { DiscoveryPage } from '../pages/public/DiscoveryPage'
import { HomePage } from '../pages/public/HomePage'
import { OtpVerificationPage, SignInPage, SignUpPage } from '../pages/public/AuthPages'
import {
  ForbiddenPage,
  NotFoundPage,
  PartnerRegistrationPage,
  ProviderProfilePage,
} from '../pages/public/PublicPlaceholderPages'

export const router = createBrowserRouter([
  { path: 'login', element: <SignInPage />, errorElement: <RouteErrorBoundary /> },
  { path: 'register', element: <SignUpPage />, errorElement: <RouteErrorBoundary /> },
  { path: 'verify-otp', element: <OtpVerificationPage />, errorElement: <RouteErrorBoundary /> },
  { path: 'dang-nhap', element: <Navigate replace to="/login" /> },
  { path: 'dang-ky', element: <Navigate replace to="/register" /> },
  { path: 'xac-thuc-otp', element: <Navigate replace to="/verify-otp" /> },
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'doi-tac', element: <DiscoveryPage /> },
      { path: 'doi-tac/:id', element: <ProviderProfilePage /> },
      { path: 'dang-ky-doi-tac', element: <PartnerRegistrationPage /> },
      { path: 'khong-co-quyen', element: <ForbiddenPage /> },
    ],
  },
  {
    element: (
      <RequireActor allow={['customer']}>
        <AppLayout />
      </RequireActor>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: 'dat-lich/:providerId', element: <BookingCreatePage /> },
      { path: 'don-hang', element: <OrdersPage /> },
      { path: 'don-hang/:id', element: <OrderDetailPage /> },
    ],
  },
  {
    element: (
      <RequireActor allow={['freelancer', 'company']}>
        <PartnerLayout />
      </RequireActor>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: 'doi-tac/dashboard', element: <PartnerDashboardPage /> },
      {
        path: 'doi-tac/lich',
        element: (
          <RequireActor allow={['freelancer']}>
            <PartnerAvailabilityPage />
          </RequireActor>
        ),
      },
      { path: 'doi-tac/don-hang/:id', element: <PartnerOrderDetailPage /> },
      { path: 'doi-tac/goi', element: <PartnerPlansPage /> },
    ],
  },
  {
    element: (
      <RequireActor allow={['admin']}>
        <AdminLayout />
      </RequireActor>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: 'admin/duyet', element: <AdminApprovalsPage /> },
      { path: 'admin/khieu-nai', element: <AdminDisputesPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
    errorElement: <RouteErrorBoundary />,
  },
])
