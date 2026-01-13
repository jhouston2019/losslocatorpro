# Loss Locator Pro - Functional Audit Test Plan

## 🎯 PURPOSE
This document provides exact user actions to test all critical functionality with audit logging enabled.

---

## 📍 WHERE TO OBSERVE LOGS

**Browser Console** (F12 → Console tab)
- All `[AUDIT]` logs will appear here
- Filter by "[AUDIT]" to see only audit logs
- Logs are color-coded:
  - Black: Info/Success
  - Red: Errors/Failures

---

## 🧪 TEST SCENARIOS

### TEST 1: Authentication Flow

#### 1.1 Sign In - Success Case
**Actions:**
1. Navigate to `/login`
2. Enter valid email and password
3. Click "Sign In"

**Expected Logs:**
```
[AUDIT] Auth: Sign in attempt for: user@example.com
[AUDIT] Auth: Sign in SUCCESS for: user@example.com - User ID: <uuid>
[AUDIT] Auth: Current user - user@example.com - Role: admin
```

**Verify:**
- ✅ Redirected to `/dashboard`
- ✅ No error logs
- ✅ User ID appears in logs

---

#### 1.2 Sign In - Failure Case
**Actions:**
1. Navigate to `/login`
2. Enter invalid credentials
3. Click "Sign In"

**Expected Logs:**
```
[AUDIT] Auth: Sign in attempt for: wrong@example.com
[AUDIT] Auth: Sign in FAILED for: wrong@example.com - Error: Invalid login credentials
```

**Verify:**
- ✅ Error message shown in UI
- ✅ Stays on login page
- ✅ Failure logged

---

#### 1.3 Sign Out
**Actions:**
1. While logged in, click "Sign out" button in navbar

**Expected Logs:**
```
[AUDIT] Auth: Sign out initiated for user: <uuid>
[AUDIT] Auth: Sign out SUCCESS - Session destroyed
```

**Verify:**
- ✅ Redirected to `/login`
- ✅ Cannot navigate back to dashboard
- ✅ Session destroyed

---

### TEST 2: Role-Based Access Control

#### 2.1 Admin Role - Write Access
**Setup:** Log in as admin user

**Actions:**
1. Navigate to `/lead-routing`
2. Click "Assign" on any lead
3. Fill in assignee details
4. Click "Save"

**Expected Logs:**
```
[AUDIT] Auth: Current user - admin@example.com - Role: admin
[AUDIT] Permission: Checking write access (admin/ops)
[AUDIT] Role Check: PASSED - User: admin@example.com - Role: admin - Required: admin or ops
[AUDIT] Write: assignLead - Queue ID: <uuid> - Assignee: John Doe - Type: internal-ops - Priority: High
[AUDIT] Write: assignLead SUCCESS - Queue ID: <uuid> - Now assigned to: John Doe
```

**Verify:**
- ✅ Role check passes
- ✅ Write operation succeeds
- ✅ Success message shown

---

#### 2.2 Admin Role - Admin Settings
**Setup:** Log in as admin user

**Actions:**
1. Navigate to `/admin`
2. Change "Minimum severity score" to 80
3. Click "Save Threshold Settings"

**Expected Logs:**
```
[AUDIT] Auth: Current user - admin@example.com - Role: admin
[AUDIT] Permission: Checking admin access
[AUDIT] Role Check: PASSED - User: admin@example.com - Role: admin - Required: admin
[AUDIT] Admin: updateAdminSettings - Changes: {"min_severity":80,...}
[AUDIT] Admin: Updating existing settings - ID: <uuid>
[AUDIT] Admin: updateAdminSettings SUCCESS
```

**Verify:**
- ✅ Admin check passes
- ✅ Settings saved
- ✅ Success confirmation shown

---

#### 2.3 Ops Role - Write Access (Should Pass)
**Setup:** Log in as ops user

**Actions:**
1. Navigate to `/lead-routing`
2. Assign a lead

**Expected Logs:**
```
[AUDIT] Auth: Current user - ops@example.com - Role: ops
[AUDIT] Permission: Checking write access (admin/ops)
[AUDIT] Role Check: PASSED - User: ops@example.com - Role: ops - Required: admin or ops
[AUDIT] Write: assignLead SUCCESS
```

**Verify:**
- ✅ Ops user can write
- ✅ Role check passes

---

#### 2.4 Ops Role - Admin Settings (Should Fail)
**Setup:** Log in as ops user

**Actions:**
1. Navigate to `/admin`
2. Try to change settings
3. Click "Save"

