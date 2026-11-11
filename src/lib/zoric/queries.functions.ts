import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Fill the caller's own (empty) workspace with demo data. No-op if it already has orders. */
export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("zoric_seed_demo_data" as never);
    if (error) throw new Error(error.message);
    return { inserted: Number(data ?? 0) };
  });
