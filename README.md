# Loss Locator Pro

**Internal loss intelligence and lead routing platform for property insurance claims.**

## Overview

Loss Locator Pro is an internal B2B tool that helps insurance operations teams:
- Monitor real-time loss events (hail, wind, fire, freeze)
- Score and prioritize claims by severity and probability
- Route high-value leads to adjusters and contractors
- Track property intelligence and risk factors
- Manage operational workflows

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Maps**: Leaflet + React-Leaflet
- **Deployment**: Netlify

## Features

### ✅ Implemented

- **Authentication**: Secure email/password login with session management
- **Dashboard**: Real-time metrics, event breakdown, conversion tracking
- **Loss Feed**: Advanced filtering, search, and status management
- **Lead Routing**: Assignment workflow with persistence
- **Property Intelligence**: Detailed property views with timeline and risk layers
- **Interactive Map**: Loss event markers with severity-based colors
- **Admin Settings**: Configurable thresholds and automation rules
- **Role-Based Access**: Admin, Ops, and Viewer roles with RLS

### 🎯 Key Capabilities

- **Real-Time Data**: All data persists to Supabase
- **Secure Access**: Row-level security, internal-only authentication
- **Operational Workflows**: Lead assignment, status tracking, notes
- **Data Visualization**: Map markers, metrics, event categorization
- **Responsive Design**: Works on desktop and mobile

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Supabase account
- Netlify account (for deployment)

### 2. Setup Database
```bash
# Follow instructions in supabase/README.md
# 1. Create Supabase project
# 2. Run schema.sql
# 3. Run seed.sql
# 4. Create first user
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment
```bash
cp env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 5. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` and login with your Supabase credentials.

## Project Structure

```
loss-locator-pro/
├── app/
│   ├── (internal)/          # Protected routes
│   │   ├── admin/           # Admin settings
│   │   ├── dashboard/       # Main dashboard
│   │   ├── lead-routing/    # Lead assignment
│   │   ├── loss-feed/       # Event table
│   │   └── property/[id]/   # Property details
│   ├── components/          # Shared components
│   ├── login/               # Authentication
│   └── layout.tsx           # Root layout
├── lib/
│   ├── auth.ts              # Authentication utilities
│   ├── data.ts              # Data layer (Supabase queries)
│   ├── database.types.ts    # TypeScript types
│   └── supabaseClient.ts    # Supabase client
├── supabase/
│   ├── schema.sql           # Database schema
│   ├── seed.sql             # Sample data
│   └── README.md            # Setup instructions
└── middleware.ts            # Route protection
```

## Database Schema

### Core Tables
- **users**: Internal user accounts with roles
- **loss_events**: All loss event records
- **properties**: Property intelligence data
- **routing_queue**: Lead assignment and routing
- **admin_settings**: System configuration

### Security
- Row Level Security (RLS) enabled
- Role-based access control
- Authenticated users only

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

**Quick Deploy to Netlify:**
1. Connect repository to Netlify
2. Set environment variables
3. Deploy

## User Management

### Adding Users
1. Invite via Supabase Dashboard > Authentication
2. User receives email invitation
3. After signup, set role in SQL:
```sql
UPDATE users SET role = 'admin' WHERE email = 'user@company.com';
```

### Roles
- **admin**: Full access, can modify settings
- **ops**: Can view and update events/leads
- **viewer**: Read-only access

## Development

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Type Check
```bash
npx tsc --noEmit
```

## Environment Variables

Required variables (see `env.example`):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Architecture Decisions

### Why Supabase?
- Built-in authentication
- Row-level security
- Real-time capabilities
- PostgreSQL reliability
- Free tier for internal tools

### Why Netlify?
- Automatic deployments
- Edge network
- Free tier for internal tools
- Next.js optimization

### Why No Stripe?
This is an internal tool, not a SaaS product. No billing required.

## Security

- ✅ Environment variables not committed
- ✅ Row-level security enabled
- ✅ Invite-only user access
- ✅ HTTPS enforced
- ✅ Session management
- ✅ Route protection middleware

## Performance

- Server-side rendering for initial load
- Client-side data fetching for interactivity
- Dynamic imports for map component
- Optimized images and assets
- Efficient database queries with indexes

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Internal use only. Not for public distribution.

## Support

For setup issues, see [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section.

---

**Built for internal operations teams. Optimized for speed, clarity, and operational leverage.**
