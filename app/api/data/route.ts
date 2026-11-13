import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  ingredients,
  orders,
  productions,
  profiles,
  recipeIngredients,
  recipes,
  stockReceipts,
  transactions,
} from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { calculateRecipeCost, effectiveQuantity, loadMvieData, ownedRecipe } from "@/lib/mvie";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function numberValue(value: unknown, name: string, minimum = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum) throw new Error(`${name} không hợp lệ.`);
  return parsed;
}

async function ensureProfile(user: NonNullable<Awaited<ReturnType<typeof getChatGPTUser>>>) {
  const db = getDb();
  await db.insert(profiles).values({ userId: user.userId, email: user.email, displayName: user.displayName }).onConflictDoUpdate({
    target: profiles.userId,
    set: { email: user.email, displayName: user.displayName, updatedAt: new Date().toISOString() },
  });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Bạn cần đăng nhập để xem dữ liệu.", 401);
  await ensureProfile(user);
  return Response.json({ data: await loadMvieData(user.userId), user: { displayName: user.displayName, email: user.email } });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Bạn cần đăng nhập để lưu dữ liệu.", 401);
  await ensureProfile(user);
  const db = getDb();

  try {
    const body = (await request.json()) as { action?: string; payload?: Record<string, unknown> };
    const payload = body.payload ?? {};
    const now = new Date().toISOString();

    if (body.action === "receiveStock") {
      const quantity = numberValue(payload.quantity, "Số lượng", 0.01);
      const packSize = numberValue(payload.packSize, "Khối lượng gói", 0.01);
      const purchaseTotal = numberValue(payload.purchaseTotal, "Tổng tiền mua");
      const name = String(payload.name ?? "").trim();
      const unit = String(payload.unit ?? "g");
      if (!name) throw new Error("Hãy nhập tên nguyên liệu.");
      let ingredientId = String(payload.ingredientId ?? "");
      let ingredient = ingredientId
        ? await db.select().from(ingredients).where(and(eq(ingredients.userId, user.userId), eq(ingredients.id, ingredientId))).get()
        : null;
      if (!ingredient) {
        ingredientId = crypto.randomUUID();
        ingredient = {
          id: ingredientId, userId: user.userId, name, unit, quantity: 0, packSize, purchasePrice: purchaseTotal,
          lossPercent: numberValue(payload.lossPercent, "Hao hụt"), alertAt: numberValue(payload.alertAt, "Mức cảnh báo"),
          supplier: String(payload.supplier ?? "").trim(), expiryDate: String(payload.expiryDate ?? "") || null, createdAt: now, updatedAt: now,
        };
        await db.insert(ingredients).values(ingredient);
      } else {
        await db.update(ingredients).set({
          name, unit, quantity: sql`${ingredients.quantity} + ${quantity}`, packSize, purchasePrice: purchaseTotal,
          lossPercent: numberValue(payload.lossPercent, "Hao hụt"), alertAt: numberValue(payload.alertAt, "Mức cảnh báo"),
          supplier: String(payload.supplier ?? "").trim(), expiryDate: String(payload.expiryDate ?? "") || null, updatedAt: now,
        }).where(and(eq(ingredients.userId, user.userId), eq(ingredients.id, ingredientId)));
      }
      if (!ingredient.quantity) {
        await db.update(ingredients).set({ quantity }).where(eq(ingredients.id, ingredientId));
      }
      await db.insert(stockReceipts).values({
        id: crypto.randomUUID(), userId: user.userId, ingredientId, ingredientName: name, quantity, unit,
        purchaseTotal, supplier: String(payload.supplier ?? "").trim(), receivedAt: String(payload.receivedAt ?? now),
      });
      await db.insert(transactions).values({
        id: crypto.randomUUID(), userId: user.userId, direction: "expense", accountingType: "inventory_purchase",
        category: "Nhập nguyên liệu", amount: purchaseTotal, note: `Nhập ${name}`, occurredAt: String(payload.receivedAt ?? now),
      });
    } else if (body.action === "createRecipe") {
      const name = String(payload.name ?? "").trim();
      const lines = Array.isArray(payload.lines) ? payload.lines as Array<{ ingredientId?: string; quantity?: number }> : [];
      if (!name || !lines.length) throw new Error("Công thức cần tên và ít nhất một nguyên liệu.");
      const recipeId = crypto.randomUUID();
      await db.insert(recipes).values({
        id: recipeId, userId: user.userId, name, yieldCount: numberValue(payload.yieldCount, "Số bánh", 1),
        salePrice: numberValue(payload.salePrice, "Giá bán"), laborCost: numberValue(payload.laborCost, "Nhân công"),
        packagingCost: numberValue(payload.packagingCost, "Bao bì"), otherCost: numberValue(payload.otherCost, "Chi phí khác"),
        batchLossPercent: numberValue(payload.batchLossPercent, "Hao hụt mẻ"),
      });
      for (const line of lines) {
        const ingredientId = String(line.ingredientId ?? "");
        const owned = await db.select({ id: ingredients.id }).from(ingredients).where(and(eq(ingredients.userId, user.userId), eq(ingredients.id, ingredientId))).get();
        if (!owned) throw new Error("Có nguyên liệu không còn tồn tại.");
        await db.insert(recipeIngredients).values({ id: crypto.randomUUID(), userId: user.userId, recipeId, ingredientId, quantity: numberValue(line.quantity, "Lượng dùng", 0.01) });
      }
    } else if (body.action === "produce") {
      const recipeId = String(payload.recipeId ?? "");
      const batches = numberValue(payload.batches, "Số mẻ", 1);
      const recipe = await ownedRecipe(user.userId, recipeId);
      if (!recipe) throw new Error("Không tìm thấy công thức.");
      const lineRows = await db.select().from(recipeIngredients).where(and(eq(recipeIngredients.userId, user.userId), eq(recipeIngredients.recipeId, recipeId)));
      const ingredientRows = await db.select().from(ingredients).where(eq(ingredients.userId, user.userId));
      for (const line of lineRows) {
        const item = ingredientRows.find((row) => row.id === line.ingredientId);
        const needed = item ? effectiveQuantity(Number(line.quantity), Number(item.lossPercent)) * batches : Infinity;
        if (!item || Number(item.quantity) < needed) throw new Error(`${item?.name ?? "Nguyên liệu"} không đủ cho ${batches} mẻ.`);
      }
      for (const line of lineRows) {
        const item = ingredientRows.find((row) => row.id === line.ingredientId)!;
        const needed = effectiveQuantity(Number(line.quantity), Number(item.lossPercent)) * batches;
        await db.update(ingredients).set({ quantity: sql`${ingredients.quantity} - ${needed}`, updatedAt: now }).where(eq(ingredients.id, item.id));
      }
      const cost = calculateRecipeCost(recipe, lineRows, ingredientRows);
      const made = Number(recipe.yieldCount) * batches;
      await db.update(recipes).set({ finishedStock: sql`${recipes.finishedStock} + ${made}`, updatedAt: now }).where(eq(recipes.id, recipe.id));
      await db.insert(productions).values({
        id: crypto.randomUUID(), userId: user.userId, recipeId, recipeName: recipe.name, batches, quantityMade: made,
        materialCostSnapshot: cost.ingredientCost * batches, totalCostSnapshot: cost.batchCost * batches,
        unitCostSnapshot: cost.unitCost, producedAt: String(payload.producedAt ?? now),
      });
    } else if (body.action === "createOrder") {
      const recipeId = String(payload.recipeId ?? "");
      const qty = numberValue(payload.qty, "Số lượng", 1);
      const recipe = await ownedRecipe(user.userId, recipeId);
      if (!recipe) throw new Error("Không tìm thấy loại bánh.");
      if (Number(recipe.finishedStock) < qty) throw new Error(`Kho thành phẩm chỉ còn ${recipe.finishedStock} bánh.`);
      const lineRows = await db.select().from(recipeIngredients).where(and(eq(recipeIngredients.userId, user.userId), eq(recipeIngredients.recipeId, recipeId)));
      const ingredientRows = await db.select().from(ingredients).where(eq(ingredients.userId, user.userId));
      const cost = calculateRecipeCost(recipe, lineRows, ingredientRows);
      const shippingFee = numberValue(payload.shippingFee, "Phí giao hàng");
      const discount = numberValue(payload.discount, "Giảm giá");
      const subtotal = Number(recipe.salePrice) * qty;
      const total = Math.max(0, subtotal + shippingFee - discount);
      const orderId = crypto.randomUUID();
      await db.update(recipes).set({ finishedStock: sql`${recipes.finishedStock} - ${qty}`, updatedAt: now }).where(eq(recipes.id, recipeId));
      await db.insert(orders).values({
        id: orderId, userId: user.userId, code: `MV-${Date.now().toString().slice(-6)}`, customerName: String(payload.customerName ?? "").trim() || "Khách lẻ",
        phone: String(payload.phone ?? "").trim(), address: String(payload.address ?? "").trim(), status: "new", paymentStatus: String(payload.paymentStatus ?? "unpaid"),
        itemsJson: JSON.stringify([{ recipeId, name: recipe.name, qty, unitPrice: recipe.salePrice, unitCost: cost.unitCost }]), subtotal, shippingFee, discount, total,
        costOfGoods: cost.unitCost * qty, note: String(payload.note ?? "").trim(), orderedAt: String(payload.orderedAt ?? now),
      });
    } else if (body.action === "updateOrder") {
      const orderId = String(payload.orderId ?? "");
      const order = await db.select().from(orders).where(and(eq(orders.userId, user.userId), eq(orders.id, orderId))).get();
      if (!order) throw new Error("Không tìm thấy đơn hàng.");
      const nextStatus = String(payload.status ?? order.status);
      if (nextStatus === "cancelled" && order.status !== "cancelled") {
        const items = JSON.parse(order.itemsJson) as Array<{ recipeId: string; qty: number }>;
        for (const item of items) await db.update(recipes).set({ finishedStock: sql`${recipes.finishedStock} + ${item.qty}` }).where(and(eq(recipes.userId, user.userId), eq(recipes.id, item.recipeId)));
      }
      await db.update(orders).set({ status: nextStatus, paymentStatus: String(payload.paymentStatus ?? order.paymentStatus), deliveredAt: nextStatus === "delivered" ? now : order.deliveredAt, updatedAt: now }).where(eq(orders.id, orderId));
    } else if (body.action === "createTransaction") {
      const direction = String(payload.direction ?? "expense");
      const category = String(payload.category ?? "").trim() || (direction === "income" ? "Thu khác" : "Chi vận hành");
      await db.insert(transactions).values({
        id: crypto.randomUUID(), userId: user.userId, direction,
        accountingType: direction === "income" ? "other_income" : category === "Nhập nguyên liệu" ? "inventory_purchase" : "operating_expense",
        category, amount: numberValue(payload.amount, "Số tiền", 0.01), note: String(payload.note ?? "").trim(), occurredAt: String(payload.occurredAt ?? now),
      });
    } else {
      return jsonError("Thao tác không được hỗ trợ.");
    }

    return Response.json({ ok: true, data: await loadMvieData(user.userId) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Không thể lưu dữ liệu.");
  }
}
