// Compile-time only ambient declarations for Deno edge functions.
// These allow TypeScript to type-check URL imports and the global Deno object in a Node/Vite environment.

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  // Minimal signature to satisfy TS; actual behavior is provided by Deno at runtime.
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  // Minimal signature; returns any to avoid coupling to Node package types.
  export function createClient(url: string, key: string): any;
}

// Global Deno ambient declaration for accessing environment variables in edge functions.
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};