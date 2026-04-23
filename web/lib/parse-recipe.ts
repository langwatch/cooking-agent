export interface IngredientGroup {
  category: string | null;
  items: string[];
}

export interface RecipeData {
  title: string;
  meta: string | null;
  ingredientGroups: IngredientGroup[];
  steps: string[];
  dietaryInfo: string | null;
  chefsTip: string | null;
}

export function parseRecipe(content: string): RecipeData | null {
  if (!/\nIngredients\b/i.test(content)) return null;

  const lines = content.split("\n");

  // Title from first non-empty line
  const rawTitle = lines.find((l) => l.trim())?.replace(/\*\*/g, "").trim() ?? "";

  // Split on em/en-dash for title + meta (cuisine, time)
  const dashMatch = rawTitle.match(/^(.*?)\s[—–]\s(.+)$/) ?? rawTitle.match(/^(.*?)\s-{2,3}\s(.+)$/);
  const title = dashMatch ? dashMatch[1].trim() : rawTitle;
  const meta = dashMatch ? dashMatch[2].trim() : null;

  type Mode = "before" | "ingredients" | "steps";
  let mode: Mode = "before";

  const ingredientGroups: IngredientGroup[] = [];
  const steps: string[] = [];
  let dietaryInfo: string | null = null;
  let chefsTip: string | null = null;

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();

    // Section headers
    if (/^Ingredients\s*$/i.test(trimmed) || /^\*\*Ingredients\*\*\s*$/i.test(trimmed)) {
      mode = "ingredients";
      continue;
    }
    if (
      /^(Steps|Instructions|Method|Directions)\s*$/i.test(trimmed) ||
      /^\*\*(Steps|Instructions)\*\*\s*$/i.test(trimmed)
    ) {
      mode = "steps";
      continue;
    }

    // Dietary info — anywhere
    const dietaryMatch = line.match(/\*?\*?Dietary\s*info:?\*?\*?\s*(.+)/i);
    if (dietaryMatch) {
      dietaryInfo = dietaryMatch[1].replace(/\*\*/g, "").trim();
      continue;
    }

    // Chef's tip — anywhere
    const tipMatch = line.match(/\*?\*?Chef'?s?\s*tip:?\*?\*?\s*(.+)/i);
    if (tipMatch) {
      chefsTip = tipMatch[1].replace(/\*\*/g, "").trim();
      mode = "before";
      continue;
    }

    if (mode === "ingredients") {
      if (!trimmed) continue;
      // Top-level dash = category group
      if (/^- \S/.test(line) && !/^\s/.test(line)) {
        ingredientGroups.push({ category: trimmed.slice(2).trim(), items: [] });
      }
      // Indented dash = ingredient item
      else if (/^\s{2,}- /.test(line)) {
        const item = trimmed.slice(2).trim();
        if (ingredientGroups.length === 0) {
          ingredientGroups.push({ category: null, items: [] });
        }
        ingredientGroups[ingredientGroups.length - 1].items.push(item);
      }
    }

    if (mode === "steps") {
      if (!trimmed) continue;
      const stepMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (stepMatch) {
        steps.push(stepMatch[2]);
      } else if (steps.length > 0 && !trimmed.startsWith("#")) {
        steps[steps.length - 1] += " " + trimmed;
      }
    }
  }

  const validGroups = ingredientGroups.filter((g) => g.items.length > 0);
  if (validGroups.length === 0 && steps.length === 0) return null;

  return { title, meta, ingredientGroups: validGroups, steps, dietaryInfo, chefsTip };
}

export function dietaryBadges(info: string): string[] {
  return info
    .split(/[•,|\/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
