import ServicesGrid from "@/components/ServicesGrid";

export default function ServicesPage() {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-8">Our Services</h2>
        <ServicesGrid />
      </div>
    </section>
  );
}