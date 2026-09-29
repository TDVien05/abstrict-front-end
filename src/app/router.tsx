import { createBrowserRouter } from 'react-router-dom'
import { RequireActor } from './guards/RequireActor'
import { RouteErrorBoundary } from './errors/RouteErrorBoundary'
import { AdminLayout } from './layouts/AdminLayout'
import { AppLayout } from './layouts/AppLayout'
import { PartnerLayout } from './layouts/PartnerLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { RootLayout } from './layouts/RootLayout'
import { RouteTransition } from '../shared/ui/RouteTransition'
import { AdminApprovalsPage, AdminDisputesPage } from '../pages/admin/AdminPages'
import { BookingCreatePage, CustomerDiscoveryPage, CustomerProviderPage, OrderDetailPage, OrdersPage } from '../pages/customer/CustomerPages'
import {
  PartnerAvailabilityPage,
  PartnerDashboardPage,
  PartnerOrderDetailPage,
  PartnerPlansPage,
  PartnerOrdersPage,
} from '../pages/partner/PartnerPages'
import { DiscoveryPage } from '../pages/public/DiscoveryPage'
import { HomePage } from '../pages/public/HomePage'
import { OtpVerificationPage, PartnerSignInPage, PartnerSignUpPage, SignInPage, SignUpPage } from '../pages/public/AuthPages'
import { PartnerCompanyPage } from '../pages/partner/PartnerCompanyPage'
import { PartnerTypeChoicePage } from '../pages/partner/PartnerTypeChoicePage'
import {
  ForbiddenPage,
  NotFoundPage,
  PartnerRegistrationPage,
  ProviderProfilePage,
} from '../pages/public/PublicPlaceholderPages'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: 'login', element: <RouteTransition><SignInPage /></RouteTransition>, errorElement: <RouteErrorBoundary /> },
      { path: 'register', element: <RouteTransition><SignUpPage /></RouteTransition>, errorElement: <RouteErrorBoundary /> },
      { path: 'verify-otp', element: <RouteTransition><OtpVerificationPage /></RouteTransition>, errorElement: <RouteErrorBoundary /> },
      { path: 'partners/register/freelancer', element: <RouteTransition><PartnerSignUpPage /></RouteTransition>, errorElement: <RouteErrorBoundary /> },
      { path: 'partners/login', element: <RouteTransition><PartnerSignInPage /></RouteTransition>, errorElement: <RouteErrorBoundary /> },
      {
        element: <PublicLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'partners', element: <DiscoveryPage /> },
          { path: 'partners/register', element: <PartnerTypeChoicePage /> },
          { path: 'partners/register/kyc', element: <PartnerRegistrationPage /> },
          { path: 'partners/register/company', element: <PartnerCompanyPage /> },
          { path: 'partners/:id', element: <ProviderProfilePage /> },
          { path: 'forbidden', element: <ForbiddenPage /> },
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
          { path: 'discover', element: <CustomerDiscoveryPage /> },
          { path: 'discover/:providerId', element: <CustomerProviderPage /> },
          { path: 'book/:providerId', element: <BookingCreatePage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/:id', element: <OrderDetailPage /> },
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
          { path: 'partner/dashboard', element: <PartnerDashboardPage /> },
          {
            path: 'partner/schedule',
            element: (
              <RequireActor allow={['freelancer']}>
                <PartnerAvailabilityPage />
              </RequireActor>
            ),
          },
          { path: 'partner/orders/:id', element: <PartnerOrderDetailPage /> },
          { path: 'partner/orders', element: <PartnerOrdersPage /> },
          { path: 'partner/plans', element: <PartnerPlansPage /> },
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
          { path: 'admin/approvals', element: <AdminApprovalsPage /> },
          { path: 'admin/disputes', element: <AdminDisputesPage /> },
        ],
      },
      {
        path: '*',
        element: <RouteTransition><NotFoundPage /></RouteTransition>,
        errorElement: <RouteErrorBoundary />,
      },
    ],
  },
])
