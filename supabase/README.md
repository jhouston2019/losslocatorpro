# Loss Locator Pro - Supabase Setup

## Quick Start

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Save your project URL and anon key

### 2. Run Schema Migration
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `schema.sql`
3. Run the migration
4. Verify tables are created

### 3. Seed Initial Data
1. In SQL Editor, copy contents of `seed.sql`
2. Run the seed script
3. Verify data in Table Editor

### 4. Create First User
Since this is internal-only, manually invite users:

**Option A: Via Supabase Dashboard**
1. Go to Authentication > Users
2. Click "Invite User"
3. Enter email address
4. User will receive invite email

**Option B: Via SQL**
```sql
-- This will be done via Supabase Auth UI
-- Users are created through email invitation only
```

### 5. Set User Role
After user signs up, set their role:
```sql
UPDATE users 
SET role = 'admin'  -- or 'ops' or 'viewer'
WHERE email = 'user@company.com';
```

### 6. Environment Variables
Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Database Schema

### Tables
- **users**: Internal user accounts with roles
- **loss_events**: All loss event records
- **properties**: Property intelligence data
- **property_events**: Links properties to loss events
- **routing_queue**: Lead assignment and routing
- **admin_settings**: System configuration

### Roles
- **admin**: Full access, can modify settings
- **ops**: Can view and update events/leads
- **viewer**: Read-only access

## Security
- Row Level Security (RLS) enabled on all tables
- Authenticated users only
- Role-based access control
- No public access

## Maintenance

### Backup
Supabase provides automatic backups. For manual backup:
```bash
# Use Supabase CLI or dashboard export
```

### Reset Data (Development Only)
```sql
TRUNCATE loss_events, properties, property_events, routing_queue CASCADE;
-- Then re-run seed.sql
```









