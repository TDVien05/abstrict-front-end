import {
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
        <HowItWorksSection />
        <TransparentWorkflowSection />
        <TrustAndFaqSection />
        <LandingCallToAction />
      </main>
      <LandingFooter />
    </>
  )
}
