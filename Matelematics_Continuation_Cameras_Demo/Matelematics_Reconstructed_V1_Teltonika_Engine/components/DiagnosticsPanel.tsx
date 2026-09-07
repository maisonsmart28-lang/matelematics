import { useState } from "react";
import { Activity, Package, Zap, TrendingUp } from "lucide-react";

export default function DiagnosticsPanel() {
  const [diagnostics, setDiagnostics] = useState([
    { id: 1, code: "P0300", description: "Ratés d'allumage", severity: "high" },
    { id: 2, code: "P0171", description: "Mélange pauvre", severity: "medium" },
    { id: 3, code: "P0420", description: "Catalyseur inférieur au seuil", severity: "low" },
  ]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-700 flex items-center">
        <Activity className="w-5 h-5 text-blue-500 mr-2" />
        Diagnostic OBD/CAN
      </h2>
      <div className="space-y-3">
        {diagnostics.map((diag) => (
          <div key={diag.id} className="p-4 rounded-lg border-l-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {diag.severity === "high" && (
                  <Zap className="w-5 h-5 text-red-500" />
                )}
                {diag.severity === "medium" && (
                  <Package className="w-5 h-5 text-yellow-500" />
                )}
                {diag.severity === "low" && (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {diag.code} - {diag.description}
                </p>
                <p className="text-sm text-gray-500">Dernière mise à jour : il y a 15 minutes</p>
              </div>
            </div>
            <div className={`
              mt-2 px-3 py-1 rounded-full text-xs font-medium
              ${diag.severity === "high" ? "bg-red-100 text-red-800" :
                diag.severity === "medium" ? "bg-yellow-100 text-yellow-800" :
                "bg-green-100 text-green-800"
              }`}
            >
              {diag.severity === "high" ? "Élevé" :
                diag.severity === "medium" ? "Moyen" :
                "Faible"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
