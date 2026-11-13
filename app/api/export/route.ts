import { getChatGPTUser } from "@/app/chatgpt-auth";
import { loadMvieData } from "@/lib/mvie";
import { createXlsx } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const data = await loadMvieData(user.userId);
  const inMonth = (value: string) => value.slice(0, 7) === month;
  const delivered = data.orders.filter((item) => item.status === "delivered" && inMonth(item.orderedAt));
  const tx = data.transactions.filter((item) => inMonth(item.occurredAt));
  const revenue = delivered.reduce((sum, item) => sum + Number(item.total), 0);
  const cogs = delivered.reduce((sum, item) => sum + Number(item.costOfGoods), 0);
  const otherIncome = tx.filter((item) => item.accountingType === "other_income").reduce((sum, item) => sum + Number(item.amount), 0);
  const operating = tx.filter((item) => item.accountingType === "operating_expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const workbook = createXlsx([
    { name: "Tổng quan", rows: [["M’VIE CAKE — BÁO CÁO", month], ["Chỉ tiêu", "Số tiền (VND)"], ["Doanh thu", revenue], ["Giá vốn", cogs], ["Lợi nhuận gộp", revenue - cogs], ["Thu khác", otherIncome], ["Chi phí vận hành", operating], ["Lợi nhuận ròng", revenue - cogs + otherIncome - operating], [], ["Ghi chú", "Tiền mua nguyên liệu chỉ nằm trong dòng tiền; giá vốn được ghi khi bánh bán ra để tránh tính trùng."]] },
    { name: "Thu chi", rows: [["Ngày", "Thu/Chi", "Nhóm", "Phân loại kế toán", "Số tiền", "Nội dung"], ...tx.map((item) => [item.occurredAt.slice(0, 10), item.direction === "income" ? "Thu" : "Chi", item.category, item.accountingType, item.amount, item.note])] },
    { name: "Cost", rows: [["Tên bánh", "Số bánh/mẻ", "Nguyên liệu/mẻ", "Nhân công", "Bao bì", "Chi phí khác", "Hao hụt mẻ (%)", "Cost/bánh", "Giá bán", "Lãi gộp/bánh"], ...data.recipes.map((item) => [item.name, item.yieldCount, item.cost.ingredientCost, item.laborCost, item.packagingCost, item.otherCost, item.batchLossPercent, item.cost.unitCost, item.salePrice, item.cost.grossProfitPerUnit])] },
    { name: "Đơn hàng", rows: [["Mã đơn", "Ngày", "Khách hàng", "Trạng thái", "Thanh toán", "Món", "Doanh thu", "Giá vốn", "Lãi gộp"], ...data.orders.filter((item) => inMonth(item.orderedAt)).map((item) => [item.code, item.orderedAt.slice(0, 10), item.customerName, item.status, item.paymentStatus, item.items.map((line) => `${line.qty} ${line.name}`).join(", "), item.total, item.costOfGoods, item.total - item.costOfGoods])] },
    { name: "Nhập hàng", rows: [["Ngày nhập", "Nguyên liệu", "Số lượng", "Đơn vị", "Tổng tiền"], ...data.receipts.filter((item) => inMonth(item.receivedAt)).map((item) => [item.receivedAt.slice(0, 10), item.ingredientName, item.quantity, item.unit, item.purchaseTotal])] },
    { name: "Tồn kho", rows: [["Nguyên liệu", "Tồn kho", "Đơn vị", "Giá gói/chai", "Kích thước gói", "Hao hụt (%)", "Mức cảnh báo", "Nhà cung cấp"], ...data.ingredients.map((item) => [item.name, item.quantity, item.unit, item.purchasePrice, item.packSize, item.lossPercent, item.alertAt, item.supplier])] },
  ]);
  return new Response(workbook, { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="MVie-Cake-${month}.xlsx"`, "cache-control": "no-store" } });
}
