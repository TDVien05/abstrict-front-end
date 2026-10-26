import { createBrowserRouter } from 'react-router-dom'
import { RequireActor } from './guards/RequireActor'
import { RouteErrorBoundary } from './errors/RouteErrorBoundary'
import { AdminLayout } from './layouts/AdminLayout'
import { AppLayout } from './layouts/AppLayout'
import { PartnerLayout } from './layouts/PartnerLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { RootLayout } from './layouts/RootLayout'
import { RouteTransition } from '../shared/ui/RouteTransition'
import { AdminCompaniesPage, AdminDashboardPage, AdminCompanyDetailPage, AdminDisputeDetailPage, AdminDisputesPage, AdminKycDetailPage, AdminKycPage, AdminPlansPage } from '../pages/admin/AdminPages'
import { BookingCreatePage, CustomerDiscoveryPage, CustomerProviderPage, DisputeCreatePage, DisputeDetailPage, DisputesPage, OrderDetailPage, OrdersPage, ProfilePage } from '../pages/customer/CustomerPages'
import {
  PartnerAvailabilityPage,
  PartnerDashboardPage,
  PartnerOrderDetailPage,
  PartnerPlansPage,
  PartnerProfilePage,
  PartnerOrdersPage,
} from '../pages/partner/PartnerPages'
import { DiscoveryPage } from '../pages/public/DiscoveryPage'
import { HomePage } from '../pages/public/HomePage'
import { OtpVerificationPage, PartnerSignInPage, PartnerSignUpPage, SignInPage, SignUpPage } from '../pages/public/AuthPages'
import { CompanyOnboardingPage } from '../pages/partner/CompanyOnboardingPage'
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
      { path: 'partners/register/company', element: <RouteTransition><PartnerSignUpPage kind="company" /></RouteTransition>, errorElement: <RouteErrorBoundary /> },
      { path: 'partners/login', element: <RouteTransition><PartnerSignInPage /></RouteTransition>, errorElement: <RouteErrorBoundary /> },
      {
        element: <PublicLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'partners', element: <DiscoveryPage /> },
          { path: 'partners/register', element: <PartnerTypeChoicePage /> },
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
          { path: 'orders/:id/dispute', element: <DisputeCreatePage /> },
          { path: 'disputes', element: <DisputesPage /> },
          { path: 'disputes/:disputeId', element: <DisputeDetailPage /> },
          { path: 'profile', element: <ProfilePage /> },
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
            path: 'partner/company/onboarding',
            element: (
              <RequireActor allow={['company']}>
                <CompanyOnboardingPage />
              </RequireActor>
            ),
          },
          {
            path: 'partner/schedule',
            element: (
              <RequireActor allow={['freelancer']}>
                <PartnerAvailabilityPage />
              </RequireActor>
            ),
          },
          // Đơn đặt lịch hiện chỉ có API cho freelancer; đặt lịch với doanh nghiệp chưa được hỗ trợ.
          { path: 'partner/orders/:id', element: <RequireActor allow={['freelancer']}><PartnerOrderDetailPage /></RequireActor> },
          { path: 'partner/orders', element: <RequireActor allow={['freelancer']}><PartnerOrdersPage /></RequireActor> },
          { path: 'partner/plans', element: <PartnerPlansPage /> },
          { path: 'partner/profile', element: <RequireActor allow={['freelancer']}><PartnerProfilePage /></RequireActor> },
          { path: 'partners/register/kyc', element: <RequireActor allow={['freelancer']}><PartnerRegistrationPage /></RequireActor> },
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
          { path: 'admin', element: <AdminDashboardPage /> },
          { path: 'admin/approvals', element: <AdminCompaniesPage /> },
          { path: 'admin/companies/:providerId', element: <AdminCompanyDetailPage /> },
          { path: 'admin/kyc', element: <AdminKycPage /> },
          { path: 'admin/kyc/:providerId', element: <AdminKycDetailPage /> },
          { path: 'admin/plans', element: <AdminPlansPage /> },
          { path: 'admin/disputes', element: <AdminDisputesPage /> },
          { path: 'admin/disputes/:disputeId', element: <AdminDisputeDetailPage /> },
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
