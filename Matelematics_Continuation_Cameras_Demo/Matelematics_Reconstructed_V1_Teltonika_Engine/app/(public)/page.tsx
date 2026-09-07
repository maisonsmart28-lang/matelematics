import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Stats from "../components/Stats";
import Platform from "../components/Platform";
import Industries from "../components/Industries";
import IndustrySectors from "../components/IndustrySectors";
import HowItWorks from "../components/HowItWorks";
import Benefits from "../components/Benefits";
import TestimonialsCarousel from "../components/TestimonialsCarousel";
import Testimonials from "../components/Testimonials";
import FAQAccordion from "../components/FAQAccordion";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="bg-white">
      <Navbar />
      <Hero />
      <Stats />
      <Platform />
      <Industries />
      <IndustrySectors />
      <HowItWorks />
      <Benefits />
      <TestimonialsCarousel />
      <Testimonials />
      <FAQAccordion />
    </main>
  );
}