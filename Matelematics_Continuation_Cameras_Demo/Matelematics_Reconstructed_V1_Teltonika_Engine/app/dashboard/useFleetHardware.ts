"use client";

import { useEffect, useState } from "react";
import { supabase } from "../components/supabase";
import { availableHardwareFeatures, type Feature, type LiveHardware } from "./hardwareFeatures";

type State = { loading: boolean; features: Set<Feature>; scope: string | null };

// Use the same scoped fleet and per-vehicle access checks as the live dashboard.
// A failed request never grants a capability.
export function useFleetHardware(vehicleId?: string): State {
  const [state, setState] = useState<State>({ loading: true, features: new Set(), scope: vehicleId ?? null });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session absente");
        const headers = { Authorization: `Bearer ${session.access_token}` };
        let vehicles: { id: string }[];
        if (vehicleId) {
          vehicles = [{ id: vehicleId }];
        } else {
          const fleetResponse = await fetch("/api/dashboard/fleet", { headers, cache: "no-store" });
          if (!fleetResponse.ok) throw new Error("Flotte indisponible");
          const fleet = (await fleetResponse.json()) as { vehicles?: { id: string }[] };
          vehicles = fleet.vehicles ?? [];
        }
        const features = new Set<Feature>();
        // Limit concurrent requests so large fleets do not saturate the API.
        for (let index = 0; index < vehicles.length; index += 8) {
          await Promise.all(vehicles.slice(index, index + 8).map(async ({ id }) => {
            try {
              const response = await fetch(`/api/vehicles/${encodeURIComponent(id)}/live`, { headers, cache: "no-store" });
              if (!response.ok) return;
              const data = (await response.json()) as LiveHardware;
              for (const feature of availableHardwareFeatures(data)) features.add(feature);
            } catch { /* An unavailable vehicle cannot enable a feature. */ }
          }));
        }
        if (active) setState({ loading: false, features, scope: vehicleId ?? null });
      } catch {
        if (active) setState({ loading: false, features: new Set(), scope: vehicleId ?? null });
      }
    }
    void load();
    return () => { active = false; };
  }, [vehicleId]);

  // Do not reuse the previous vehicle's features while navigating between vehicles.
  return state.scope !== (vehicleId ?? null)
    ? { loading: true, features: new Set(), scope: vehicleId ?? null }
    : state;
}
