import {
  BookingModeSection,
  HeroSection,
  HowItWorksSection,
  LandingCallToAction,
  LandingFooter,
  PartnerSection,
  ServicesSection,
  TransparentWorkflowSection,
  TrustAndFaqSection,
} from '../../features/landing/components/LandingSections'
import { ScrollProgress } from '../../shared/ui/ScrollProgress'

export function HomePage() {
  return (
    <>
      <ScrollProgress />
      <main className="flex-grow">
        <HeroSection />
        <ServicesSection />
        <PartnerSection />
        <BookingModeSection />
        <HowItWorksSection />
        <TransparentWorkflowSection />
        <TrustAndFaqSection />
        <LandingCallToAction />
      </main>
      <LandingFooter />
    </>
  )
}
