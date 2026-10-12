import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './LandingPage.css';
import { LandingAbout } from './LandingAbout';
import { LandingFaq } from './LandingFaq';
import { LandingFeatures } from './LandingFeatures';
import { LandingFinalCta } from './LandingFinalCta';
import { LandingHero } from './LandingHero';
import { LandingOccasions } from './LandingOccasions';
import { LandingPaths } from './LandingPaths';
import { LandingShowcase } from './LandingShowcase';
import { LandingSteps } from './LandingSteps';
import { useLandingPrices } from './useLandingPrices';

interface LandingPageProps {
  onStart: () => void;
}

/** Lleva a la sección que pide la dirección (`/#que-es`), también al llegar desde otra página. */
const useScrollToHash = () => {
  const { hash, key } = useLocation();

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, key]);
};

export const LandingPage = ({ onStart }: LandingPageProps) => {
  const prices = useLandingPrices();
  useScrollToHash();

  return (
    <main className="landing-page">
      <LandingHero onStart={onStart} />
      <LandingPaths aiPrice={prices.aiPrice} themedPrice={prices.themedPrice} />
      <LandingShowcase />
      <LandingSteps />
      <LandingFeatures />
      <LandingOccasions />
      <LandingAbout />
      <LandingFaq aiPrice={prices.aiPrice} />
      <LandingFinalCta onStart={onStart} />
    </main>
  );
};
