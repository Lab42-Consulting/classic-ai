# Testing Guide - Gym Intelligence System

This document provides comprehensive testing instructions for the Classic Method Gym Intelligence System, including automated API tests and manual E2E testing walkthroughs organized by user role.

---

## Table of Contents

1. [Automated Testing](#automated-testing)
   - [Running Tests](#running-tests)
   - [Test Structure](#test-structure)
   - [Writing New Tests](#writing-new-tests)
2. [Manual E2E Testing](#manual-e2e-testing)
   - [Test Environment Setup](#test-environment-setup)
   - [Test Data](#test-data)
3. [Role-Based Testing Walkthroughs](#role-based-testing-walkthroughs)
   - [Member Role Testing](#member-role-testing)
   - [Staff/Coach Role Testing](#staffcoach-role-testing)
   - [Admin Role Testing](#admin-role-testing)
4. [API Testing Reference](#api-testing-reference)
5. [Common Issues & Troubleshooting](#common-issues--troubleshooting)

---

## Automated Testing

### Running Tests

```bash
# Run all tests in watch mode
npm test

# Run all tests once
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (requires @vitest/ui)
npm run test:ui
```

### Test Structure

```
tests/
├── setup.ts                 # Global test setup and mocks
├── mocks/
│   └── fixtures.ts          # Test data fixtures
└── api/
    ├── auth.test.ts         # Authentication tests
    ├── logs.test.ts         # Daily logging tests
    ├── checkins.test.ts     # Weekly check-in tests
    ├── member-profile.test.ts # Member profile tests
    ├── members.test.ts      # Staff member management tests
    └── coach.test.ts        # Coach features tests
```

### Writing New Tests

Use the existing fixtures from `tests/mocks/fixtures.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import {
  mockMember,
  mockMemberSession,
  createMockRequest,
} from '../mocks/fixtures'

describe('My API', () => {
  it('should do something', async () => {
    vi.mocked(getSession).mockResolvedValue(mockMemberSession)
    // ... test implementation
  })
})
```

---

## Manual E2E Testing

### Test Environment Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Ensure database is seeded:**
   ```bash
   npm run db:seed
   ```

3. **Open the application:**
   Navigate to `http://localhost:3000`

### Test Data

The seed script creates the following test accounts:

| Role | ID | PIN | Purpose |
|------|-----|-----|---------|
| Member | `TEST01` | `1234` | General member testing |
| Member | `TRL001` | `1234` | Trial member testing |
| Staff (Coach) | `S-COACH` | `1234` | Coach feature testing |
| Staff (Admin) | `S-ADMIN` | `1234` | Admin feature testing |

---

## Role-Based Testing Walkthroughs

### Member Role Testing

#### Test M1: Member Login Flow

**Objective:** Verify member can log in successfully

**Steps:**
1. Navigate to `/login`
2. Enter Member ID: `TEST01`
3. Enter PIN: `1234`
4. Click "Prijavi se"

**Expected Results:**
- [ ] Redirected to `/home`
- [ ] User name displayed in header
- [ ] Daily metrics visible (Training, Water, Meals)
- [ ] Quick action buttons visible

**Edge Cases to Test:**
- Invalid Member ID → Error message displayed
- Invalid PIN → Error message displayed
- Inactive member → "Account not active" message
- Empty fields → Validation error

---

#### Test M2: Daily Meal Logging (Preset Sizes)

**Objective:** Verify meal logging with preset sizes works correctly

**Steps:**
1. From home page, tap "Log Something" or navigate to `/log`
2. Tap "Jeo sam" (I ate)
3. Select meal size: "Medium"
4. Observe macro preview
5. Optionally enter meal name: "Piletina sa risom"
6. Tap "Upiši obrok"

**Expected Results:**
- [ ] Macro preview shows estimated values:
  - Fat Loss: 500 cal, ~50g protein
  - Recomposition: 600 cal, ~53g protein
  - Muscle Gain: 700 cal, ~53g protein
- [ ] Success toast/message displayed
- [ ] Redirected to home
- [ ] Meals count incremented

**Test All Sizes:**
| Goal | Small | Medium | Large |
|------|-------|--------|-------|
| Fat Loss | 300 cal | 500 cal | 750 cal |
| Recomposition | 350 cal | 600 cal | 900 cal |
| Muscle Gain | 400 cal | 700 cal | 1000 cal |

---

#### Test M3: Daily Meal Logging (Custom Calories)

**Objective:** Verify custom calorie meal logging

**Steps:**
1. Navigate to `/log`
2. Tap "Jeo sam"
3. Select "Tačno" (Custom) meal size
4. Enter calories: `450`
5. Optionally enter protein: `35`
6. Tap "Upiši obrok"

**Expected Results:**
- [ ] Form accepts numeric input
- [ ] Validation prevents negative or zero values
- [ ] Success message displayed
- [ ] Log saved with exact values entered

---

#### Test M4: Daily Meal Logging (Exact Macros)

**Prerequisite:** Member must have `requireExactMacros` enabled by coach

**Objective:** Verify exact macro logging mode

**Steps:**
1. Navigate to `/log`
2. Tap "Jeo sam"
3. Enter Protein: `35`
4. Enter Carbs: `45`
5. Enter Fats: `15`
6. Observe auto-calculated calories: `455`
7. Tap "Upiši obrok"

**Expected Results:**
- [ ] No preset size buttons visible (only macro inputs)
- [ ] Calories auto-calculate: (35×4) + (45×4) + (15×9) = 455
- [ ] All three macro fields required
- [ ] Success message displayed

---

#### Test M5: Training Logging

**Objective:** Verify training can be logged

**Steps:**
1. Navigate to `/log`
2. Tap "Trenirao sam" (I trained)

**Expected Results:**
- [ ] Success toast displayed
- [ ] Redirected to home
- [ ] Training status shows ✓

---

#### Test M6: Water Logging

**Objective:** Verify water intake logging

**Steps:**
1. Navigate to `/log`
2. Tap "Pio sam vodu" multiple times

**Expected Results:**
- [ ] Each tap increments water count
- [ ] Home displays updated count (e.g., "3/8")

---

#### Test M7: Weekly Check-in (Sunday Only)

**Objective:** Verify check-in is only available on Sundays

**On a Weekday:**
1. Navigate to `/checkin`

**Expected Results:**
- [ ] Message: "Nedeljni pregled je dostupan samo nedeljom"
- [ ] Shows days until Sunday
- [ ] Check-in form disabled

**On Sunday:**
1. Navigate to `/checkin`
2. Enter weight: `84.5`
3. Select feeling: 😊 (3)
4. Tap "Pošalji pregled"

**Expected Results:**
- [ ] Form accepts weight (30-300 kg range)
- [ ] Feeling selection required (1-4)
- [ ] Success message displayed
- [ ] Member weight updated in profile

**Edge Cases:**
- Already checked in this week → "Već si završio pregled"
- Less than 7 days since last → "Moraš sačekati još X dana"

---

#### Test M8: Progress Page

**Objective:** Verify progress tracking displays correctly

**Steps:**
1. Navigate to `/progress`

**Expected Results:**
- [ ] Calorie ring shows consumed vs target
- [ ] Under target: Shows "X cal remaining" in green
- [ ] Over target: Shows "+X cal" in red
- [ ] Macro bars display (Protein, Carbs, Fats)
- [ ] Consistency score (0-100) visible
- [ ] Score breakdown available

---

#### Test M9: Goal Change

**Objective:** Verify member can change fitness goal

**Steps:**
1. Navigate to `/goal`
2. View current goal (highlighted)
3. Select different goal (e.g., "Rast mišića")
4. Confirm change

**Expected Results:**
- [ ] All three goals displayed with descriptions
- [ ] Macro splits shown for each
- [ ] Warning about target changes
- [ ] Targets recalculate after change

---

#### Test M10: AI Chat Agents

**Objective:** Verify AI agents respond appropriately

**Steps:**
1. Navigate to `/chat`
2. Select "Ishrana" (Nutrition) agent
3. Type: "Šta da jedem pre treninga?"
4. Send message

**Expected Results:**
- [ ] Response in Serbian (ekavica dialect)
- [ ] Response relevant to nutrition
- [ ] Shows remaining messages (rate limit)
- [ ] Conversation saved

**Test All Agents:**
| Agent | Test Question | Expected Domain |
|-------|--------------|-----------------|
| Ishrana | "Koliko kalorija mi treba?" | Nutrition |
| Suplementi | "Kada da pijem protein?" | Supplements |
| Trening | "Koliko puta nedeljno?" | Training |

**Rate Limit Testing:**
- Trial members: Max 5 messages/day
- Active members: Max 20 messages/day

---

#### Test M11: History View

**Objective:** Verify 30-day activity history

**Steps:**
1. Navigate to `/history`
2. View calendar grid
3. Tap on a day with activity

**Expected Results:**
- [ ] Color-coded calendar:
  - Gray: No activity
  - Yellow: Some activity
  - Green: Good activity
  - Bright green with ring: Excellent
- [ ] Day detail shows: calories, protein, training, meals, water
- [ ] 30-day summary stats at bottom

---

#### Test M12: Subscription/Membership Status

**Objective:** Verify subscription status display

**Steps:**
1. Navigate to `/subscription`

**Expected Results:**
- [ ] Trial: Shows day X of 7, progress bar, days remaining
- [ ] Active: Shows "Aktivna članarina" with end date
- [ ] Expired: Shows warning, contact staff prompt
- [ ] Warning appears at 3 days remaining

---

#### Test M13: Profile & Logout

**Objective:** Verify profile display and logout

**Steps:**
1. Tap avatar (initials) on home screen
2. View profile information
3. Tap "Odjavi se"

**Expected Results:**
- [ ] Profile shows: name, member ID, goal, weight, height
- [ ] Quick links to goal and membership
- [ ] Logout clears session
- [ ] Redirected to login page

---

### Staff/Coach Role Testing

#### Test S1: Staff Login

**Objective:** Verify staff login flow

**Steps:**
1. Navigate to `/staff-login`
2. Enter Staff ID: `S-COACH`
3. Enter PIN: `1234`
4. Click "Prijavi se"

**Expected Results:**
- [ ] Redirected to `/dashboard`
- [ ] Staff name displayed
- [ ] Dashboard stats visible

---

#### Test S2: Dashboard Overview

**Objective:** Verify dashboard displays member statistics

**Steps:**
1. Login as staff
2. View dashboard

**Expected Results:**
- [ ] Stats cards: Total, Active, Slipping, Inactive
- [ ] Member list visible
- [ ] Filter buttons functional
- [ ] Search by name/ID works

---

#### Test S3: Register New Member

**Objective:** Verify member registration

**Steps:**
1. Navigate to `/register` or click "Register New Member"
2. Enter Name: "Test Clan"
3. Select Goal: "Gubitak masnoće"
4. Optionally add height/weight/gender
5. Click "Registruj člana"

**Expected Results:**
- [ ] Auto-generated Member ID (6 chars)
- [ ] Auto-generated PIN (4 digits)
- [ ] QR Code generated
- [ ] Credentials displayed for sharing
- [ ] Member appears in member list

---

#### Test S4: View Member Details

**Objective:** Verify member detail view

**Steps:**
1. Click on a member in the list
2. View member detail page

**Expected Results:**
- [ ] Profile info displayed
- [ ] Activity summary visible
- [ ] Weight progress chart (if check-ins exist)
- [ ] Coach assignment status shown

---

#### Test S5: Coach Assignment

**Objective:** Verify coach can assign themselves to member

**Prerequisite:** Login as Coach (not Admin)

**Steps:**
1. Navigate to member details (unassigned member)
2. Click "Dodeli meni" (Assign to me)
3. Optionally set custom targets:
   - Custom calories: 1800
   - Custom protein: 150
4. Optionally enable "Require Exact Macros"
5. Submit assignment

**Expected Results:**
- [ ] Assignment created successfully
- [ ] Member shows as assigned to coach
- [ ] Custom targets saved
- [ ] Member's meal logging mode changes (if exact macros enabled)

**Edge Cases:**
- Already assigned member → Error "Already has coach"
- Admin trying to assign → Error "Only coaches can assign"

---

#### Test S6: Coach Nudge

**Objective:** Verify coach can send accountability nudge

**Steps:**
1. View assigned member details
2. Find "Send Nudge" section
3. Enter message: "Odlično napreduješ! Nastavi tako!"
4. Send nudge

**Expected Results:**
- [ ] Nudge sent successfully
- [ ] Member sees banner on home screen
- [ ] Banner dismissible (marks as seen)

---

#### Test S7: Per-Member AI Knowledge

**Objective:** Verify coach can customize AI agent behavior

**Steps:**
1. View assigned member details
2. Scroll to "AI Podešavanja" section
3. Click on "Ishrana" (Nutrition) agent card
4. Enter guidelines:
   ```
   - Preporučene namirnice: piletina, riba, jaja
   - Izbegavati: mlečne proizvode
   - Fokus: povećati protein unos
   ```
5. Click "Sačuvaj"

**Expected Results:**
- [ ] Guidelines saved
- [ ] Status dot turns emerald (configured)
- [ ] AI uses guidelines in responses to member

**Test All Agent Types:**
- [ ] Nutrition (emerald dot)
- [ ] Supplements (violet dot)
- [ ] Training (orange dot)

---

### Admin Role Testing

#### Test A1: Admin Dashboard Access

**Objective:** Verify admin has full access

**Steps:**
1. Login as Admin (`S-ADMIN`)
2. Navigate dashboard

**Expected Results:**
- [ ] Can see all members (not just assigned)
- [ ] Can access all features
- [ ] Can view system-wide stats

---

#### Test A2: Admin Cannot Assign as Coach

**Objective:** Verify admin role restrictions

**Steps:**
1. Login as Admin
2. Try to assign yourself to a member

**Expected Results:**
- [ ] Error: "Only coaches can assign members"
- [ ] Assignment not created

---

## API Testing Reference

### Authentication Endpoints

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/auth/login` | POST | Valid login, invalid ID, invalid PIN, inactive member |
| `/api/auth/staff-login` | POST | Valid login, invalid credentials |
| `/api/auth/logout` | POST | Session cleared |

### Member Endpoints

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/logs` | POST | Meal (small/medium/large), custom, exact, training, water |
| `/api/logs` | GET | Today's logs, date range, history aggregation |
| `/api/checkins` | POST | Valid check-in, not Sunday, already done, too soon |
| `/api/checkins` | GET | Status, can check-in, recent history |
| `/api/member/profile` | GET | Profile data, coach settings |
| `/api/member/profile` | PATCH | Goal change, locale, weight |
| `/api/member/subscription` | GET | Trial, active, expired status |
| `/api/member/nudges` | GET | Unread nudges |

### Staff Endpoints

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/members` | POST | Register with required fields, all fields, ID collision |
| `/api/members` | GET | List with activity status |
| `/api/members/[id]` | GET | Member detail |

### Coach Endpoints

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/coach/assign` | POST | Valid assignment, custom targets, exact macros |
| `/api/coach/nudge` | POST | Send to assigned member |
| `/api/coach/knowledge` | POST/GET | Save/retrieve agent knowledge |

### AI Endpoints

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/ai/agents/nutrition/chat` | POST | Valid question, rate limit, budget |
| `/api/ai/agents/supplements/chat` | POST | Domain-specific response |
| `/api/ai/agents/training/chat` | POST | Domain-specific response |

---

## Common Issues & Troubleshooting

### Test Database Issues

**Problem:** Tests failing due to database connection

**Solution:**
```bash
# Reset test database
npx prisma db push --force-reset

# Re-seed data
npm run db:seed
```

### Session/Auth Issues

**Problem:** Unauthorized errors in tests

**Solution:**
- Ensure mock session is properly set up
- Check `vi.mocked(getSession)` returns correct session type

### Date-Related Test Failures

**Problem:** Check-in tests failing on certain days

**Solution:**
- Use `vi.useFakeTimers()` and `vi.setSystemTime()` to control date
- Use `getSunday()` and `getWeekday()` helpers from fixtures

### AI Rate Limit Testing

**Problem:** Can't test rate limits

**Solution:**
- Mock `AIUsageDaily` to return specific count
- Test with different `subscriptionStatus` values

---

## Test Coverage Goals

| Area | Target Coverage |
|------|----------------|
| Authentication | 90%+ |
| Logging (meals/training/water) | 95%+ |
| Check-ins | 90%+ |
| Member Profile | 85%+ |
| Coach Features | 85%+ |
| AI Chat | 80%+ |

Run coverage report:
```bash
npm run test:coverage
```

---

## Continuous Integration

### Pre-commit Checklist

- [ ] All tests pass: `npm run test:run`
- [ ] No lint errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

### CI Pipeline Tests

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: npm run test:run

- name: Check Coverage
  run: npm run test:coverage
```

---

*Last Updated: December 2024*
