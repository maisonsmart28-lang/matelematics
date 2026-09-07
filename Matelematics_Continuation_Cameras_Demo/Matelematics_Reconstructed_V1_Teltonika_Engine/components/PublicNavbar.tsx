import Link from "next/link";
import Logo from "@/components/Logo";

export default function PublicNavbar() {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Logo />
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/"
                className="px-3 pt-2 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-blue-500"
              >
                Accueil
              </Link>
              <Link
                href="/services"
                className="px-3 pt-2 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-blue-500"
              >
                Services
              </Link>
              <Link
                href="/contact"
                className="px-3 pt-2 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-blue-500"
              >
                Contact
              </Link>
              <Link
                href="/login"
                className="px-3 pt-2 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-blue-500"
              >
                Espace Client
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
