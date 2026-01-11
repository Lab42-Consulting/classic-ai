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
├── api/
│   ├── auth.test.ts         # Authentication tests
│   ├── logs.test.ts         # Daily logging tests
│   ├── checkins.test.ts     # Weekly check-in tests
│   ├── member-profile.test.ts # Member profile tests
│   ├── members.test.ts      # Staff member management tests
│   ├── coach.test.ts        # Coach features tests
│   ├── gym.test.ts          # Gym settings and branding tests
│   ├── challenges.test.ts   # Challenge/Game system tests
│   ├── gym-checkin.test.ts  # Gym QR check-in tests
│   ├── reset-week.test.ts   # Week reset API tests
│   ├── sessions.test.ts     # Session scheduling tests (member + coach)
│   └── meals.test.ts        # Meal creation and photo tests
└── lib/
    └── meal-validation.test.ts  # Meal photo validation unit tests
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

#### Test M14: Custom Nutrition Targets

**Objective:** Verify members can adjust their daily nutrition targets

**Prerequisite:** Member without assigned coach

**Steps:**
1. Navigate to `/profile`
2. Find "Dnevni ciljevi" (Daily Targets) section
3. Click "Izmeni" (Edit) button
4. Enter custom values:
   - Calories: `2200`
   - Protein: `180`
   - Carbs: `250`
   - Fats: `70`
5. Click "Sačuvaj" (Save)
6. Verify targets updated in the section

**Expected Results:**
- [ ] Edit button visible for members without coach
- [ ] Modal opens with input fields
- [ ] Validation works (800-10000 cal, 0-500g protein, etc.)
- [ ] Targets update after saving
- [ ] Changes persist after page refresh

**Reset to Auto:**
1. Open target modal again
2. Click "Vrati na automatski izračunato"
3. Verify targets show "Automatski"

**Expected Results:**
- [ ] Custom targets cleared
- [ ] Display shows "Automatski" for all fields
- [ ] System uses calculated values based on weight/goal

---

#### Test M15: Custom Targets with Coach

**Objective:** Verify members with coach cannot modify targets

**Prerequisite:** Member with assigned coach

**Steps:**
1. Login as member with assigned coach
2. Navigate to `/profile`
3. Find "Dnevni ciljevi" section

**Expected Results:**
- [ ] No "Izmeni" button visible
- [ ] Coach notice banner displayed: "👨‍🏫 Managed by [Coach Name]"
- [ ] Message: "Contact your coach to adjust targets"
- [ ] Targets display coach-assigned values

**API Test:**
1. Try PATCH `/api/member/profile` with custom targets
2. Should return 403 error

**Expected Response:**
```json
{ "error": "Cannot modify targets while assigned to a coach" }
```

---

#### Test M16: Challenge View (No Active Challenge)

**Objective:** Verify empty state when no challenge exists

**Steps:**
1. Navigate to `/challenge`

**Expected Results:**
- [ ] Shows "Trenutno nema aktivnog izazova" message
- [ ] Trophy icon displayed
- [ ] "Budi spreman" subtitle

---

#### Test M17: Challenge View (Upcoming Challenge)

**Objective:** Verify upcoming challenge display

**Prerequisite:** Published challenge with future start date

**Steps:**
1. Navigate to `/challenge`

