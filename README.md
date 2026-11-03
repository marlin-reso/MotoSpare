# MotoSpare — Multi-vendor Motorcycle Spare Parts Marketplace

A responsive React + TypeScript + Vite frontend prototype based on the attached MotoSpare project specification.

## Run locally on macOS

1. Install Node.js LTS from https://nodejs.org/
2. Extract this ZIP and open the folder in VS Code.
3. In Terminal, run:

```bash
npm install
npm run dev
```

4. Open the localhost URL Vite prints (usually http://localhost:5173).

Build verification:

```bash
npm run build
```

## Included
- Marketplace homepage with searchable/filterable sample inventory, category and brand selection.
- Product details via clickable product cards.
- Wishlist, cart quantity management, subtotal, mock coupon entry.
- Bike garage selection UI.
- Buyer, seller and admin portal navigation and dashboard views.
- Seller product listing creation UI (prototype).
- Auth screens with form validation UI.
- Responsive navigation and layouts.
- React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS, shadcn/ui-compatible setup, Lucide icons.
- Dedicated service layer and typed mock data.

## Not yet connected
This is a frontend prototype with mock data. Real backend/database persistence, OTP/authentication, seller approval enforcement, server-side role checks, payment gateway, shipping integration, notifications, and secure file uploads must be implemented in backend. No secrets are embedded.
