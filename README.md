# ABSTRICT — Frontend

Ứng dụng web cho nền tảng tìm kiếm và đặt lịch giúp việc theo giờ tại TP.HCM, dành cho khách hàng, freelancer/công ty đối tác và admin.

- **Bản chạy thử:** https://abstrict.vientruong.site
- **API:** https://abstrict.api.vientruong.site (repo: https://github.com/TDVien05/abstrict-back-end)

## Công nghệ

| Hạng mục | Công nghệ |
| --- | --- |
| Framework | React 19, TypeScript 5.9, Vite 7 |
| Giao diện | Tailwind CSS 4, lucide-react, font Nunito Sans |
| Routing / dữ liệu | React Router 7, TanStack Query 5 |
| Form / validate | React Hook Form + Zod 4 |
| QR | `qrcode.react` (hiển thị), `jsqr` (quét check-in) |
| Kiểm thử | Vitest + Testing Library (unit), Playwright (e2e) |
| Chất lượng | ESLint 9, `tsc -b` |
| Triển khai | Vercel qua GitHub Actions |

## Hướng dẫn test trên bản chạy thử

1. Mở https://abstrict.vientruong.site.
2. Đăng nhập bằng số điện thoại + mật khẩu, hoặc đăng ký mới (OTP).
3. Thử luồng theo vai trò: khách đặt lịch và thanh toán cọc (sandbox) → freelancer xác nhận, quét QR, tải ảnh → khách nghiệm thu, đánh giá hoặc khiếu nại → admin xử lý.

### Tài khoản test

| Vai trò | Số điện thoại | Mô tả |
| --- | --- | --- |
| Admin | `0900000001` | Duyệt KYC/công ty, gói, khiếu nại |
| Khách hàng | `0920000001` | Khách thử (Quận 1) |
| Khách hàng | `0920000002` | Khách thử thứ hai (người ngoài đơn, test phân quyền) |
| Freelancer đã duyệt | `0910000001` – `0910000005` | Có lịch rảnh để đặt; `0910000001` = Nguyễn Thị Lan |
| Freelancer chờ duyệt | `0910000006`, `0910000007` | Để admin thử duyệt KYC |
| Freelancer nháp | `0910000008` | Hồ sơ chưa hoàn tất |

> **Mật khẩu:** `<điền mật khẩu demo hiện tại>` — liên hệ chủ repo. Không commit mật khẩu thật.

## Cấu trúc thư mục

```text
src/
  app/        # router, layouts, guards (RequireActor), providers, error boundary
  entities/   # kiểu domain dùng chung (auth, booking, company, kyc)
  features/   # logic theo nghiệp vụ: auth, discovery, booking, availability, customer,
              # partner, promotions, payments, ratings, disputes, profiles, catalog, admin, landing
  pages/      # màn hình: public, customer, partner, admin, payments
  shared/     # api client, ui, lib, styles, assets
e2e/          # Playwright: *.spec.ts (mock) và *.real.spec.ts (chạy với backend thật)
docs/         # ghi chú thiết kế/API
```

Tài liệu thêm: `FRONTEND_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `PROJECT_IDEA.md`.

## Local development

Yêu cầu: Node.js 20+, npm, và backend đang chạy (xem README repo backend).

```sh
npm ci
cp .env.example .env.local     # PowerShell: Copy-Item .env.example .env.local
npm run dev                    # http://localhost:5173
```

Biến môi trường (`.env.example`):

| Biến | Ý nghĩa |
| --- | --- |
| `VITE_API_BASE_URL` | Đường dẫn API phía trình duyệt, giữ `/api/v1` |
| `VITE_API_PROXY_TARGET` | Backend mà Vite dev proxy trỏ tới: `http://localhost:8080` (Docker Compose) hoặc `http://localhost:5191` (`dotnet run`); đổi thành `https://abstrict.api.vientruong.site` nếu muốn dùng API thật |
| `VITE_DEMO_CUSTOMER` / `VITE_DEMO_PARTNER` | Chỉ cho dev: xem trước route được bảo vệ mà không đăng nhập |

### Lệnh thường dùng

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy dev server |
| `npm run build` | Typecheck + build ra `dist/` |
| `npm run preview` | Xem bản build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Kiểm tra kiểu |
| `npm test` | Unit test (Vitest) |
| `npx playwright test` | e2e với dữ liệu mock |
| `npx playwright test -c playwright.real.config.ts` | e2e với backend thật; tài khoản qua biến `E2E_*` (ví dụ `E2E_CUSTOMER_PHONE`, `E2E_CUSTOMER_PASSWORD`, `E2E_FREELANCER_PHONE`, `E2E_ADMIN_PASSWORD`) |

## CI/CD

GitHub Actions runs `lint`, `typecheck`, `test`, and `build` for every pull request and push to `main`. After those checks pass, a pull request from a branch in this repository gets a Vercel Preview deployment; a push to `main` gets a Production deployment. Pull requests from forks run CI only because GitHub does not provide repository secrets to fork workflows. The deploy jobs use `vercel pull`, `vercel build`, and `vercel deploy --prebuilt`. The `vercel.json` setting disables Vercel's automatic Git deployments so each commit is deployed once, after CI.

To connect the workflow to the **existing** Vercel project:

1. Create a [Vercel access token](https://vercel.com/account/tokens) for the account or team that owns the project.
2. Run `vercel link` locally and select the existing project. Read `orgId` and `projectId` from the generated `.vercel/project.json`. Do not commit `.vercel`; it is ignored by Git.
3. Add GitHub repository Actions secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` with the values from the previous steps. The `production` GitHub environment may be configured with reviewers if approval before production is desired.
4. In Vercel, verify that the project's Root Directory is the repository root, Framework Preset is Vite, Build Command is `npm run build`, and Output Directory is `dist`.
5. Keep `VITE_API_BASE_URL` unset or set it to `/api/v1` in Vercel Preview and Production. The `/api/*` rewrite in `vercel.json` forwards these requests to `https://abstrict.api.vientruong.site/api/*`; Vite's `server.proxy` handles the same path only during local development. If Vercel currently has an absolute `VITE_API_BASE_URL`, change it to `/api/v1` and redeploy so browser requests use the rewrite.
6. Open an internal pull request to verify the Preview job, then merge it to verify Production. If branch protection is enabled, require the `Lint, typecheck, test and build` check before merging.

Deployment requires the three GitHub secrets. Until they are configured, CI can run, but the deploy jobs cannot publish to Vercel.
