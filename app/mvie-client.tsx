"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BarChart3, Bell, BookOpen, Box, CakeSlice, Calculator, CalendarDays, ChefHat, CircleCheck, ClipboardList, Coins, Home, Package, Plus, ShoppingCart, Truck, Warehouse } from "lucide-react";

type Ingredient = { id: string; name: string; unit: string; quantity: number; packSize: number; purchasePrice: number; lossPercent: number; alertAt: number; supplier: string };
type Recipe = { id: string; name: string; yieldCount: number; salePrice: number; laborCost: number; packagingCost: number; otherCost: number; batchLossPercent: number; finishedStock: number; cost: { ingredientCost: number; batchCost: number; unitCost: number; grossProfitPerUnit: number } };
type Order = { id: string; code: string; customerName: string; phone: string; address: string; status: string; paymentStatus: string; items: Array<{ name: string; qty: number }>; total: number; costOfGoods: number; orderedAt: string };
type Transaction = { id: string; direction: string; accountingType: string; category: string; amount: number; note: string; occurredAt: string };
type Data = { ingredients: Ingredient[]; recipes: Recipe[]; orders: Order[]; receipts: Array<{ id: string; ingredientName: string; quantity: number; unit: string; purchaseTotal: number; receivedAt: string }>; productions: Array<{ id: string; recipeName: string; quantityMade: number; totalCostSnapshot: number; producedAt: string }>; transactions: Transaction[] };
type ModalName = "stock" | "recipe" | "produce" | "order" | "transaction" | null;
type Activity = "idle" | "stock" | "bake" | "office";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const statusLabels: Record<string, string> = { new: "Đơn mới", making: "Đang làm", ready: "Chờ giao", delivered: "Đã giao", cancelled: "Đã hủy" };
const paymentLabels: Record<string, string> = { unpaid: "Chưa thanh toán", partial: "Đã cọc", paid: "Đã thanh toán" };

function isoDate() { return new Date().toISOString().slice(0, 10); }
function monthKey(value: string) { return value.slice(0, 7); }

