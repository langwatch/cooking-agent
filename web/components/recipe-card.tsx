"use client";

import { useState } from "react";
import { Check, ChefHat, Clock, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseRecipe, dietaryBadges } from "@/lib/parse-recipe";
import { MarkdownRenderer } from "@/components/markdown-renderer";

function badgeClass(badge: string): string {
  const b = badge.toLowerCase();
  if (b.includes("vegan")) return "bg-emerald-900/50 text-emerald-300 border-emerald-700/50";
  if (b.includes("gluten")) return "bg-amber-900/50 text-amber-300 border-amber-700/50";
  if (b.includes("dairy")) return "bg-sky-900/50 text-sky-300 border-sky-700/50";
  if (b.includes("nut")) return "bg-orange-900/50 text-orange-300 border-orange-700/50";
  if (b.includes("vegetarian")) return "bg-green-900/50 text-green-300 border-green-700/50";
  if (b.includes("keto")) return "bg-violet-900/50 text-violet-300 border-violet-700/50";
  return "bg-muted/60 text-muted-foreground border-border/60";
}

export function RecipeCard({ content, proseEnabled }: { content: string; proseEnabled?: boolean }) {
  const recipe = parseRecipe(content);

  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  if (!recipe) {
    return <MarkdownRenderer content={content} proseEnabled={proseEnabled} />;
  }

  const badges = recipe.dietaryInfo ? dietaryBadges(recipe.dietaryInfo) : [];
  const totalIngredients = recipe.ingredientGroups.reduce((n, g) => n + g.items.length, 0);
  const checkedCount = checkedIngredients.size;

  function toggleIngredient(key: string) {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleStep(idx: number) {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="recipe-card rounded-2xl overflow-hidden border border-border/50 bg-card shadow-xl shadow-black/30">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative px-5 py-4 bg-gradient-to-br from-accent/25 via-accent/5 to-card border-b border-border/50">
        {/* subtle texture strip */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground leading-snug">{recipe.title}</h2>
            {recipe.meta && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                <Clock size={11} className="text-accent shrink-0" />
                <span>{recipe.meta}</span>
              </p>
            )}
          </div>
          <ChefHat size={26} className="text-accent/70 shrink-0 mt-0.5" />
        </div>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {badges.map((b, i) => (
              <span
                key={i}
                className={cn("text-xs px-2 py-0.5 rounded-full border font-medium tracking-wide", badgeClass(b))}
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Body: ingredients + steps ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row">
        {/* Ingredients */}
        {recipe.ingredientGroups.length > 0 && (
          <div className="p-4 sm:w-[42%] sm:border-r border-b sm:border-b-0 border-border/40 bg-muted/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
                <Utensils size={10} />
                Ingredients
              </h3>
              {totalIngredients > 0 && (
                <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                  {checkedCount}/{totalIngredients}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {recipe.ingredientGroups.map((group, gi) => (
                <div key={gi}>
                  {group.category && (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-accent/70 mb-1.5">
                      {group.category}
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {group.items.map((item, ii) => {
                      const key = `${gi}-${ii}`;
                      const done = checkedIngredients.has(key);
                      return (
                        <li
                          key={ii}
                          onClick={() => toggleIngredient(key)}
                          className={cn(
                            "flex items-start gap-2 text-[13px] cursor-pointer select-none group transition-opacity",
                            done ? "opacity-40" : ""
                          )}
                        >
                          <span
                            className={cn(
                              "mt-[1px] flex-shrink-0 w-[15px] h-[15px] rounded border transition-all flex items-center justify-center",
                              done
                                ? "bg-accent border-accent"
                                : "border-border/50 group-hover:border-accent/50 bg-background/30"
                            )}
                          >
                            {done && <Check size={9} strokeWidth={3} className="text-background" />}
                          </span>
                          <span className={cn("leading-snug", done && "line-through decoration-muted-foreground/50")}>
                            {item}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        {recipe.steps.length > 0 && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
              Instructions
            </h3>
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => {
                const done = completedSteps.has(i);
                return (
                  <li
                    key={i}
                    onClick={() => toggleStep(i)}
                    className={cn(
                      "flex items-start gap-3 cursor-pointer select-none group text-sm transition-opacity",
                      done ? "opacity-40" : ""
                    )}
                  >
                    <span
                      className={cn(
                        "flex-shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                        done
                          ? "bg-accent/20 text-accent/60 border border-accent/30"
                          : "bg-accent text-background group-hover:bg-accent/90"
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className={cn("leading-relaxed mt-0.5", done && "line-through decoration-muted-foreground/50")}>
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      {/* ── Chef's tip ─────────────────────────────────────────── */}
      {recipe.chefsTip && (
        <div className="px-5 py-3 border-t border-border/40 bg-accent/[0.06] flex items-start gap-2.5">
          <span className="text-sm shrink-0 leading-relaxed">👨‍🍳</span>
          <p className="text-sm text-foreground/85 leading-relaxed">
            <span className="font-semibold text-accent">Chef&apos;s tip: </span>
            {recipe.chefsTip}
          </p>
        </div>
      )}
    </div>
  );
}
