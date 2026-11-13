# M’Vie Cake — Bakery Tycoon

Website quản lý tiệm bánh thật, trình bày theo phong cách pixel-art kawaii với mô hình tiệm bánh cắt lớp ba tầng.

## Bản triển khai này có gì

- Đăng nhập bằng tài khoản ChatGPT trên bản Sites riêng tư.
- Dữ liệu bền vững trên Cloudflare D1, tách riêng theo `userId`.
- Tầng 1: nhập nguyên liệu, tồn kho, nhà cung cấp, hạn dùng, cảnh báo sắp hết.
- Tầng 2: công thức theo gram/ml/cái, hao hụt nguyên liệu, hao hụt cả mẻ, sản xuất và tự trừ kho.
- Order online: đơn mới, đang làm, chờ giao, đã giao, đã hủy; theo dõi chưa thanh toán/đã cọc/đã thanh toán.
- Tầng 3: cost nguyên liệu + bao bì + nhân công + chi phí khác, thu chi và báo cáo lợi nhuận theo tháng.
- Xuất `.xlsx` gồm 6 sheet: Tổng quan, Thu chi, Cost, Đơn hàng, Nhập hàng, Tồn kho.
- Animation theo thao tác: bưng hàng, trộn/nướng, gõ máy tính/in báo cáo.
- Responsive tại 390 / 768 / 1440 px, có focus bàn phím và hỗ trợ `prefers-reduced-motion`.

## Logic lợi nhuận

- Doanh thu chỉ ghi nhận từ đơn `đã giao`.
- Giá vốn lấy từ cost snapshot của bánh trong đơn đã giao.
- Tiền mua nguyên liệu xuất hiện trong dòng tiền và lịch sử nhập hàng, không bị trừ thêm lần nữa khỏi lợi nhuận.
- Lợi nhuận ròng = doanh thu − giá vốn + thu khác − chi phí vận hành.

## Chạy local

Yêu cầu Node.js 22.13 trở lên.

```bash
npm ci
npm run db:generate
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_orange_king_cobra.sql
npm run dev -- --port 4173
```

Mở `http://127.0.0.1:4173/signin-with-chatgpt?return_to=/`. Bản local dùng tài khoản mô phỏng `seedy@sites.test`; dữ liệu local nằm trong `.wrangler/state` và tách biệt hoàn toàn với database production.

## Kiểm tra

```bash
npm run lint
node /đường/dẫn/tới/sites/scripts/build-site.mjs
```

File cấu hình hosting nằm tại `.openai/hosting.json`; migration D1 nằm trong `drizzle/`.
