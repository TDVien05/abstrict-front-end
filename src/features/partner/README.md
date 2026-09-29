# Partner screens from Stitch

Source: UI Screen Generator, project `8209048964041012099`.

| Canvas label | Screen ID | Route |
| --- | --- | --- |
| F1 – Đăng ký & Định danh KYC | `b8ab0645fd034de9a829b483893b3c43` | `/partners/register/kyc` |
| F2-F3 – Dashboard đối tác & Mua gói | `f87fbca2dd96468f941f0ebbb477ff55` | `/partner/dashboard`, `/partner/plans` |
| F4 – Quản lý đơn đặt lịch & Xác nhận ca | `c3fad7fd37fd4cd48f2c2bacd57439ee` | `/partner/orders` |

The F2-F3 source screen's internal title says B1-B2; the project canvas label identifies it as F2-F3. Layout and content follow these screens, with the repository's Nunito Sans typography and shared navigation. Unsupported certification, biometric accuracy, insurance and payout claims from the design are not presented as real capabilities.

Use `VITE_DEMO_PARTNER=true` in a local development environment to preview protected freelancer routes. This flag is ignored in production and takes precedence over the customer preview flag. Route guards remain in place.

Dashboard and booking data live in `partner-preview.ts` and are explicitly marked as illustrative. Plan selection and booking confirmation/rejection do not charge, send requests, or mutate bookings. KYC validates fields and file types/sizes, previews images with temporary object URLs, and keeps data only in the mounted page; it does not upload documents, persist sensitive data, perform OCR/biometrics or claim approval.

Backend integration still requires agreed contracts for partner registration/uploads/KYC, metrics, plans and checkout, booking queries and accept/reject mutations. Replace fixtures with server data and handle conflicts/deadlines on the server before enabling transactions. Availability and the existing booking detail placeholder are outside F1–F4.