**Expected Logs:**
```
[AUDIT] Auth: Current user - ops@example.com - Role: ops
[AUDIT] Permission: Checking admin access
[AUDIT] Role Check: DENIED - User: ops@example.com - Role: ops - Required: admin
[AUDIT] Admin: updateAdminSettings FAILED - Insufficient permissions
```

**Verify:**
- ✅ Role check fails
- ✅ Error message shown
- ✅ Settings not saved

---

#### 2.5 Viewer Role - Write Access (Should Fail)
**Setup:** Log in as viewer user

**Actions:**
1. Navigate to `/lead-routing`
2. Try to assign a lead

**Expected Logs:**
```
[AUDIT] Auth: Current user - viewer@example.com - Role: viewer
[AUDIT] Permission: Checking write access (admin/ops)
[AUDIT] Role Check: DENIED - User: viewer@example.com - Role: viewer - Required: admin or ops
[AUDIT] Write: assignLead FAILED - Insufficient permissions
```

**Verify:**
- ✅ Role check fails
- ✅ Error message shown
- ✅ No write occurs

---

### TEST 3: Write Operations

#### 3.1 Assign Lead
**Actions:**
1. Go to `/lead-routing`
2. Click "Assign" on unassigned lead
3. Enter: Name "Jane Smith", Type "Adjuster Partner", Priority "High"
4. Click "Save"

**Expected Logs:**
```
[AUDIT] Permission: Checking write access (admin/ops)
[AUDIT] Role Check: PASSED
[AUDIT] Write: assignLead - Queue ID: <uuid> - Assignee: Jane Smith - Type: adjuster-partner - Priority: High
[AUDIT] Write: assignLead SUCCESS - Queue ID: <uuid> - Now assigned to: Jane Smith
```

**Verify:**
- ✅ Lead assigned
- ✅ Persists after refresh
- ✅ Success alert shown

---

#### 3.2 Update Loss Event Status
**Actions:**
1. Go to `/loss-feed`
2. Click on a loss event
3. Change status (via any UI that updates status)

**Expected Logs:**
```
[AUDIT] Permission: Checking write access (admin/ops)
[AUDIT] Role Check: PASSED
[AUDIT] Write: updateLossEventStatus - ID: <uuid> - New Status: Contacted
[AUDIT] Write: updateLossEventStatus SUCCESS - ID: <uuid>
```

**Verify:**
- ✅ Status updated
- ✅ Persists after refresh

---

#### 3.3 Create Routing Queue Entry
**Actions:**
1. Go to `/property/10001`
2. Click "Route lead" button

**Expected Logs:**
```
[AUDIT] Permission: Checking write access (admin/ops)
[AUDIT] Role Check: PASSED
[AUDIT] Routing: createRoutingQueueEntry - Loss Event ID: 10001 - Property ID: none
[AUDIT] Routing: createRoutingQueueEntry SUCCESS - New Queue ID: <uuid>
```

**Verify:**
- ✅ Queue entry created
- ✅ New entry appears in routing queue
- ✅ Toast notification shown

---

### TEST 4: Admin Settings Application

#### 4.1 Priority Score Calculation
**Actions:**
1. Open browser console
2. Navigate to `/dashboard`
3. Observe logs as data loads

**Expected Logs:**
```
[AUDIT] Admin Logic: calculatePriorityScore - Severity: 85 - Claim Prob: 0.82 - Income Band: 72nd percentile
[AUDIT] Admin Logic: Priority Score - Base: 85 - Boosts: +10 (high claim prob), +5 (high income) - Final: 100
```

**Verify:**
- ✅ Priority scores calculated
- ✅ Boosts applied correctly
- ✅ Final score capped at 100

---

#### 4.2 Auto-Create Lead Threshold Check
**Actions:**
1. Open browser console
2. Create or view a high-severity event
3. Check if auto-create logic runs

**Expected Logs:**
```
[AUDIT] Admin Logic: shouldAutoCreateLead - Severity: 90 - Claim Prob: 0.85
[AUDIT] Admin Logic: Thresholds - Min Severity: 75 - Min Prob: 0.7 - Result: PASS
```

**Verify:**
- ✅ Threshold check runs
- ✅ Uses admin-configured values
- ✅ Result matches expectations

---

#### 4.3 Settings Persistence
**Actions:**
1. Go to `/admin`
2. Change min severity to 85
3. Save settings
4. Refresh page
5. Verify settings still show 85

**Expected Logs (on save):**
```
[AUDIT] Admin: updateAdminSettings - Changes: {"min_severity":85}
[AUDIT] Admin: updateAdminSettings SUCCESS
```

**Expected Logs (on reload):**
```
(Settings should load with min_severity: 85)
```

**Verify:**
- ✅ Settings persist
- ✅ New thresholds apply immediately

---

### TEST 5: Error Handling