export function MvieClient({ displayName, signOutPath }: { displayName: string; signOutPath: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [view, setView] = useState("home");
  const [modal, setModal] = useState<ModalName>(null);
  const [activity, setActivity] = useState<Activity>("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [recipeLineCount, setRecipeLineCount] = useState(2);

  useEffect(() => {
    let active = true;
    fetch("/api/data", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không thể tải dữ liệu.");
        return result.data as Data;
      })
      .then((nextData) => { if (active) setData(nextData); })
      .catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (activity === "idle") return;
    const timer = window.setTimeout(() => setActivity("idle"), 2600);
    return () => window.clearTimeout(timer);
  }, [activity]);
  useEffect(() => {
    if (!modal) return;
    window.requestAnimationFrame(() => document.getElementById("inline-form")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [modal]);

  async function action(name: string, payload: Record<string, unknown>, active: Activity) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: name, payload }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể lưu dữ liệu.");
      setData(result.data); setActivity(active); setModal(null); setMessage("Đã lưu dữ liệu thật vào tiệm bánh.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Có lỗi xảy ra."); }
    finally { setBusy(false); }
  }

  function submit(name: string, active: Activity, transform?: (form: FormData) => Record<string, unknown>) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      action(name, transform ? transform(form) : Object.fromEntries(form.entries()), active);
    };
  }

  const finance = useMemo(() => {
    if (!data) return { revenue: 0, cogs: 0, gross: 0, operating: 0, otherIncome: 0, net: 0, cashIn: 0, cashOut: 0 };
    const delivered = data.orders.filter((order) => order.status === "delivered" && monthKey(order.orderedAt) === reportMonth);
    const tx = data.transactions.filter((item) => monthKey(item.occurredAt) === reportMonth);
    const revenue = delivered.reduce((sum, order) => sum + Number(order.total), 0);
    const cogs = delivered.reduce((sum, order) => sum + Number(order.costOfGoods), 0);
    const otherIncome = tx.filter((item) => item.accountingType === "other_income").reduce((sum, item) => sum + Number(item.amount), 0);
    const operating = tx.filter((item) => item.accountingType === "operating_expense").reduce((sum, item) => sum + Number(item.amount), 0);
    const purchase = tx.filter((item) => item.accountingType === "inventory_purchase").reduce((sum, item) => sum + Number(item.amount), 0);
    return { revenue, cogs, gross: revenue - cogs, operating, otherIncome, net: revenue - cogs + otherIncome - operating, cashIn: revenue + otherIncome, cashOut: operating + purchase };
  }, [data, reportMonth]);

  const filteredOrders = data?.orders.filter((order) => orderFilter === "all" || order.status === orderFilter) ?? [];
  function open(name: ModalName) { setError(""); setMessage(""); setModal(name); }
  function nav(next: string) { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); }

  if (!data) return <main className="loading-screen"><Image src="/mvie-logo.png" alt="M’Vie Cake" width={92} height={92} priority /><span className="pixel-loader" /><p>{error || "Đang mở cửa tiệm…"}</p></main>;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Bỏ qua điều hướng</a>
      <aside className="sidebar">
        <div className="brand"><Image src="/mvie-logo.png" alt="" width={52} height={52} priority /><div><strong>M’Vie Cake</strong><span>Bakery Tycoon</span></div></div>
        <nav aria-label="Khu vực quản lý">
          <button className="nav-button" aria-current={view === 'home' ? 'page' : undefined} onClick={() => nav('home')}><span><Home /></span>Trang chủ</button>
          <button className="nav-button" aria-current={view === 'orders' ? 'page' : undefined} onClick={() => nav('orders')}><span><ClipboardList /></span>Đơn hàng <i>{data.orders.filter((item) => item.status === 'new').length || ''}</i></button>
          <button className="nav-button" onClick={() => open('stock')}><span><Package /></span>Nhập hàng</button>
          <button className="nav-button" onClick={() => open('produce')}><span><ChefHat /></span>Bếp bánh</button>
          <button className="nav-button" aria-current={view === 'finance' ? 'page' : undefined} onClick={() => nav('finance')}><span><Calculator /></span>Kế toán</button>
          <button className="nav-button" aria-current={view === 'cost' ? 'page' : undefined} onClick={() => nav('cost')}><span><BookOpen /></span>Công thức</button>
          <button className="nav-button" onClick={() => open('stock')}><span><Warehouse /></span>Kho &amp; Tồn</button>
          <button className="nav-button" onClick={() => nav('finance')}><span><BarChart3 /></span>Thống kê</button>
        </nav>
        <div className="account"><span>{signOutPath ? `Đăng nhập: ${displayName}` : "Chế độ công khai"}</span>{signOutPath && <a href={signOutPath} target="_top">Đăng xuất</a>}</div>
      </aside>

      <main id="main" className="main-content">
        {view === 'home' ? <header className="game-hud"><div className="mobile-game-brand"><Image src="/mvie-logo.png" alt="" width={52} height={52} /><strong>M’Vie Cake</strong></div><div className="hud-date"><span><CalendarDays /></span><b>{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}</b></div><div className="hud-chip"><span><Coins /></span><b>{money.format(finance.revenue)}</b></div><div className="hud-chip"><span><CakeSlice /></span><b>Đơn hôm nay: {data.orders.filter((item) => item.orderedAt.slice(0, 10) === isoDate()).length}</b></div><button className="hud-icon" aria-label="Thông báo"><Bell /></button><button className="hud-avatar" aria-label="Tài khoản"><Image src="/mvie-logo.png" alt="" width={42} height={42} /></button></header> : <header className="topbar"><div><p className="eyebrow">Dữ liệu thật · lưu dùng chung</p><h1>{view === 'orders' ? 'Bảng order online' : view === 'cost' ? 'Cost từng loại bánh' : 'Phòng kế toán tầng 3'}</h1></div><div className="top-actions"><span className="live-dot">Đã lưu</span><button className="primary compact" onClick={() => open(view === 'orders' ? 'order' : view === 'finance' ? 'transaction' : view === 'cost' ? 'recipe' : 'stock')}><Plus /> Thêm nhanh</button></div></header>}
        {(message || error) && <div className={`notice ${error ? 'error' : ''}`} role="status">{error || message}</div>}

        {view === "home" && <section className="game-dashboard" aria-label="Màn hình quản lý tiệm bánh dạng game">
          <div className="game-stage-card"><GameStage activity={activity} onFloor={(floor) => floor === 1 ? open('stock') : floor === 2 ? open('produce') : nav('finance')} /></div>
          <aside className="game-rail">
            <section className="game-summary"><header><span><BarChart3 /></span><h2>Tổng quan hôm nay</h2><i>✦</i></header><div><button onClick={() => nav('orders')}><span><ShoppingCart /></span><small>Đơn mới</small><b>{data.orders.filter((item) => item.status === 'new').length}</b></button><button onClick={() => nav('orders')}><span><CakeSlice /></span><small>Đang làm</small><b>{data.orders.filter((item) => item.status === 'making').length}</b></button><button onClick={() => nav('orders')}><span><Truck /></span><small>Đang giao</small><b>{data.orders.filter((item) => item.status === 'ready').length}</b></button><button onClick={() => nav('orders')}><span><CircleCheck /></span><small>Hoàn thành</small><b>{data.orders.filter((item) => item.status === 'delivered').length}</b></button></div></section>
            <section className="game-orders"><header><h2><ClipboardList /> Đơn hàng mới</h2><button onClick={() => nav('orders')}>Xem tất cả ›</button></header><div>{data.orders.slice(0, 4).map((order) => <button className="game-order" key={order.id} onClick={() => nav('orders')}><span className="order-cake"><CakeSlice /></span><span><b>{order.code}</b><small>{order.items.map((item) => `${item.qty} ${item.name}`).join(', ')}</small></span><i className={order.status}>{statusLabels[order.status]}</i><strong>›</strong></button>)}</div><button className="create-order" onClick={() => open('order')}><Plus /> Tạo đơn hàng</button></section>
          </aside>
          <div className="game-quest-bar"><div className="mascot-tip"><Image src="/mvie-logo.png" alt="Mascot M’Vie Cake" width={58} height={58} /><span>Hôm nay<br />mình làm gì?</span></div><button className="quest stock" onClick={() => open('stock')}><span><Package /></span><b>Nhập hàng</b></button><button className="quest bake" onClick={() => open('produce')}><span><ChefHat /></span><b>Làm bánh</b></button><button className="quest deliver" onClick={() => nav('orders')}><span><Truck /></span><b>Giao đơn</b></button></div>
        </section>}

        {view === "orders" && <section className="section top-section"><div className="status-tabs" role="group" aria-label="Lọc trạng thái">{[['all','Tất cả'],...Object.entries(statusLabels)].map(([id,label]) => <button key={id} aria-pressed={orderFilter === id} onClick={() => setOrderFilter(id)}>{label}<span>{id === 'all' ? data.orders.length : data.orders.filter((o) => o.status === id).length}</span></button>)}</div><div className="panel order-panel"><div className="panel-head"><div><p className="eyebrow">Quest board</p><h2>{filteredOrders.length} đơn hàng</h2></div><button className="primary" onClick={() => open('order')}>＋ Đơn mới</button></div><div className="order-list">{filteredOrders.length ? filteredOrders.map((order) => <article className="order-card" key={order.id}><div className="order-main"><div className="order-code"><b>{order.code}</b><span>{date.format(new Date(order.orderedAt))}</span></div><div><h3>{order.customerName}</h3><p>{order.items.map((x) => `${x.qty} × ${x.name}`).join(', ')}</p><small>{order.phone || 'Chưa có SĐT'} · {order.address || 'Nhận tại tiệm'}</small></div></div><div className="order-controls"><label>Trạng thái<select value={order.status} disabled={order.status === 'cancelled'} onChange={(event) => action('updateOrder', { orderId: order.id, status: event.target.value, paymentStatus: order.paymentStatus }, event.target.value === 'making' ? 'bake' : 'office')}>{Object.entries(statusLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Thanh toán<select value={order.paymentStatus} onChange={(event) => action('updateOrder', { orderId: order.id, status: order.status, paymentStatus: event.target.value }, 'office')}>{Object.entries(paymentLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><strong>{money.format(order.total)}</strong></div></article>) : <Empty text="Chưa có đơn ở trạng thái này." />}</div></div></section>}

        {view === "cost" && <section className="section top-section"><div className="summary-bar"><div><p className="eyebrow">Công thức chuẩn</p><h2>Tính đúng từng gram, ml và hao hụt</h2><p>Cost = nguyên liệu sau hao hụt + bao bì + nhân công + chi phí khác. Mua hàng không bị tính lần nữa trong lợi nhuận.</p></div><button className="primary" onClick={() => open('recipe')}>＋ Công thức</button></div><div className="recipe-grid">{data.recipes.length ? data.recipes.map((recipe) => <article className="recipe-card" key={recipe.id}><div className="cake-icon">🧁</div><div className="recipe-title"><div><h3>{recipe.name}</h3><span>Còn {recipe.finishedStock} bánh</span></div><b>{money.format(recipe.salePrice)}</b></div><dl><div><dt>Nguyên liệu / mẻ</dt><dd>{money.format(recipe.cost.ingredientCost)}</dd></div><div><dt>Bao bì + nhân công + khác</dt><dd>{money.format(recipe.packagingCost + recipe.laborCost + recipe.otherCost)}</dd></div><div className="cost-total"><dt>Cost / bánh</dt><dd>{money.format(recipe.cost.unitCost)}</dd></div><div><dt>Lãi gộp dự kiến</dt><dd className="positive">{money.format(recipe.cost.grossProfitPerUnit)}</dd></div></dl><button className="secondary full" onClick={() => open('produce')}>Sản xuất mẻ mới</button></article>) : <Empty text="Hãy tạo công thức đầu tiên." />}</div></section>}

        {view === "finance" && <section className="section top-section"><div className="finance-toolbar"><label>Tháng báo cáo<input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} /></label><div><button className="secondary" onClick={() => open('transaction')}>＋ Ghi thu / chi</button><a className="primary" href={`/api/export?month=${reportMonth}`} onClick={() => setActivity('office')}>⬇ Xuất Excel</a></div></div><div className="metric-grid"><Metric label="Doanh thu" value={finance.revenue} note="Đơn đã giao" /><Metric label="Giá vốn" value={finance.cogs} note="Cost bánh đã bán" /><Metric label="Lợi nhuận gộp" value={finance.gross} note="Doanh thu − giá vốn" /><Metric label="Lợi nhuận ròng" value={finance.net} note="Không tính trùng tiền nhập" strong /></div><div className="finance-layout"><div className="panel"><div className="panel-head"><div><p className="eyebrow">Báo cáo kết quả</p><h2>Đúng logic kế toán quản trị</h2></div></div><dl className="profit-table"><div><dt>Doanh thu đơn đã giao</dt><dd>{money.format(finance.revenue)}</dd></div><div><dt>− Giá vốn bánh đã bán</dt><dd>{money.format(finance.cogs)}</dd></div><div className="subtotal"><dt>= Lợi nhuận gộp</dt><dd>{money.format(finance.gross)}</dd></div><div><dt>+ Thu khác</dt><dd>{money.format(finance.otherIncome)}</dd></div><div><dt>− Chi phí vận hành</dt><dd>{money.format(finance.operating)}</dd></div><div className="grand"><dt>= Lợi nhuận ròng</dt><dd>{money.format(finance.net)}</dd></div></dl><p className="accounting-note">Tiền mua nguyên liệu ({money.format(finance.cashOut - finance.operating)}) chỉ hiện trong dòng tiền. Khi bánh bán ra, cost nguyên liệu mới đi vào giá vốn nên không bị trừ hai lần.</p></div><div className="panel"><div className="panel-head"><div><p className="eyebrow">Sổ thu chi</p><h2>Giao dịch gần đây</h2></div></div><div className="transaction-list">{data.transactions.filter((item) => monthKey(item.occurredAt) === reportMonth).slice(0, 8).map((item) => <div key={item.id}><span className={item.direction}><i>{item.direction === 'income' ? '↗' : '↘'}</i></span><div><b>{item.category}</b><small>{item.note || date.format(new Date(item.occurredAt))}</small></div><strong className={item.direction}>{item.direction === 'income' ? '+' : '−'}{money.format(item.amount)}</strong></div>)}</div></div></div></section>}
      </main>

      <nav className="mobile-nav" aria-label="Điều hướng điện thoại"><button aria-current={view === 'home' ? 'page' : undefined} onClick={() => nav('home')}><span><Home /></span>Trang chủ</button><button onClick={() => open('stock')}><span><Package /></span>Nhập hàng</button><button onClick={() => open('produce')}><span><ChefHat /></span>Làm bánh</button><button aria-current={view === 'cost' ? 'page' : undefined} onClick={() => nav('cost')}><span><BookOpen /></span>Công thức</button><button aria-current={view === 'orders' ? 'page' : undefined} onClick={() => nav('orders')}><span><Truck /></span>Đơn hàng</button><button aria-current={view === 'finance' ? 'page' : undefined} onClick={() => nav('finance')}><span><Calculator /></span>Kế toán</button></nav>

      {modal && <Modal title={modal === 'stock' ? 'Nhập nguyên liệu' : modal === 'recipe' ? 'Tạo công thức' : modal === 'produce' ? 'Sản xuất bánh' : modal === 'order' ? 'Tạo đơn online' : 'Ghi sổ thu – chi'} onClose={() => !busy && setModal(null)}>
        {modal === 'stock' && <form className="form" onSubmit={submit('receiveStock','stock')}><Field label="Tên nguyên liệu"><input name="name" required placeholder="Bột mì số 8" /></Field><div className="form-grid"><Field label="Đơn vị"><select name="unit"><option value="g">gram (g)</option><option value="ml">mililít (ml)</option><option value="cái">cái</option></select></Field><Field label="Lượng nhập"><input name="quantity" type="number" min="0.01" step="0.01" required /></Field><Field label="Khối lượng gói/chai"><input name="packSize" type="number" min="0.01" step="0.01" required /></Field><Field label="Tổng tiền mua"><input name="purchaseTotal" type="number" min="0" step="1000" required /></Field><Field label="Hao hụt nguyên liệu (%)"><input name="lossPercent" type="number" min="0" max="99" step="0.1" defaultValue="0" /></Field><Field label="Cảnh báo khi còn"><input name="alertAt" type="number" min="0" step="0.01" defaultValue="100" /></Field></div><Field label="Nhà cung cấp"><input name="supplier" /></Field><div className="form-grid"><Field label="Ngày nhập"><input name="receivedAt" type="date" defaultValue={isoDate()} /></Field><Field label="Hạn sử dụng"><input name="expiryDate" type="date" /></Field></div><Submit busy={busy} text="Xác nhận nhập kho" /></form>}
        {modal === 'recipe' && <form className="form" onSubmit={submit('createRecipe','office',(form) => ({ name: form.get('name'), yieldCount: form.get('yieldCount'), salePrice: form.get('salePrice'), laborCost: form.get('laborCost'), packagingCost: form.get('packagingCost'), otherCost: form.get('otherCost'), batchLossPercent: form.get('batchLossPercent'), lines: Array.from({ length: recipeLineCount }, (_, index) => ({ ingredientId: form.get(`ingredient-${index}`), quantity: form.get(`quantity-${index}`) })).filter((line) => line.ingredientId && line.quantity) }))}><Field label="Tên bánh"><input name="name" required placeholder="Bento kem dâu" /></Field><div className="form-grid"><Field label="Số bánh / mẻ"><input name="yieldCount" type="number" min="1" required /></Field><Field label="Giá bán / bánh"><input name="salePrice" type="number" min="0" step="1000" required /></Field><Field label="Nhân công / mẻ"><input name="laborCost" type="number" min="0" step="1000" defaultValue="0" /></Field><Field label="Bao bì / mẻ"><input name="packagingCost" type="number" min="0" step="1000" defaultValue="0" /></Field><Field label="Chi phí khác / mẻ"><input name="otherCost" type="number" min="0" step="1000" defaultValue="0" /></Field><Field label="Hao hụt cả mẻ (%)"><input name="batchLossPercent" type="number" min="0" max="99" step="0.1" defaultValue="0" /></Field></div><fieldset><legend>Nguyên liệu cho một mẻ</legend>{Array.from({ length: recipeLineCount }, (_, index) => <div className="ingredient-line" key={index}><select name={`ingredient-${index}`} required={index === 0}><option value="">Chọn nguyên liệu</option>{data.ingredients.map((item) => <option value={item.id} key={item.id}>{item.name} ({item.unit})</option>)}</select><input name={`quantity-${index}`} type="number" min="0.01" step="0.01" placeholder="Lượng dùng" required={index === 0} /></div>)}<button className="text-button" type="button" onClick={() => setRecipeLineCount((count) => count + 1)}>＋ Thêm dòng</button></fieldset><Submit busy={busy} text="Lưu và tính cost" /></form>}
        {modal === 'produce' && <form className="form" onSubmit={submit('produce','bake')}><Field label="Chọn công thức"><select name="recipeId" required><option value="">Chọn loại bánh</option>{data.recipes.map((recipe) => <option value={recipe.id} key={recipe.id}>{recipe.name} · còn {recipe.finishedStock}</option>)}</select></Field><Field label="Số mẻ"><input name="batches" type="number" min="1" step="1" defaultValue="1" required /></Field><Field label="Ngày sản xuất"><input name="producedAt" type="date" defaultValue={isoDate()} /></Field><p className="form-hint">Kho sẽ tự trừ đúng lượng dùng và hao hụt của từng nguyên liệu.</p><Submit busy={busy} text="Bắt đầu làm bánh" /></form>}
        {modal === 'order' && <form className="form" onSubmit={submit('createOrder','office')}><div className="form-grid"><Field label="Tên khách"><input name="customerName" required /></Field><Field label="Số điện thoại"><input name="phone" inputMode="tel" /></Field></div><Field label="Địa chỉ giao"><input name="address" /></Field><div className="form-grid"><Field label="Loại bánh"><select name="recipeId" required><option value="">Chọn bánh</option>{data.recipes.map((recipe) => <option value={recipe.id} key={recipe.id}>{recipe.name} · còn {recipe.finishedStock}</option>)}</select></Field><Field label="Số lượng"><input name="qty" type="number" min="1" defaultValue="1" required /></Field><Field label="Phí giao hàng"><input name="shippingFee" type="number" min="0" step="1000" defaultValue="0" /></Field><Field label="Giảm giá"><input name="discount" type="number" min="0" step="1000" defaultValue="0" /></Field><Field label="Thanh toán"><select name="paymentStatus"><option value="unpaid">Chưa thanh toán</option><option value="partial">Đã cọc</option><option value="paid">Đã thanh toán</option></select></Field><Field label="Ngày đặt"><input name="orderedAt" type="date" defaultValue={isoDate()} /></Field></div><Field label="Ghi chú"><textarea name="note" rows={3} /></Field><Submit busy={busy} text="Tạo đơn hàng" /></form>}
        {modal === 'transaction' && <form className="form" onSubmit={submit('createTransaction','office')}><div className="form-grid"><Field label="Loại"><select name="direction"><option value="expense">Khoản chi</option><option value="income">Khoản thu khác</option></select></Field><Field label="Số tiền"><input name="amount" type="number" min="1000" step="1000" required /></Field></div><Field label="Nhóm thu / chi"><select name="category"><option>Chi phí vận hành</option><option>Điện nước</option><option>Lương nhân viên</option><option>Vận chuyển</option><option>Marketing</option><option>Thu khác</option><option>Nhập nguyên liệu</option></select></Field><Field label="Ngày ghi sổ"><input name="occurredAt" type="date" defaultValue={isoDate()} /></Field><Field label="Nội dung"><textarea name="note" rows={3} placeholder="Ghi chú để sau này dễ đối chiếu" /></Field><p className="form-hint">“Nhập nguyên liệu” chỉ vào dòng tiền, không trừ lại trong lợi nhuận ròng.</p><Submit busy={busy} text="Lưu vào sổ" /></form>}
      </Modal>}
    </div>
  );
}

function GameStage({ activity, onFloor }: { activity: Activity; onFloor: (floor: number) => void }) { return <div className={`game-stage activity-${activity}`}><Image className="stage-art" src="/game-bakery-stage-v2.png" alt="Tiệm bánh M’Vie Cake ba tầng" fill priority sizes="(max-width: 767px) 100vw, 70vw" /><button className="floor-hotspot top" onClick={() => onFloor(3)}><span><Calculator /></span><b>Tầng 3<br />Kế Toán</b></button><button className="floor-hotspot middle" onClick={() => onFloor(2)}><span><ChefHat /></span><b>Tầng 2<br />Bếp Bánh</b></button><button className="floor-hotspot ground" onClick={() => onFloor(1)}><span><Box /></span><b>Tầng 1<br />Nhập Hàng</b></button><Image className="game-actor accountant" src="/game-accountant-v2.png" alt="Nhân viên kế toán đang làm việc" width={420} height={280} /><Image className="game-actor baker" src="/game-baker-v2.png" alt="Thợ bánh đang trộn bột" width={220} height={250} /><Image className="game-actor stock-clerk" src="/game-stock-clerk-v2.png" alt="Nhân viên kho đang bê hàng" width={240} height={220} /><Image className="stage-art foreground-mask desk-mask" src="/game-bakery-stage-v2.png" alt="" fill sizes="(max-width: 767px) 100vw, 70vw" /><Image className="stage-art foreground-mask counter-mask" src="/game-bakery-stage-v2.png" alt="" fill sizes="(max-width: 767px) 100vw, 70vw" /><Image className="stage-art foreground-mask stock-mask" src="/game-bakery-stage-v2.png" alt="" fill sizes="(max-width: 767px) 100vw, 70vw" /><span className="oven-glow" aria-hidden="true" /><span className="work-effect stock-effect">Đã xếp kho!</span><span className="work-effect bake-effect">Bánh đang nướng</span><span className="work-effect office-effect">Đã ghi sổ</span><span className="ambient-sparkle one">✦</span><span className="ambient-sparkle two">✧</span></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop"><section id="inline-form" className="modal" role="region" aria-labelledby="modal-title"><header><div><p className="eyebrow">Điền thông tin bên dưới</p><h2 id="modal-title">{title}</h2></div><button onClick={onClose} aria-label="Đóng biểu mẫu">×</button></header><div className="modal-body">{children}</div></section></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Submit({ busy, text }: { busy: boolean; text: string }) { return <button className="primary submit" type="submit" disabled={busy}>{busy ? "Đang lưu…" : text}</button>; }
function Empty({ text }: { text: string }) { return <div className="empty"><span>🍰</span><p>{text}</p></div>; }
function Metric({ label, value, note, strong }: { label: string; value: number; note: string; strong?: boolean }) { return <article className={`metric ${strong ? 'strong' : ''}`}><span>{label}</span><b>{money.format(value)}</b><small>{note}</small></article>; }
