export function selectRules(catalog, profile) {
  const include = new Set(profile.includeRules ?? []);
  const exclude = new Set(profile.excludeRules ?? []);
  const categories = new Set(profile.includeCategories ?? []);

  return catalog.rules
    .filter((rule) => !exclude.has(rule.id))
    .filter((rule) => {
      if (include.has(rule.id)) return true;
      const applies = rule.appliesTo?.includes('*') || rule.appliesTo?.includes(profile.id);
      const categoryAllowed = categories.size === 0 || categories.has(rule.category);
      return applies && categoryAllowed;
    })
    .map((rule) => ({
      ...rule,
      ...(profile.overrides?.[rule.id] ?? {})
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
}
