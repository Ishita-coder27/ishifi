import { useFetch } from "./hooks";

export function useCategories() {
  const { data, loading, reload } = useFetch("/api/categories");
  const categories = data?.categories || [];
  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
  const info = (slug) => bySlug[slug] || { slug, name: slug, icon: "sparkles", color: "#BBA88E" };
  return { categories, bySlug, info, loading, reload };
}
