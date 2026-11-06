# Talha Jewelers website

Mobile-friendly React + Vite storefront and admin dashboard using Supabase.

## Before deployment
1. Create a `.env` file in the project root using `.env.example`.
2. Add your Supabase Project URL and **Publishable key** (never use the Secret/service-role key).
3. Confirm the Supabase tables and policies already created:
   - `products`: `id`, `name`, `category`, `price`, `description`, `images` (text array), `is_published`, `created_at`
   - `metal_rates`: `id`, `metal`, `price_per_tola`, `updated_at`
4. Confirm the public Storage bucket is named exactly `Product-images`.
5. Admin login uses the authorized Supabase Auth user. Row Level Security policies must restrict write access to the intended admin UID.

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
Deploy the generated `dist` folder using a static hosting provider such as Netlify. Configure the same environment variables in the hosting provider.

## Security
- Never commit `.env`.
- Never put the Supabase Secret/service-role key in frontend code.
- Only use the Supabase publishable key in this browser app.
- Use a strong unique admin password and enable email confirmation/security settings as appropriate.

## Notes
- Product photos are uploaded to the public `Product-images` bucket. Do not upload private documents.
- Metal rates are manually entered by the shop admin; no live market feed is claimed.
- WhatsApp contact uses the shop's supplied QR link.
