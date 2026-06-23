# B2OPS — Requisition Management Portal

## Quick Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Supabase
```bash
cp .env.example .env
# Fill in your Supabase URL and Anon Key
```

### 3. Run the database schema
- Open Supabase → SQL Editor
- Paste contents of `supabase-schema.sql`
- Run it

### 4. Enable Google Auth in Supabase
- Authentication → Providers → Google → Enable
- Add your Google OAuth credentials

### 5. Start development server
```bash
npm run dev
```

### 6. Set yourself as admin
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## Deploy to Cloudflare Pages (Free)
- Build command: `npm run build`
- Output directory: `dist`
- Add environment variables in Cloudflare dashboard

## Tech Stack
- React 18 + Vite + TypeScript
- Tailwind CSS v4
- Supabase (Auth + DB + Realtime)
- TanStack Query
- Recharts
- Sonner (toasts)