**Expected Results:**
- [ ] Amber themed card displayed
- [ ] "Uskoro" badge visible
- [ ] Challenge name and description shown
- [ ] Countdown: "Počinje za X dana"
- [ ] No join button (can't join yet)
- [ ] Point values listed with emojis (🍽️💪💧📊🔥)

---

#### Test M18: Challenge Join Flow

**Objective:** Verify member can join an active challenge

**Prerequisite:** Active challenge in registration period

**Steps:**
1. Navigate to `/challenge`
2. Review challenge details
3. Click "Pridruži se" button

**Expected Results:**
- [ ] Challenge info displayed (name, reward, deadline)
- [ ] Point values shown
- [ ] "Pridruži se" button visible
- [ ] After clicking: success message
- [ ] View changes to show leaderboard

**Edge Cases:**
- Already joined → "Već učestvuješ u ovom izazovu"
- Registration closed → "Rok za prijavu je istekao"

---

#### Test M19: Challenge Leaderboard

**Objective:** Verify leaderboard displays correctly for participants

**Prerequisite:** Member participating in active challenge

**Steps:**
1. Navigate to `/challenge`
2. View your rank card
3. Scroll through leaderboard

**Expected Results:**
- [ ] Your rank card shows:
  - Current position (e.g., "#3")
  - Total points
  - Points breakdown (meals, training, water, check-in, streak)
- [ ] Leaderboard shows all participants
- [ ] Medal icons for top 3 (🥇🥈🥉)
- [ ] Your row highlighted

---

#### Test M20: Challenge Points Integration

**Objective:** Verify points are awarded when logging activities

**Prerequisite:** Member participating in active challenge

**Steps:**
1. Log a meal at `/log`
2. Navigate to `/challenge`
3. Check points updated

**Expected Results:**
- [ ] Meal points increased by challenge.pointsPerMeal
- [ ] Total points updated
- [ ] Rank may change based on new total

**Test All Point Types:**
| Action | Expected Points |
|--------|-----------------|
| Log meal | +5 (default) |
| Log training | +15 (default) |
| Log water | +1 (default) |
| Weekly check-in | +25 (default) |

---

#### Test M21: Challenge Home Banner

**Objective:** Verify challenge banner appears on home page

**Prerequisite:** Active challenge, member not participating

**Steps:**
1. Navigate to `/home`
2. Look for challenge banner below coach nudges

**Expected Results:**
- [ ] Banner displays:
  - Challenge name
  - Reward description
  - Participant count
  - Days until deadline OR days until start
- [ ] Emerald color for joinable challenge
- [ ] Amber color for upcoming challenge
- [ ] Tapping banner navigates to `/challenge`

---

#### Test M22: Week Reset

**Objective:** Verify member can reset their weekly consistency tracking

**Steps:**
1. Login as member
2. Navigate to `/profile`
3. Find and tap "Resetuj nedelju" button
4. Read confirmation modal
5. Tap "Resetuj" to confirm

**Expected Results:**
- [ ] Confirmation modal appears with warning message
- [ ] After confirming: success feedback
- [ ] Consistency score recalculates from reset date
- [ ] Historical logs remain intact

**API Test:**
1. Call POST `/api/member/reset-week`
2. Should return 200 with success message

**Expected Response:**
```json
{
  "success": true,
  "message": "Nedelja uspešno resetovana",
  "weekResetAt": "2025-01-03T12:00:00.000Z"
}
```

**Edge Cases:**
- Unauthenticated user → 401 error
- Multiple resets → Each sets new weekResetAt timestamp

---

#### Test M23: Coach View-Only Challenge (Coach as Member)

**Objective:** Verify coaches see view-only mode when accessing challenges

**Prerequisite:** Coach with linked member account, active challenge

**Steps:**
1. Login as coach via `/staff-login`
2. Click "Moj nalog" to access member view
3. Navigate to `/challenge`

**Expected Results:**
- [ ] Blue info banner: "Pregled izazova"
- [ ] Subtitle: "Kao trener možete pratiti izazov, ali ne učestvovati"
- [ ] Leaderboard visible with all participants
- [ ] NO "Pridruži se" (Join) button displayed
- [ ] Challenge details and rewards shown

**API Test:**
1. Call GET `/api/member/challenge` as coach
2. Response should include `isStaffMember: true`

**Join Attempt Test:**
1. Call POST `/api/member/challenge` as coach
2. Should return 403 error

**Expected Response:**
```json
{ "error": "Treneri ne mogu učestvovati u izazovima" }
```

---

#### Test M24: Gym QR Check-in (Member)

**Objective:** Verify member can check-in at gym via daily rotating code for challenge training points

**Prerequisite:** Gym has QR check-in enabled, member participating in active challenge

**Steps:**
1. Login as member
2. Navigate to `/challenge`
3. Look for check-in status indicator
4. If showing red badge, tap "Prijavi se u teretanu"
5. Scan QR code displayed at gym (or enter daily code manually)

**Expected Results:**
- [ ] Check-in status shows in challenge page
- [ ] Red badge: "Check-in required, not done today"
- [ ] After check-in: Green badge "Prijavljen/a"
- [ ] Success message: "Uspešno prijavljen!"
- [ ] Can only check-in once per day

**Daily Rotating Codes:**
- Codes are 8-character uppercase alphanumeric (e.g., `A3F2B1C9`)
- Codes rotate at midnight UTC
- 1-hour grace period after midnight accepts yesterday's code

**API Tests:**

```bash
# Test 1: Check-in with valid daily code
POST /api/member/gym-checkin
{ "secret": "<daily-code>" }  # e.g., "A3F2B1C9"
# Expected: 200 { success: true, alreadyCheckedIn: false }

# Test 2: Duplicate check-in (same day)
POST /api/member/gym-checkin
{ "secret": "<daily-code>" }
# Expected: 200 { success: true, alreadyCheckedIn: true }

# Test 3: Invalid/expired code
POST /api/member/gym-checkin
{ "secret": "wrong-code" }
# Expected: 400 { error: "Nevažeći ili istekao kod za prijavu" }

# Test 4: Get check-in status
GET /api/member/gym-checkin
# Expected: 200 { checkedInToday: true/false, isInActiveChallenge: true/false }
```

**Edge Cases:**
- Missing secret → "Nedostaje kod za prijavu"
- Gym has no check-in enabled → "Teretana nema aktiviran sistem prijave"
- Wrong/expired code → "Nevažeći ili istekao kod za prijavu"
- Yesterday's code during grace period (00:00-01:00 UTC) → Should work

---

#### Test M25: Training Points with Gym Check-in

**Objective:** Verify training points require gym check-in when enabled

**Prerequisite:** Gym has QR check-in enabled, member in active challenge

**Without Check-in:**
1. Login as member participating in challenge
2. Do NOT scan gym QR code
3. Log training at `/log`
4. Navigate to `/challenge`

**Expected Results:**
- [ ] Training logged successfully (normal log works)
- [ ] Challenge training points NOT awarded
- [ ] No training points increase on leaderboard

**With Check-in:**
1. Scan gym QR code first
2. Log training at `/log`
3. Navigate to `/challenge`

**Expected Results:**
- [ ] Training logged successfully
- [ ] Challenge training points awarded (e.g., +15)
- [ ] Leaderboard reflects new points

---

### Session Scheduling (Member)

#### Test M26: Access Sessions Page

**Objective:** Verify member can access sessions page

**Steps:**
1. Login as member WITH an assigned coach
2. On home page, look for the "Termini" button (calendar icon)
3. Click the button

**Expected Results:**
- [ ] Navigates to `/sessions`
- [ ] Shows sessions page with coach name in header
- [ ] Shows "Zakaži termin" button
- [ ] No "Nemaš trenera" warning visible

**Without Coach:**
1. Login as member WITHOUT an assigned coach
2. Navigate to `/sessions`

**Expected Results:**
- [ ] Shows "Nemaš trenera" warning banner
- [ ] Shows "Pronađi trenera" button
- [ ] No "Zakaži termin" button visible

---

#### Test M27: Create Session Request (Member)

**Objective:** Verify member can create a session request

**Prerequisite:** Member has an assigned coach

**Steps:**
1. Navigate to `/sessions`
2. Click **"Zakaži termin"**
3. Fill in the form:
   - Session type: "Trening"
   - Date: Tomorrow or later
   - Time: Any time
   - Duration: 60 minutes
   - Location: "U teretani"
   - Note: "Test session request"
4. Click **"Pošalji zahtev"**

**Expected Results:**
- [ ] Request created successfully
- [ ] Toast shows success message
- [ ] Request appears in "Čeka se odgovor trenera" section
- [ ] Request shows pending status

**Edge Cases:**
- Date less than 24 hours → Error "Termin mora biti zakazan najmanje 24 sata unapred"
- Invalid duration → Validation error

---

#### Test M28: Respond to Session Request (Member)

**Objective:** Verify member can accept, counter, or decline requests

**Prerequisite:** Coach has sent a session request to member

**Test Accept:**
1. View the request in "Zahtevi za odgovor" section
2. Click **"Prihvati"**

**Expected Results:**
- [ ] Request status changes to accepted
- [ ] Session appears in "Zakazani termini" section
- [ ] Toast shows success message

**Test Decline:**
1. View a pending request
2. Click **"Odbij"**

**Expected Results:**
- [ ] Request disappears from pending list
- [ ] Status changed to declined

**Test Counter:**
1. View a pending request
2. Click **"Predloži drugo vreme"**
3. Modify date/time in the modal
4. Click **"Pošalji predlog"**

**Expected Results:**
- [ ] Counter-proposal sent successfully
- [ ] Request moves to "Čeka se odgovor trenera"
- [ ] Counter count incremented

---

#### Test M29: Cancel Confirmed Session (Member)

**Objective:** Verify member can cancel confirmed sessions

**Prerequisite:** Member has a confirmed upcoming session

**Steps:**
1. Navigate to `/sessions`
2. Find a confirmed session in "Zakazani termini"
3. Click **"Otkaži"**
4. Enter cancellation reason (min 10 characters): "Need to reschedule due to conflict"
5. Click **"Potvrdi otkazivanje"**

**Expected Results:**
- [ ] Session cancelled successfully
- [ ] Session moves to past sessions
- [ ] Status shows "Otkazano"

**Edge Cases:**
- Reason less than 10 characters → Error message
- Empty reason → Validation error

---

#### Test M30: Create Meal with Photo

**Objective:** Verify member can create a meal with a photo

**Steps:**
1. Login as member
2. Navigate to `/meals`
3. Click **"Novi obrok"** (New Meal)
4. Enter meal name: "Test Meal with Photo"
5. Click the photo upload area
6. Select an image file
7. Crop to 4:3 aspect ratio
8. Add at least one ingredient
9. Save the meal

**Expected Results:**
- [ ] Image cropper opens with 4:3 aspect ratio
- [ ] Crop preview shows selected area
- [ ] Photo displays in meal form after cropping
- [ ] Meal saves successfully with photo
- [ ] Photo appears in meal card on meals page

**Edge Cases:**
- Image over 5MB in cropper → Silently ignored (file too large)
- Non-image file → Silently ignored
- Cancel cropping → No photo added

---

#### Test M31: Create Meal Without Photo (Private)

**Objective:** Verify private meals don't require photos

**Steps:**
1. Navigate to `/meals`
2. Create a new meal **without** adding a photo
3. Leave "Podeli sa teretanom" unchecked
4. Add ingredients and save

**Expected Results:**
- [ ] Meal saves successfully without photo
- [ ] No validation error for missing photo
- [ ] Meal appears in "Moji obroci" without photo

---

#### Test M32: Share Meal Requires Photo

**Objective:** Verify sharing meals requires a photo

**Steps:**
1. Create a new meal **without** a photo
2. Check **"Podeli sa teretanom"** (Share with gym)
3. Try to save

**Expected Results:**
- [ ] Error message: "Slika je obavezna za deljenje obroka"
- [ ] Meal NOT saved
- [ ] Photo hint text shows "Slika je obavezna za deljenje sa teretanom"

**Fix and Retry:**
1. Add a photo via the cropper
2. Save again

**Expected Results:**
- [ ] Meal saves successfully
- [ ] Shows pending approval status

---

#### Test M33: Remove Photo from Shared Meal

**Objective:** Verify removing photo auto-unshares the meal

**Prerequisite:** Member has a shared meal with photo (pending or approved)

**Steps:**
1. Navigate to `/meals`
2. Edit a shared meal with photo
3. Click the trash icon to remove photo
4. Save the meal

**Expected Results:**
- [ ] Photo removed from meal
- [ ] Meal automatically set to private (`isShared: false`)
- [ ] No longer appears in pending/shared meals
- [ ] Success message displayed

**API Test:**
```bash
PATCH /api/member/meals/[id]
{ "photoUrl": null }
# Expected: meal.isShared = false, meal.shareApproved = false
```

---

#### Test M34: Copy Shared Meal with Photo

**Objective:** Verify copying a shared meal also copies the photo

**Prerequisite:** Approved shared meal with photo exists

**Steps:**
1. Navigate to `/meals`
2. Go to "Deljeni" (Shared) tab
3. Find a meal with photo
4. Click **"Sačuvaj u svoje obroke"** (Copy to saved)

**Expected Results:**
- [ ] Success message: "Obrok kopiran u tvoje sačuvane obroke"
- [ ] Meal appears in "Moji obroci" tab
- [ ] Copied meal includes the photo
- [ ] Copy is private (not shared)

**API Test:**
```bash
POST /api/member/meals/copy
{ "mealId": "shared-meal-id" }
# Expected: copiedMeal.photoUrl matches original
```

---

#### Test M35: Meal Photo Validation

**Objective:** Verify photo validation rules

**API Tests:**
```bash
# Test 1: Valid JPEG base64
POST /api/member/meals
{ "name": "Test", "photoUrl": "data:image/jpeg;base64,...", "ingredients": [...] }
# Expected: 200 success

# Test 2: Photo too large (>1MB)
POST /api/member/meals
{ "name": "Test", "photoUrl": "<2MB base64 image>", "ingredients": [...] }
# Expected: 400 { error: "Photo too large. Max 1MB." }

# Test 3: Invalid format (not image)
POST /api/member/meals
{ "name": "Test", "photoUrl": "data:text/plain;base64,...", "ingredients": [...] }
# Expected: 400 { error: "Photo must be an image" }

# Test 4: Share without photo
POST /api/member/meals
{ "name": "Test", "isShared": true, "ingredients": [...] }
# Expected: 400 { error: "Photo is required when sharing a meal" }
```

---

### Difficulty Mode Testing

#### Test M36: View Difficulty Mode Setting

**Objective:** Verify member can view their current difficulty mode

**Steps:**
1. Login as member
2. Navigate to `/profile`
3. Find "Težina iskustva" (Difficulty Mode) section

**Expected Results:**
- [ ] Current mode displayed (Simple, Standard, or Pro)
- [ ] Mode selector or change option visible
- [ ] Mode description shown

---

#### Test M37: Change Difficulty Mode

**Objective:** Verify member can change their difficulty mode

**Steps:**
1. Navigate to `/profile`
2. Find difficulty mode section
3. Select a different mode (e.g., change from Standard to Pro)
4. Confirm change

**Expected Results:**
- [ ] Mode changes immediately
- [ ] Success feedback shown
- [ ] Log page reflects new mode features
- [ ] Changes persist after page refresh

**API Test:**
```bash
PATCH /api/member/profile
{ "difficultyMode": "pro" }
# Expected: 200 { success: true }
```

---

#### Test M38: Simple Mode Meal Logging

**Objective:** Verify Simple mode provides one-tap meal logging

**Prerequisite:** Member with `difficultyMode: "simple"`

**Steps:**
1. Navigate to `/log`
2. Tap "Jeo/la sam" (I ate)

**Expected Results:**
- [ ] Meal logged immediately (one tap)
- [ ] NO meal size selection modal
- [ ] NO macro preview
- [ ] Success message: "Obrok ubeležen"
- [ ] Redirected to home

**What Should NOT Appear:**
- [ ] Size buttons (S/M/L)
- [ ] Saved meals section
- [ ] Custom entry fields
- [ ] Macro displays

---

#### Test M39: Standard Mode Meal Logging

**Objective:** Verify Standard mode has preset sizes and saved meals

**Prerequisite:** Member with `difficultyMode: "standard"`

**Steps:**
1. Navigate to `/log`
2. Tap "Jeo/la sam"
3. Observe available options

**Expected Results:**
- [ ] Preset sizes visible: S (Small), M (Medium), L (Large)
- [ ] "Sačuvano" (Saved Meals) button visible
- [ ] Macro preview shown when size selected
- [ ] NO custom/exact macro entry fields

**Saved Meals Test:**
1. Tap "Sačuvano" button
2. Select a saved meal (if exists)

**Expected Results:**
- [ ] Saved meals list displayed
- [ ] Selecting logs with saved meal's macros
- [ ] "Kreiraj obrok" link to create new saved meal

**What Should NOT Appear:**
- [ ] Custom calorie input
- [ ] Exact macro entry (P/C/F fields)
- [ ] Coach meals section

---

#### Test M40: Pro Mode Meal Logging

**Objective:** Verify Pro mode has full meal logging features

**Prerequisite:** Member with `difficultyMode: "pro"`

**Steps:**
1. Navigate to `/log`
2. Tap "Jeo/la sam"
3. Observe available options

**Expected Results:**
- [ ] Exact macro entry section visible:
  - Protein (P) input
  - Carbs (C) input
  - Fats (F) input
  - Auto-calculated calories display
- [ ] Saved meals section visible
- [ ] Coach meals section visible (if has coach)
- [ ] "Novi obrok" button to create saved meal

**Exact Macros Test:**
1. Enter: P=30, C=40, F=15
2. Verify calories: (30×4) + (40×4) + (15×9) = 415

**Expected Results:**
- [ ] Calories auto-calculate correctly
- [ ] Meal logs with exact values
- [ ] Success message shown

---

#### Test M41: Mode Transition Preserves Data

**Objective:** Verify changing modes doesn't delete logged data

**Steps:**
1. Login as member (any mode)
2. Log several meals with macros
3. Change difficulty mode (e.g., Pro → Simple)
4. Check history at `/history`

**Expected Results:**
- [ ] All previous logs still visible
- [ ] Macro data preserved in history
- [ ] Calorie totals unchanged
- [ ] Mode change only affects UI, not data

---

### Photo-Based Meal Analysis Testing

#### Test M42: AI Photo Analysis (Standard/Pro Mode)

**Objective:** Verify AI meal photo analysis works

**Prerequisite:** Member with active subscription (not trial)

**Steps:**
1. Navigate to `/log`
2. Tap meal logging option with camera/photo icon
3. Take or select a meal photo
4. Tap "AI Analiza" button

**Expected Results:**
- [ ] AI analysis completes (may take 3-5 seconds)
- [ ] Returns estimated values:
  - Calories
  - Protein, Carbs, Fats
  - Meal description
  - Confidence level (high/medium/low)
- [ ] Values are editable before confirming
- [ ] Remaining uses shown: "(2/3 danas)"

---

#### Test M43: AI Photo Analysis Rate Limiting

**Objective:** Verify photo analysis rate limits

**Test for Trial Member:**
1. Login as trial member
2. Navigate to photo meal logging
3. Check "AI Analiza" button

**Expected Results:**
- [ ] Button disabled or shows "Dostupno za članove"
- [ ] 0 analyses available for trial users

**Test for Active Member:**
1. Login as active subscriber
2. Use AI analysis 3 times in one day

**Expected Results:**
- [ ] First 3 analyses work normally
- [ ] After 3rd: Button disabled
- [ ] Message: "AI analiza nije dostupna (limit 3/dan)"
- [ ] Can still use S/M/L preset estimation

---

#### Test M44: Photo Analysis API

**Objective:** Verify photo analysis API endpoints

**API Tests:**
```bash
# Test 1: Successful analysis
POST /api/ai/analyze-meal-photo
{
  "photo": "data:image/jpeg;base64,...",
  "sizeHint": "medium",
  "goal": "fat_loss"
}
# Expected: 200 { success: true, estimation: {...}, remaining: 2, limit: 3 }

# Test 2: Rate limit exceeded
# (After 3 successful calls in a day)
POST /api/ai/analyze-meal-photo
{ "photo": "...", "sizeHint": "small" }
# Expected: 429 { error: "Daily photo analysis limit reached", remaining: 0, limit: 3 }

# Test 3: Photo too large
POST /api/ai/analyze-meal-photo
{ "photo": "<2MB base64 image>" }
# Expected: 400 { error: "Photo too large. Maximum 1MB." }

# Test 4: Get usage status
GET /api/ai/analyze-meal-photo
# Expected: 200 { used: 1, remaining: 2, limit: 3, available: true }

# Test 5: Trial member (no analyses allowed)
GET /api/ai/analyze-meal-photo  (as trial member)
# Expected: 200 { used: 0, remaining: 0, limit: 0, available: false }
```

---

#### Test M45: Photo Logging Without AI Analysis

**Objective:** Verify photo can be saved without using AI analysis

**Steps:**
1. Navigate to photo meal logging
2. Take/select a photo
3. Select size (S/M/L) for estimation
4. Skip "AI Analiza" - just use preset estimate
5. Confirm meal

**Expected Results:**
- [ ] Photo saved with meal log
- [ ] Macros estimated from size selection
- [ ] No AI usage consumed
- [ ] Meal appears in history with photo

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

#### Test S8: Coach Data Visibility Restrictions

**Objective:** Verify coaches cannot see subscription data

**Steps:**
1. Login as Coach (`S-COACH`)
2. Navigate to `/dashboard`
3. Check dashboard stats

**Expected Results:**
- [ ] NO "expiring subscriptions" section visible
- [ ] NO subscription status badges on member cards
- [ ] Dashboard shows only coaching-relevant data

**API Test (Dashboard):**
1. Call GET `/api/coach/dashboard` as coach
2. Response should NOT include `expiringSubscriptions` object

**API Test (Member Detail):**
1. Call GET `/api/coach/member/[id]` as coach
2. Response should NOT include:
   - `subscribedAt`
   - `subscribedUntil`
   - `subscriptionStatus`

**Comparison Test:**
1. Call same endpoints as Admin
2. Admin response SHOULD include subscription data

---

#### Test S9: Coach Member Detail Filtered Data

**Objective:** Verify coach sees filtered member data

**Prerequisite:** Coach with assigned member

**Steps:**
1. Login as Coach
2. View assigned member details at `/members/[id]`

**Expected Results:**
- [ ] Profile info visible (name, goal, weight)
- [ ] Activity summary visible
- [ ] Consistency score visible
- [ ] NO subscription section
- [ ] NO "Extend subscription" button
- [ ] Coach controls (nudges, AI knowledge) available

**API Response Check:**
```typescript
// Coach sees:
{
  member: {
    id, memberId, name, avatarUrl, goal, weight, height, gender, status, memberSince
    // NO: subscribedAt, subscribedUntil, subscriptionStatus
  },
  isCoach: true,
  snapshot: { ... }
}
```

---

### Session Scheduling (Coach)

#### Test S10: Access Coach Sessions Page

**Objective:** Verify coach can access sessions page

**Steps:**
1. Login as Coach
2. If there are session requests, click the **session requests card** on dashboard
3. Or navigate directly to `/coach-sessions`

**Expected Results:**
- [ ] Sessions page loads successfully
- [ ] Shows list of assigned members
- [ ] Shows "Zakaži termin" button
- [ ] Any pending requests from members are visible

---

#### Test S11: Create Session Request (Coach)

**Objective:** Verify coach can create session requests for assigned members

**Prerequisites:** Coach has at least one assigned member

**Steps:**
1. Navigate to `/coach-sessions`
2. Click **"Zakaži termin"**
3. Select a member from dropdown
4. Fill in session details:
   - Session type: "Trening"
   - Date: Tomorrow or later
   - Time: Any time
   - Duration: 60 minutes
   - Location: "U teretani"
   - Note: "Let's review your progress"
5. Click **"Pošalji zahtev"**

**Expected Results:**
- [ ] Request created successfully
- [ ] Toast shows success message
- [ ] Request appears in pending section

**Edge Cases:**
- Unassigned member → Error "You can only request sessions with your assigned members"
- Date < 24 hours → Error "Termin mora biti zakazan najmanje 24 sata unapred"

---

#### Test S12: Respond to Session Request (Coach)

**Objective:** Verify coach can accept, counter, or decline member requests

**Prerequisite:** Member has sent a session request to coach

**Test Accept:**
1. View the request in pending section
2. Click **"Prihvati"**

**Expected Results:**
- [ ] Session created and confirmed
- [ ] Appears in "Zakazani termini" section

**Test Counter:**
1. View a pending request
2. Click **"Predloži drugo vreme"**
3. Modify date/time/duration/location
4. Click **"Pošalji predlog"**

**Expected Results:**
- [ ] Counter-proposal sent
- [ ] Request shows as waiting for member

**Test Decline:**
1. View a pending request
2. Click **"Odbij"**

**Expected Results:**
- [ ] Request removed from list
- [ ] Status changed to declined

---

#### Test S13: Cancel Confirmed Session (Coach)

**Objective:** Verify coach can cancel confirmed sessions

**Prerequisite:** Coach has a confirmed upcoming session

**Steps:**
1. Find a confirmed session in "Zakazani termini"
2. Click **"Otkaži"**
3. Enter reason (min 10 characters): "Need to reschedule - schedule conflict"
4. Confirm cancellation

**Expected Results:**
- [ ] Session cancelled
- [ ] Session moves to past sessions
- [ ] Status shows "Otkazano"

---

#### Test S14: Complete Session (Coach)

**Objective:** Verify coach can mark sessions as completed

**Prerequisite:** Coach has a past/current confirmed session

**Steps:**
1. Find a session that has already occurred
2. Click **"Završi termin"**

**Expected Results:**
- [ ] Session marked as completed
- [ ] Status shows "Završeno"
- [ ] `completedAt` timestamp recorded

**Edge Case:**
- Future session → Error "Cannot mark future session as completed"

---

#### Test S15: Dashboard Session Requests Card

**Objective:** Verify session requests appear on coach dashboard

**Prerequisite:** Member has sent session request to coach

**Steps:**
1. Navigate to `/dashboard`
2. Look for session requests card

**Expected Results:**
- [ ] Card shows with calendar icon
- [ ] Shows count of pending requests
- [ ] Shows preview of first 2 requests (member name + session type)
- [ ] Clicking navigates to `/coach-sessions`

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

#### Test A3: Gym Branding Management

**Objective:** Verify admin can manage gym branding

**Steps:**
1. Login as Admin (`S-ADMIN`)
2. Navigate to Gym Settings/Branding page
3. Upload a logo (under 2MB)
4. Set primary color using color picker
5. Set secondary color
6. Save changes

**Expected Results:**
- [ ] Logo preview shows uploaded image
- [ ] Color pickers work correctly
- [ ] Branding saved successfully
- [ ] Member app reflects new branding

**Edge Cases to Test:**
- Logo over 2MB → Error "Logo too large (max 2MB)"
- Invalid hex color → Error "Invalid color format"
- Coach trying to access → Error "Admin access required"

---

#### Test A4: Coach Cannot Access Branding

**Objective:** Verify branding is admin-only

**Steps:**
1. Login as Coach (`S-COACH`)
2. Try to access `/api/gym/branding` directly

**Expected Results:**
- [ ] 403 Forbidden
- [ ] Error: "Admin access required"

---

#### Test A5: Coach Performance Dashboard

**Objective:** Verify coach performance analytics display correctly

**Steps:**
1. Login as Admin (`S-ADMIN`)
2. Navigate to `/gym-portal/manage/staff`
3. Click "Performanse trenera" tab

**Expected Results:**
- [ ] Summary cards display (coaches, coached members, uncoached members)
- [ ] Members Per Coach chart renders
- [ ] Consistency Comparison chart renders with color coding
- [ ] Performance table shows coach list

**Expandable Rows:**
1. Click on a coach row with assigned members

**Expected Results:**
- [ ] Row expands to show member cards
- [ ] Each card shows: name, member ID, status badge, consistency %
- [ ] Members sorted by status (off-track first)
- [ ] Click again to collapse

---

#### Test A6: Coach Performance CSV Export

**Objective:** Verify CSV export functionality

**Steps:**
1. Login as Admin
2. Navigate to coach performance tab
3. Click "Preuzmi CSV" button

**Expected Results:**
- [ ] CSV file downloads
- [ ] Filename format: `performanse-trenera-YYYY-MM-DD.csv`
- [ ] Contains all coach data columns
- [ ] Summary section at bottom
- [ ] UTF-8 encoding with BOM (Excel compatible)

---

#### Test A7: Members Page Charts

**Objective:** Verify member analytics charts

**Steps:**
1. Login as Admin
2. Navigate to `/gym-portal/manage/members`
3. Click "Statistika" tab

**Expected Results:**
- [ ] Activity Distribution pie chart renders
- [ ] Goal Distribution bar chart renders
- [ ] Subscription Status pie chart renders
- [ ] Charts update based on member data

---

#### Test A8: Members Page Pagination

**Objective:** Verify pagination functionality

**Steps:**
1. Navigate to members page
2. Ensure "Lista članova" tab is active
3. Test page size selector

**Expected Results:**
- [ ] Default shows 5 members
- [ ] Page size options: 5, 10, 20
- [ ] Changing page size resets to page 1
- [ ] Previous/Next buttons work correctly
- [ ] Displays "X-Y od Z članova" count

---

#### Test A9: Members CSV Export

**Objective:** Verify members CSV export

**Steps:**
1. Navigate to members page
2. Click "Preuzmi CSV" button

**Expected Results:**
- [ ] CSV file downloads
- [ ] Filename format: `clanovi-YYYY-MM-DD.csv`
- [ ] Contains all member columns
- [ ] Goal and status labels in Serbian
- [ ] Summary section at bottom

---

#### Test A10: Staff Tab Navigation

**Objective:** Verify staff page tab switching

**Steps:**
1. Navigate to `/gym-portal/manage/staff`
2. Switch between tabs

**Expected Results:**
- [ ] "Osoblje" tab shows staff table
- [ ] "Performanse trenera" tab shows coach dashboard
- [ ] Active tab highlighted with accent color
- [ ] Content updates without page reload

---

#### Test A11: Challenge List Page

**Objective:** Verify challenges page displays correctly

**Steps:**
1. Login as Admin
2. Navigate to `/gym-portal/manage/challenges`

**Expected Results:**
- [ ] Stats cards show: Total, Active, Ended, Participants
- [ ] Challenge table displays all challenges
- [ ] Status badges with correct colors:
  - Nacrt (gray)
  - Uskoro (amber)
  - Registracija (blue)
  - Aktivno (emerald)
  - Završeno (muted)
- [ ] "Novi izazov" button visible

---

#### Test A12: Create Challenge

**Objective:** Verify challenge creation flow

**Steps:**
1. Navigate to `/gym-portal/manage/challenges`
2. Click "Novi izazov"
3. Fill in form:
   - Name: "Test Izazov"
   - Description: "Test opis"
   - Reward: "Nagrada za test"
   - Start: Tomorrow
   - End: 30 days from now
4. Click "Kreiraj izazov"

**Expected Results:**
- [ ] Modal opens with form fields
- [ ] Date pickers work correctly
- [ ] Point configuration collapsible section
- [ ] Success: Challenge created as "Nacrt" (draft)
- [ ] Challenge appears in table

**Validation Tests:**
- Empty name → Error message
- End date before start → Error message
- Missing required fields → Error messages

---

#### Test A13: Publish Challenge

**Objective:** Verify challenge publishing flow

**Prerequisite:** Draft challenge exists

**Steps:**
1. Navigate to challenge detail page
2. Click "Objavi" button
3. Review confirmation modal
4. Confirm publish

**Expected Results:**
- [ ] "Objavi" button visible for draft challenges
- [ ] Confirmation modal shows:
  - Amber notice if start date is future
  - Blue notice if start date has passed
- [ ] After confirm: Status changes
- [ ] Becomes "Uskoro" or "Registracija" based on date

---

#### Test A14: Challenge Detail Page

**Objective:** Verify challenge detail page

**Steps:**
1. Navigate to `/gym-portal/manage/challenges/[id]`

**Expected Results:**
- [ ] Header shows: Name, status badge, reward
- [ ] Stats cards: Participants, Days left, Top score
- [ ] Tab navigation: "Rang lista" | "Podešavanja"
- [ ] Leaderboard shows participants with:
  - Rank
  - Name
  - Points breakdown
  - Total

---

#### Test A15: End Challenge Early

**Objective:** Verify admin can end challenge manually

**Prerequisite:** Active challenge with participants

**Steps:**
1. Navigate to challenge detail page
2. Click "Završi izazov" button
3. Confirm in modal

**Expected Results:**
- [ ] Confirmation modal warns about freezing leaderboard
- [ ] After confirm: Status becomes "Završeno"
- [ ] Leaderboard remains visible (read-only)
- [ ] "Završi izazov" button disappears

---

#### Test A16: Delete Challenge

**Objective:** Verify draft challenge deletion

**Prerequisite:** Draft challenge with no participants

**Steps:**
1. Navigate to challenge detail page
2. Go to "Podešavanja" tab
3. Click "Obriši izazov"
4. Confirm deletion

**Expected Results:**
- [ ] Delete only available for draft challenges
- [ ] Delete button disabled if participants exist
- [ ] After confirm: Redirected to challenges list
- [ ] Challenge no longer in table

**Edge Cases:**
- Non-draft challenge → Delete button hidden
- Challenge with participants → "Cannot delete" error

---

#### Test A17: Edit Challenge Settings

**Objective:** Verify challenge editing

**Prerequisite:** Draft or registration status challenge

**Steps:**
1. Navigate to challenge detail page
2. Go to "Podešavanja" tab
3. Modify fields (name, dates, points)
4. Save changes

**Expected Results:**
- [ ] Fields editable for draft/registration
- [ ] All point values adjustable
- [ ] Changes saved successfully
- [ ] Active/ended challenges: fields disabled

---

#### Test A18: Gym QR Check-in Management

**Objective:** Verify admin can enable/disable gym check-in with daily rotating codes

**Steps:**
1. Login as Admin (`S-ADMIN`)
2. Navigate to gym check-in settings
3. Click "Aktiviraj" to enable check-in

**Expected Results:**
- [ ] New master secret generated (stored internally)
- [ ] Daily code displayed (8-char uppercase, e.g., `A3F2B1C9`)
- [ ] Countdown to next code rotation shown
- [ ] QR code can be generated from daily code
- [ ] Stats display: Today's check-ins, Total check-ins

**Daily Code Display:**
- Admin sees current daily code (not the master secret)
- Shows time until next rotation (e.g., "5h 23m")
- Code changes automatically at midnight UTC

**API Tests:**

```bash
# Test 1: Get check-in settings (returns daily code, not master secret)
GET /api/admin/gym-checkin
# Expected: 200 { hasSecret: true/false, dailyCode: "A3F2B1C9", nextRotation: "5h 23m", stats: {...} }

# Test 2: Generate new master secret (all daily codes change)
POST /api/admin/gym-checkin
# Expected: 200 { success: true, dailyCode: "<new-daily-code>", nextRotation: "..." }

# Test 3: Disable check-in
DELETE /api/admin/gym-checkin
# Expected: 200 { success: true, message: "Sistem prijave je deaktiviran" }

# Test 4: Unauthorized access (coach)
GET /api/admin/gym-checkin  (as coach)
# Expected: 403 { error: "Admin access required" }
```

**Edge Cases:**
- Coach accessing → 403 "Admin access required"
- No session → 401 "Unauthorized"
- Gym not found → 404 "Gym not found"

---

#### Test A19: Regenerate Master Secret

**Objective:** Verify admin can regenerate master secret (all daily codes change)

**Steps:**
1. Enable check-in if not enabled
2. Note current daily code
3. Click "Regeneriši" to generate new master secret
4. Verify old daily code no longer works

**Expected Results:**
- [ ] New master secret generated (internal)
- [ ] New daily code displayed (different from before)
- [ ] Old daily code immediately invalidated
- [ ] Member check-ins with old code fail: "Nevažeći ili istekao kod za prijavu"
- [ ] New QR code displays with new daily code

**Note:** Regenerating the master secret invalidates ALL daily codes immediately. This is different from natural daily rotation which happens at midnight UTC.

---

#### Test A20: Pending Meals Page

**Objective:** Verify admin can view pending meal share requests

**Steps:**
1. Login as Admin (`S-ADMIN`)
2. Navigate to `/gym-portal/manage`
3. Click **"Obroci na čekanju"** in Quick Actions

**Expected Results:**
- [ ] Pending meals page loads at `/gym-portal/manage/pending-meals`
- [ ] Grid displays meals awaiting approval
- [ ] Each card shows:
  - 4:3 aspect ratio photo
  - Meal name and calories
  - Macros (P/C/F)
  - Ingredient list (first 3 + count)
  - Member name and ID
  - Request timestamp
- [ ] Approve/Reject buttons visible

**Empty State:**
- [ ] When no pending meals: Shows "Nema obroka na čekanju" message

---

#### Test A21: Approve Shared Meal

**Objective:** Verify admin can approve a meal share request

**Prerequisite:** Member has submitted a meal for sharing (with photo)

**Steps:**
1. Navigate to `/gym-portal/manage/pending-meals`
2. Find a pending meal
3. Click **"Odobri"** (Approve)

**Expected Results:**
- [ ] Meal removed from pending list
- [ ] Meal now visible in gym's shared meals
- [ ] Member can see their meal in "Deljeni" tab with approved status

**API Test:**
```bash
POST /api/admin/pending-shares
{ "mealId": "meal-id", "action": "approve" }
# Expected: 200 { success: true, message: "Share request approved" }
```

---

#### Test A22: Reject Shared Meal

**Objective:** Verify admin can reject a meal share request

**Prerequisite:** Member has submitted a meal for sharing (with photo)

**Steps:**
1. Navigate to `/gym-portal/manage/pending-meals`
2. Find a pending meal
3. Click **"Odbij"** (Reject)

**Expected Results:**
- [ ] Meal removed from pending list
- [ ] Meal returns to member's private meals
- [ ] Meal no longer marked as shared

**API Test:**
```bash
POST /api/admin/pending-shares
{ "mealId": "meal-id", "action": "reject" }
# Expected: 200 { success: true, message: "Share request rejected" }
```

**Verification:**
- Member's meal has: `isShared: false`, `shareApproved: false`

---

#### Test A23: Pending Meals API Authorization

**Objective:** Verify only admins can access pending shares

**API Tests:**
```bash
# Test 1: Unauthenticated access
GET /api/admin/pending-shares
# Expected: 401 { error: "Unauthorized" }

# Test 2: Coach access (not admin)
GET /api/admin/pending-shares  (as coach)
# Expected: 403 { error: "Only admins can manage share requests" }

# Test 3: Member access
GET /api/admin/pending-shares  (as member)
# Expected: 401 { error: "Unauthorized" }

# Test 4: Invalid action
POST /api/admin/pending-shares
{ "mealId": "id", "action": "invalid" }
# Expected: 400 { error: "Invalid request. Must provide mealId and action (approve/reject)" }
```

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
| `/api/member/profile` | GET | Profile data, coach settings, custom targets, coach info, difficulty mode |
| `/api/member/profile` | PATCH | Goal change, locale, weight, custom targets, difficulty mode, 403 if has coach (for targets) |
| `/api/member/subscription` | GET | Trial, active, expired status |
| `/api/member/nudges` | GET | Unread nudges |
| `/api/member/meals` | GET | Own meals, coach meals, shared meals with photos |
| `/api/member/meals` | POST | Create meal, photo validation, share requires photo |
| `/api/member/meals/[id]` | PATCH | Update meal, photo update, auto-unshare on photo removal |
| `/api/member/meals/[id]` | DELETE | Delete own meal |
| `/api/member/meals/copy` | POST | Copy shared meal with photo |

### Staff Endpoints

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/members` | POST | Register with required fields, all fields, ID collision |
| `/api/members` | GET | List with activity status |
| `/api/members/[id]` | GET | Member detail |

### Gym Endpoints (Admin Only)

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/gym/settings` | GET | Unauthenticated (empty), member (branding only), staff (full stats) |
| `/api/gym/branding` | GET | Auth required, admin only (403 for coach), returns branding |
| `/api/gym/branding` | PUT | Color validation, logo size limit, successful update |
| `/api/admin/coach-performance` | GET | Admin only, returns coaches with stats, assigned members, nudge data |
| `/api/admin/pending-shares` | GET | Admin only, get pending meal share requests with photos |
| `/api/admin/pending-shares` | POST | Approve/reject share request, validate action, 403 for coach |

### Challenge Endpoints (Admin)

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/admin/challenges` | GET | List all challenges for gym |
| `/api/admin/challenges` | POST | Create challenge, validate dates, check for existing active |
| `/api/admin/challenges/[id]` | GET | Challenge detail with leaderboard |
| `/api/admin/challenges/[id]` | PATCH | Update fields, publish (action: publish), end (action: end) |
| `/api/admin/challenges/[id]` | DELETE | Delete draft only, fail if participants exist |

### Challenge Endpoints (Member)

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/member/challenge` | GET | Active challenge, participation status, leaderboard, gymCheckinRequired, checkedInToday |
| `/api/member/challenge` | POST | Join challenge, fail if already joined, fail if deadline passed |

### Gym Check-in Endpoints (Admin)

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/admin/gym-checkin` | GET | Get daily code + rotation time + stats, 403 for coach |
| `/api/admin/gym-checkin` | POST | Generate new master secret, returns new daily code |
| `/api/admin/gym-checkin` | DELETE | Disable check-in, removes secret |

### Gym Check-in Endpoints (Member)

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/member/gym-checkin` | GET | Check-in status, active challenge info |
| `/api/member/gym-checkin` | POST | Valid daily code, invalid/expired code, already checked in, grace period |

### Session Scheduling Endpoints (Member)

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/member/sessions` | GET | Requests, upcoming, past sessions, coach info |
| `/api/member/sessions` | POST | Create request, validate 24h advance, require coach |
| `/api/member/sessions/requests/[id]` | POST | Accept (creates session), counter (new proposal), decline |
| `/api/member/sessions/[id]/cancel` | POST | Cancel with reason (min 10 chars), validate session exists |

### Session Scheduling Endpoints (Coach)

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/coach/sessions` | GET | Requests, upcoming, past sessions, assigned members list |
| `/api/coach/sessions` | POST | Create request for assigned member, validate assignment, 24h advance |
| `/api/coach/sessions/requests/[id]` | POST | Accept (creates session), counter, decline |
| `/api/coach/sessions/[id]/cancel` | POST | Cancel with reason (min 10 chars) |
| `/api/coach/sessions/[id]/complete` | POST | Mark as completed, validate session is in past |

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
| `/api/ai/analyze-meal-photo` | GET | Get usage status, remaining analyses |
| `/api/ai/analyze-meal-photo` | POST | Analyze photo, rate limit (3/day active, 0 trial), photo size validation |

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

*Last Updated: January 2026*
*Added: Difficulty Mode tests (M36-M41) - mode selection, per-mode meal logging, data preservation*
*Added: Photo-Based Meal Analysis tests (M42-M45) - AI analysis, rate limiting, API endpoints*
*Added: Photo Analysis API endpoints to reference*
*Added: Difficulty mode to member profile API endpoints*
*Previously Added: Meal Photos tests (M26-M31) - photo upload, validation, sharing requirements*
*Previously Added: Admin Pending Meals tests (A20-A23) - approval queue and authorization*
*Previously Added: Meal API endpoints to reference*
*Previously Added: Daily rotating codes for Gym QR Check-in (M24, A18, A19)*
*Previously Added: Gym QR Check-in tests (M24, M25, A18, A19)*
*Previously Added: Gym Check-in API endpoints to reference*
*Previously Added: Challenge/Game System tests (M16-M21, A11-A17)*
*Previously Added: Coach Performance Dashboard tests (A5, A6)*
*Previously Added: Member analytics and pagination tests (A7, A8, A9, A10)*
*Previously Added: Custom nutrition targets tests (M14, M15)*

---

## Appendix: Coach Performance API Tests

Manual API testing for `/api/admin/coach-performance`:

```bash
# Test 1: Unauthorized access (no session)
curl -X GET http://localhost:3000/api/admin/coach-performance
# Expected: 401 Unauthorized

# Test 2: Coach access (should fail - admin only)
# Login as coach first, then:
curl -X GET http://localhost:3000/api/admin/coach-performance \
  -H "Cookie: session=<coach-session-cookie>"
# Expected: 403 Admin access required

# Test 3: Admin access (should succeed)
# Login as admin first, then:
curl -X GET http://localhost:3000/api/admin/coach-performance \
  -H "Cookie: session=<admin-session-cookie>"
# Expected: 200 with coaches array and summary object
```

**Expected Response Structure:**
```json
{
  "coaches": [
    {
      "id": "coach-id",
      "staffId": "S-COACH",
      "name": "Coach Name",
      "assignedMemberCount": 5,
      "pendingRequestCount": 2,
      "assignedMembers": [
        {
          "id": "member-id",
          "memberId": "MBR001",
          "name": "Member Name",
          "status": "on_track",
          "consistencyScore": 75
        }
      ],
      "nudgeStats": {
        "totalSent": 10,
        "totalViewed": 8,
        "viewRate": 80
      },
      "memberOutcomes": {
        "onTrack": 3,
        "slipping": 1,
        "offTrack": 1,
        "avgConsistencyScore": 68
      }
    }
  ],
  "summary": {
    "totalCoaches": 3,
    "totalCoachedMembers": 15,
    "uncoachedMembers": 5,
    "overallMemberStatus": {
      "onTrack": 8,
      "slipping": 4,
      "offTrack": 3
    }
  }
}
```
