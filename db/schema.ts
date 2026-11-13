import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  shopName: text("shop_name").notNull().default("M’Vie Cake"),
  seededAt: text("seeded_at"),
  ...timestamps,
});

export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), name: text("name").notNull(), unit: text("unit").notNull(),
  quantity: real("quantity").notNull().default(0), packSize: real("pack_size").notNull(), purchasePrice: real("purchase_price").notNull(),
  lossPercent: real("loss_percent").notNull().default(0), alertAt: real("alert_at").notNull().default(0), supplier: text("supplier").notNull().default(""),
  expiryDate: text("expiry_date"), ...timestamps,
}, (table) => [index("ingredients_user_idx").on(table.userId)]);

export const stockReceipts = sqliteTable("stock_receipts", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), ingredientId: text("ingredient_id").notNull(), ingredientName: text("ingredient_name").notNull(),
  quantity: real("quantity").notNull(), unit: text("unit").notNull(), purchaseTotal: real("purchase_total").notNull(), supplier: text("supplier").notNull().default(""),
  receivedAt: text("received_at").notNull(), ...timestamps,
}, (table) => [index("stock_receipts_user_idx").on(table.userId, table.receivedAt)]);

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), name: text("name").notNull(), yieldCount: integer("yield_count").notNull(), salePrice: real("sale_price").notNull(),
  laborCost: real("labor_cost").notNull().default(0), packagingCost: real("packaging_cost").notNull().default(0), otherCost: real("other_cost").notNull().default(0),
  batchLossPercent: real("batch_loss_percent").notNull().default(0), finishedStock: integer("finished_stock").notNull().default(0), ...timestamps,
}, (table) => [index("recipes_user_idx").on(table.userId)]);

export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), recipeId: text("recipe_id").notNull(), ingredientId: text("ingredient_id").notNull(), quantity: real("quantity").notNull(),
}, (table) => [index("recipe_ingredients_recipe_idx").on(table.userId, table.recipeId)]);

export const productions = sqliteTable("productions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), recipeId: text("recipe_id").notNull(), recipeName: text("recipe_name").notNull(),
  batches: integer("batches").notNull(), quantityMade: integer("quantity_made").notNull(), materialCostSnapshot: real("material_cost_snapshot").notNull(),
  totalCostSnapshot: real("total_cost_snapshot").notNull(), unitCostSnapshot: real("unit_cost_snapshot").notNull(), producedAt: text("produced_at").notNull(), ...timestamps,
}, (table) => [index("productions_user_idx").on(table.userId, table.producedAt)]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), code: text("code").notNull(), customerName: text("customer_name").notNull(),
  phone: text("phone").notNull().default(""), address: text("address").notNull().default(""), status: text("status").notNull().default("new"),
  paymentStatus: text("payment_status").notNull().default("unpaid"), itemsJson: text("items_json").notNull(), subtotal: real("subtotal").notNull(),
  shippingFee: real("shipping_fee").notNull().default(0), discount: real("discount").notNull().default(0), total: real("total").notNull(),
  costOfGoods: real("cost_of_goods").notNull(), note: text("note").notNull().default(""), orderedAt: text("ordered_at").notNull(), deliveredAt: text("delivered_at"), ...timestamps,
}, (table) => [index("orders_user_idx").on(table.userId, table.orderedAt)]);

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), direction: text("direction").notNull(), accountingType: text("accounting_type").notNull(),
  category: text("category").notNull(), amount: real("amount").notNull(), note: text("note").notNull().default(""), occurredAt: text("occurred_at").notNull(), ...timestamps,
}, (table) => [index("transactions_user_idx").on(table.userId, table.occurredAt)]);
