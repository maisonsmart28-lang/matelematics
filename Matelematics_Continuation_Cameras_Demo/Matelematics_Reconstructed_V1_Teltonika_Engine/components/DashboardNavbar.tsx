import Link from "next/link";
import Logo from "@/components/Logo";

export default function DashboardNavbar() {
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
                href="/dashboard"
                className="px-3 pt-2 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-blue-500"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/vehicles"
                className="px-3 pt-2 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-blue-500"
              >
                Véhicules
              </Link>
              <Link
                href="/dashboard/cameras"
                className="px-3 pt-2 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-blue-500"
              >
                Caméras
              </Link>
              <Link
                href="/dashboard/alerts"
                className="px-3 pt-2 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-blue-500"
              >
                Alertes
              </Link>
              <Link
                href="/dashboard/profile"
                className="px-3 pt-2 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-blue-500"
              >
                Profil
              </Link>
              <button
                onClick={() => {
                  // We'll handle logout in a separate function, but for now we can call a logout function
                  // We'll create a logout function in the auth lib and call it here
                  // For now, we'll just remove the user from localStorage and redirect to login
                  localStorage.removeItem("user");
                  window.location.href = "/login";
                }}
                className="px-3 pt-2 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-blue-500"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
