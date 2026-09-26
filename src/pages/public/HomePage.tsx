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

export function HomePage() {
  return (
    <>
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
