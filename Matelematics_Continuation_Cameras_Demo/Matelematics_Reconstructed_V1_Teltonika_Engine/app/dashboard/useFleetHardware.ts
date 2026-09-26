"use client";

import { useEffect, useState } from "react";
import { supabase } from "../components/supabase";

type Feature = "camera" | "fuel" | "diagnostics";
type State = { loading: boolean; features: Set<Feature> };

// Use the same scoped fleet and per-vehicle access checks as the live dashboard.
// A failed request never grants a capability.
export function useFleetHardware(): State {
  const [state, setState] = useState<State>({ loading: true, features: new Set() });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session absente");
        const headers = { Authorization: `Bearer ${session.access_token}` };
        const fleetResponse = await fetch("/api/dashboard/fleet", { headers, cache: "no-store" });
        if (!fleetResponse.ok) throw new Error("Flotte indisponible");
        const fleet = (await fleetResponse.json()) as { vehicles?: { id: string }[] };
        const features = new Set<Feature>();
        // Limit concurrent requests so large fleets do not saturate the API.
        const vehicles = fleet.vehicles ?? [];
        for (let index = 0; index < vehicles.length; index += 8) {
          await Promise.all(vehicles.slice(index, index + 8).map(async ({ id }) => {
            try {
              const response = await fetch(`/api/vehicles/${encodeURIComponent(id)}/live`, { headers, cache: "no-store" });
              if (!response.ok) return;
              const data = (await response.json()) as { hardware?: { capabilities?: string[] } };
              const caps = new Set(data.hardware?.capabilities ?? []);
              if (caps.has("camera") && caps.has("video")) features.add("camera");
              if (caps.has("fuel_level") || caps.has("fuel_used")) features.add("fuel");
              if (caps.has("dtc")) features.add("diagnostics");
            } catch { /* An unavailable vehicle cannot enable a feature. */ }
          }));
        }
        if (active) setState({ loading: false, features });
      } catch {
        if (active) setState({ loading: false, features: new Set() });
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return state;
}
