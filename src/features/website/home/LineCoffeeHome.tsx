"use client";

import { useLuxuryScrollReveal } from "./hooks/useLuxuryScrollReveal";
import { HeroSection } from "./sections/HeroSection";
import { CategoriesSection } from "./sections/CategoriesSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { StorySection } from "./sections/StorySection";
import { BestSellersSection } from "./sections/BestSellersSection";
import { JournalSection } from "./sections/JournalSection";
import { TestimonialsSection } from "./sections/TestimonialsSection";
import { SocialGallerySection } from "./sections/SocialGallerySection";
import { ContactSection } from "./sections/ContactSection";

export function LineCoffeeHome() {
  useLuxuryScrollReveal();

  return (
    <>
      <HeroSection />
      <CategoriesSection />
      <FeaturesSection />
      <StorySection />
      <BestSellersSection />
      <JournalSection />
      <TestimonialsSection />
      <SocialGallerySection />
      <ContactSection />
    </>
  );
}
