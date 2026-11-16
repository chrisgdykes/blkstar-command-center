export interface KitchenIngredient { amount: string; unit: string; name: string }
export interface KitchenRecipe {
  id: string; name: string; category: string; emoji: string | null; servings: number
  kcal: number; protein: number; carbs: number; fat: number // per serving
  ingredients: KitchenIngredient[]; steps: string[]
  notes: string | null; prep_min: number | null; cook_min: number | null
  meal_prep: string | null; tips: string | null
}
export interface KitchenMeal {
  id: string; plan_date: string; slot: 'preworkout' | 'breakfast' | 'lunch' | 'snack' | 'dinner'
  recipe_id: string | null; servings: number; meal_time: string | null; recipe: KitchenRecipe | null
}
export interface KitchenDayRow {
  plan_date: string; day_type: 'gym' | 'rest'
  target_kcal: number; target_protein: number; target_carbs: number; target_fat: number
}
export interface KitchenDayResponse { date: string; day: KitchenDayRow | null; meals: KitchenMeal[]; dates: string[] }