#### 5.1 Invalid Lead Assignment
**Actions:**
1. Go to `/lead-routing`
2. Click "Assign" on a lead
3. Leave assignee name empty
4. Click "Save"

**Expected Logs:**
```
[AUDIT] Write: assignLead - Queue ID: <uuid> - Assignee:  - Type: internal-ops - Priority: High
[AUDIT] Write: assignLead FAILED - Missing assignee name
```

**Verify:**
- ✅ Validation error caught
- ✅ User-friendly message shown
- ✅ No database write occurs

---

#### 5.2 Invalid Property ID
**Actions:**
1. Navigate to `/property/invalid-id`

**Expected Logs:**
```
[AUDIT] Auth: Current user - user@example.com - Role: admin
(Property lookup will fail gracefully)
```

**Verify:**
- ✅ Page shows "Property not found"
- ✅ No crash
- ✅ Can navigate away

---

### TEST 6: Session Management

#### 6.1 Session Persistence
**Actions:**
1. Log in
2. Refresh page
3. Observe logs

**Expected Logs:**
```
[AUDIT] Auth: Current user - user@example.com - Role: admin
```

**Verify:**
- ✅ Session persists
- ✅ No re-login required
- ✅ User data loads

---

#### 6.2 No Session - Redirect
**Actions:**
1. Clear browser data / use incognito
2. Navigate to `/dashboard`

**Expected Logs:**
```
[AUDIT] Auth: No active session found
(Middleware redirects to /login)
```

**Verify:**
- ✅ Redirected to login
- ✅ Cannot access internal pages
- ✅ No error thrown

---

## 🔍 AUDIT LOG CATEGORIES

### Auth Logs
- `[AUDIT] Auth: Sign in attempt`
- `[AUDIT] Auth: Sign in SUCCESS/FAILED`
- `[AUDIT] Auth: Sign out initiated`
- `[AUDIT] Auth: Sign out SUCCESS`
- `[AUDIT] Auth: Current user`
- `[AUDIT] Auth: No active session`

### Role Check Logs
- `[AUDIT] Permission: Checking write access`
- `[AUDIT] Permission: Checking admin access`
- `[AUDIT] Role Check: PASSED`
- `[AUDIT] Role Check: DENIED`
- `[AUDIT] Role Check: FAILED`

### Write Operation Logs
- `[AUDIT] Write: assignLead`
- `[AUDIT] Write: updateLossEventStatus`
- `[AUDIT] Write: assignLead SUCCESS/FAILED`

### Routing Logs
- `[AUDIT] Routing: createRoutingQueueEntry`
- `[AUDIT] Routing: createRoutingQueueEntry SUCCESS/FAILED`

### Admin Logs
- `[AUDIT] Admin: updateAdminSettings`
- `[AUDIT] Admin: updateAdminSettings SUCCESS`
- `[AUDIT] Admin Logic: shouldAutoCreateLead`
- `[AUDIT] Admin Logic: calculatePriorityScore`

---

## ✅ SUCCESS CRITERIA

For each test:
1. ✅ Expected logs appear in console
2. ✅ UI behavior matches expectations
3. ✅ Data persists correctly
4. ✅ Errors are caught and logged
5. ✅ No silent failures

---

## 🧹 REMOVING AUDIT LOGS LATER

To remove all audit logging:

```bash
# Search for all [AUDIT] logs
grep -r "\[AUDIT\]" lib/ app/

# Remove lines containing [AUDIT]
# Or use find/replace: console.log('[AUDIT].*'); → (delete)
```

All audit logs are:
- Prefixed with `[AUDIT]`
- Non-intrusive (console only)
- Easy to find and remove
- Do not affect logic

---

## 📊 EXPECTED OUTCOMES

After running all tests, you should observe:

1. **Authentication works correctly**
   - Sign in/out logged
   - Session management verified
   - No auth bypass possible

2. **Roles are enforced**
   - Admin can do everything
   - Ops can write but not admin
   - Viewer is read-only
   - All enforced in logic layer

3. **Writes persist**
   - Lead assignments save
   - Status updates save
   - Admin settings save
   - All survive refresh

4. **Admin settings apply**
   - Priority scores use settings
   - Auto-create uses thresholds
   - Changes take effect immediately

5. **Errors are handled**
   - Invalid data rejected
   - User-friendly messages
   - No crashes
   - All logged

---

## 🎯 AUDIT COMPLETE WHEN

- ✅ All 6 test categories pass
- ✅ All logs appear as expected
- ✅ No silent failures found
- ✅ All edge cases handled
- ✅ Ready to remove audit logs

---

**Start with TEST 1 and work through sequentially. Check console after each action.**









