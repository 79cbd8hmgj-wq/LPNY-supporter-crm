import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  InterestAdminRecord,
  SourceAdminRecord,
  TagAdminRecord,
} from "./taxonomies";

export async function loadTaxonomyAdministrationData(): Promise<{
  interests: InterestAdminRecord[];
  tags: TagAdminRecord[];
  sources: SourceAdminRecord[];
}> {
  const supabase = await createServerSupabaseClient();
  const [interestResult, tagResult, sourceResult] = await Promise.all([
    supabase
      .from("interests")
      .select("id, slug, name, active")
      .order("active", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("tags")
      .select("id, name, active")
      .order("active", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("sources")
      .select("id, slug, category, name, active")
      .order("active", { ascending: false })
      .order("name", { ascending: true }),
  ]);

  if (interestResult.error || tagResult.error || sourceResult.error) {
    throw new Error("Unable to load taxonomy administration data");
  }

  return {
    interests: interestResult.data ?? [],
    tags: tagResult.data ?? [],
    sources: sourceResult.data ?? [],
  };
}
