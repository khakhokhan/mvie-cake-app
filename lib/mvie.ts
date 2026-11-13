import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  ingredients,
  orders,
  productions,
  recipeIngredients,
  recipes,
  stockReceipts,
  transactions,
} from "@/db/schema";

export type MvieData = Awaited<ReturnType<typeof loadMvieData>>;

export function ingredientUnitCost(item: typeof ingredients.$inferSelect) {
  return Number(item.purchasePrice) / Math.max(0.01, Number(item.packSize));
}

export function effectiveQuantity(quantity: number, lossPercent: number) {
  return quantity / Math.max(0.01, 1 - Number(lossPercent || 0) / 100);
}

export function calculateRecipeCost(
  recipe: typeof recipes.$inferSelect,
  lines: (typeof recipeIngredients.$inferSelect)[],
  ingredientRows: (typeof ingredients.$inferSelect)[],
) {
  const ingredientCost = lines.reduce((sum, line) => {
    const item = ingredientRows.find((row) => row.id === line.ingredientId);
    return item
      ? sum + effectiveQuantity(Number(line.quantity), Number(item.lossPercent)) * ingredientUnitCost(item)
      : sum;
  }, 0);
  const directCost = ingredientCost + Number(recipe.laborCost) + Number(recipe.packagingCost) + Number(recipe.otherCost);
  const batchCost = directCost / Math.max(0.01, 1 - Number(recipe.batchLossPercent || 0) / 100);
  const unitCost = batchCost / Math.max(1, Number(recipe.yieldCount));
  return { ingredientCost, batchCost, unitCost, grossProfitPerUnit: Number(recipe.salePrice) - unitCost };
}

export async function loadMvieData(userId: string) {
  const db = getDb();
  const [ingredientRows, recipeRows, lineRows, orderRows, receiptRows, productionRows, transactionRows] = await Promise.all([
    db.select().from(ingredients).where(eq(ingredients.userId, userId)).orderBy(asc(ingredients.name)),
    db.select().from(recipes).where(eq(recipes.userId, userId)).orderBy(asc(recipes.name)),
    db.select().from(recipeIngredients).where(eq(recipeIngredients.userId, userId)),
    db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.orderedAt)),
    db.select().from(stockReceipts).where(eq(stockReceipts.userId, userId)).orderBy(desc(stockReceipts.receivedAt)),
    db.select().from(productions).where(eq(productions.userId, userId)).orderBy(desc(productions.producedAt)),
    db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.occurredAt)),
  ]);

  const recipeCosts = recipeRows.map((recipe) => ({
    ...recipe,
    lines: lineRows.filter((line) => line.recipeId === recipe.id),
    cost: calculateRecipeCost(recipe, lineRows.filter((line) => line.recipeId === recipe.id), ingredientRows),
  }));

  return {
    ingredients: ingredientRows,
    recipes: recipeCosts,
    orders: orderRows.map((order) => ({ ...order, items: JSON.parse(order.itemsJson) as Array<{ recipeId: string; name: string; qty: number; unitPrice: number; unitCost: number }> })),
    receipts: receiptRows,
    productions: productionRows,
    transactions: transactionRows,
  };
}

export async function ownedRecipe(userId: string, recipeId: string) {
  const db = getDb();
  return db.select().from(recipes).where(and(eq(recipes.userId, userId), eq(recipes.id, recipeId))).get();
}
