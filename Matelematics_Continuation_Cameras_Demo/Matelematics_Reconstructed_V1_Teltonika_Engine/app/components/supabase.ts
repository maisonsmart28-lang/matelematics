import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const sessionStorageAdapter = {
  getItem(key: string) {
    if (typeof window === "undefined") {
      return null;
    }

    return window.sessionStorage.getItem(key);
  },

  setItem(
    key: string,
    value: string,
  ) {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      key,
      value,
    );
  },

  removeItem(key: string) {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.removeItem(
      key,
    );
  },
};

const fallbackAuth = {
  getSession: async () => ({
    data: {
      session: null,
    },
    error: null,
  }),

  signInWithPassword: async () => ({
    data: {
      user: null,
      session: null,
    },

    error: new Error(
      "Configuration Supabase indisponible.",
    ),
  }),

  onAuthStateChange: () => ({
    data: {
      subscription: {
        unsubscribe: () =>
          undefined,
      },
    },
  }),

  signOut: async () => ({
    error: null,
  }),
};

export const supabase: SupabaseClient =
  supabaseUrl &&
  supabasePublishableKey
    ? createClient(
        supabaseUrl,
        supabasePublishableKey,
        {
          auth: {
            persistSession: true,

            storage:
              sessionStorageAdapter,

            autoRefreshToken: true,

            detectSessionInUrl: true,
          },
        },
      )
    : ({
        auth: fallbackAuth,
      } as unknown as SupabaseClient);
