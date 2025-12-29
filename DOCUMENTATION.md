# Gym Intelligence System - Documentation

A digital accountability and guidance system for gym members and staff.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Running the Application](#running-the-application)
5. [Staff Guide](#staff-guide)
   - [Coach Assignment](#coach-assignment)
   - [Require Exact Macros](#require-exact-macros-feature)
   - [Coach Nudges](#coach-nudges)
6. [Member Guide](#member-guide)
   - [Home Screen](#home-screen)
   - [Progress Page](#progress-page)
   - [Meal Logging Modes](#log-a-meal)
7. [API Reference](#api-reference)
8. [Configuration](#configuration)

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Anthropic API key (for AI features)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate
```

---

## Environment Setup

Create a `.env` file in the project root:

```env
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/gym_intelligence?schema=public"

# Authentication secret (min 32 characters)
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"

# Anthropic API key for AI chat features
ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Database Setup

### Create Tables

```bash
# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Or push schema directly (for development)
npx prisma db push
```

### Seed Initial Data

You'll need to create at least one Gym and one Staff member to get started:

```bash
npx prisma studio
```

Then manually create:

1. **Gym** - Add a gym with name and empty settings `{}`
2. **Staff** - Add a staff member with:
   - `staffId`: e.g., "S-ADMIN"
   - `pin`: Hash a PIN using the app (or use bcrypt directly)
   - `role`: "admin"
   - `gymId`: The gym ID you created

Alternatively, create a seed script at `prisma/seed.ts`.

---

## Running the Application

### Development

```bash
npm run dev
```

App runs at `http://localhost:3000`

### Production

```bash
npm run build
npm start
```

---

## Staff Guide

### Logging In

1. Go to `/staff-login`
2. Enter your Staff ID (e.g., `S-AB12`)
3. Enter your 4-digit PIN

### Dashboard

After login, you'll see the **Staff Dashboard** with:

- **Stats cards**: Total members, Active, Slipping, Inactive
- **Filter buttons**: Filter members by activity status
- **Member list**: Click any member to view details

#### Activity Status Definitions

| Status | Meaning |
|--------|---------|
| Active | 3+ logs in the last 7 days |
| Slipping | Some activity in last 30 days, but <3 logs in last week |
| Inactive | No activity in last 30 days |

### Registering a New Member

1. Click **"Register New Member"** button
2. Fill in the form:
   - **Name** (required): Member's name or nickname
   - **Height** (optional): In centimeters
   - **Weight** (optional): In kilograms
   - **Gender** (optional): Male, Female, or Other
   - **Goal** (required): Fat Loss, Muscle Gain, or Recomposition
3. Click **"Register Member"**
4. Share the credentials with the member:
   - **Member ID**: 6-character code (e.g., `ABC123`)
   - **PIN**: 4-digit code
   - **QR Code**: For quick login

### Viewing Member Details

Click on any member in the list to see:

- Profile information and goals
- Consistency streak
- Activity summary (meals, training, water logs)
- Weight progress from weekly check-ins
- AI-generated summaries

### Coach Assignment

Staff members can assign themselves as a coach to gym members for personalized tracking:

1. During **registration** or in **member details**, choose "Assign as Coach"
2. Select a member from the unassigned members list
3. Configure optional custom targets:
   - **Custom Goal**: Override the member's selected goal
   - **Custom Calories**: Set a specific daily calorie target
   - **Custom Protein/Carbs/Fats**: Set specific macro targets (grams)
   - **Notes**: Add initial coaching notes
4. Toggle **"Require Exact Macros"** if you want the member to enter P/C/F for every meal
5. Click "Dodeli člana" to complete the assignment

**Important:** One member can only have one coach. If macros are entered, calories are auto-calculated using the formula: `Calories = (P × 4) + (C × 4) + (F × 9)`

### Require Exact Macros Feature

When enabled for a member:

- The member **must** enter Protein, Carbs, and Fats for every meal
- Calories are automatically calculated from the macros
- The member cannot use preset meal sizes (Small/Medium/Large)
- This is useful for members who need strict macro tracking

### Coach Nudges

Send accountability messages to your assigned members:

1. Go to the member's detail page
2. Find the "Send Nudge" option
3. Enter a motivational or accountability message
4. Click Send

The member will see the nudge as a banner on their home screen. Once they tap it, it's marked as seen.

---

## Member Guide

### Logging In

1. Go to `/login` (or scan your QR code)
2. Enter your Member ID
3. Enter your 4-digit PIN

### Home Screen

Your home screen shows **daily metrics only** for a focused, simplified view:

| Section | Description |
|---------|-------------|
| Training Status | ✓ (completed) or — (not yet trained today) |
| Water Intake | Shows as X/8 format (e.g., "3/8" glasses) |
| Meals Logged | Count of meals logged today |
| Coach Nudge | Banner at top if your coach sent you a message (tap to dismiss) |

**Quick Actions Grid (2x3):**

| Button | Destination | Description |
|--------|-------------|-------------|
| AI | `/chat` | Ask the AI coach questions |
| Pregled | `/checkin` | Weekly check-in |
| Istorija | `/history` | View 30-day activity calendar |
| Članarina | `/subscription` | View trial/subscription status |
| Suplementi | `/supplements` | Goal-based supplement recommendations |
| Cilj | `/goal` | Change your fitness goal |

**Profile Access:** Tap your avatar (initials) at the top to access your profile and logout.

### Progress Page

For detailed tracking, visit the **Progress page** (`/progress`):

| Section | Description |
|---------|-------------|
| Calorie Ring | Circular progress showing calories consumed vs target |
| Macro Balance | Three progress bars for Protein, Carbs, Fats with color indicators |
| Consistency Score | 0-100 score based on training, logging, and adherence |

**Consistency Score Components:**

| Component | Max Points |
|-----------|------------|
| Training sessions | 30 points |
| Logging consistency | 20 points |
| Calorie adherence | 25 points |
| Protein adherence | 15 points |
| Water consistency | 10 points |

### Logging Actions

Tap **"Log Something"** to access logging options:

#### Log a Meal

There are three ways to log a meal, depending on your settings:

**Standard Mode (Preset Sizes):**

1. Tap **"I ate"**
2. Select meal size: Small, Medium, Large, or Tačno (Custom)
3. **View the macro preview** - shows estimated calories, protein, carbs, and fats
4. Optionally add what you ate
5. Tap **"Log meal"**

**Calorie estimates by goal:**

| Goal | Small | Medium | Large |
|------|-------|--------|-------|
| Fat Loss | ~300 cal | ~500 cal | ~750 cal |
| Recomposition | ~350 cal | ~600 cal | ~900 cal |
| Muscle Gain | ~400 cal | ~700 cal | ~1000 cal |

**Custom Mode:**

1. Select **"Tačno" (Custom)** from the meal size options
2. Enter your exact **Calories** (required)
3. Optionally enter **Protein** in grams
4. Add meal name if desired
5. Tap **"Log meal"**

**Exact Macros Mode (Coach-Required):**

If your coach has enabled "Require Exact Macros" for you:

1. Tap **"I ate"**
2. You'll see three input fields: **Proteini (g)**, **UH (g)** (Carbs), **Masti (g)** (Fats)
3. Enter all three values (required)
4. Watch the **auto-calculated calories** appear: `= P×4 + C×4 + F×9`
5. Add meal name if desired
6. Tap **"Log meal"**

**Note:** In exact macros mode, you cannot use preset meal sizes. This mode is for members who need strict macro tracking.

**Macro breakdown preview:** When you select a preset meal size, the app shows:
- Estimated calories (kcal)
- Protein (g) - shown in green
- Carbs (g) - shown in yellow
- Fats (g) - shown in accent color

These estimates are calculated based on your current goal and the macro splits defined for each goal type.

#### Log Training

Tap **"I trained"** - single tap, no details needed.

#### Log Water

Tap **"Drank water"** - adds one glass. Tap multiple times for more.

### Weekly Check-In

Once per week, complete a check-in:

1. Go to `/checkin`
2. Enter your current weight
3. Select how you're feeling (emoji scale)
4. Submit

This helps track your progress over time.

### AI Chat

Get personalized guidance:

1. Go to `/chat`
2. Choose a suggested question or type your own
3. Get AI-powered advice based on your data

**Example questions:**
- "Why is my progress slow?"
- "What should I focus on this week?"
- "Is my macro balance okay?"

**Note:** The AI provides general guidance only, not medical advice.

### History

View your 30-day activity calendar:

1. Go to `/history`
2. See a color-coded calendar:
   - **Empty (dark)**: No logs that day
   - **Yellow**: Some activity logged
   - **Green**: Good activity (meals + training)
   - **Bright green with ring**: Excellent day (training + 2+ meals + 4+ water)
3. Tap any day to see detailed stats:
   - Calories and protein consumed
   - Training status
   - Meal count
   - Water glasses
4. View 30-day summary stats at the bottom

### Subscription/Membership

View your trial or subscription status:

1. Go to `/subscription`
2. See your current status:
   - **Trial Period**: 7-day free trial with progress bar
   - **Active**: Paid subscription with end date
   - **Expired**: Subscription ended, contact gym
   - **Cancelled**: Membership cancelled
3. Trial progress shows current day (Dan 1-7) and days remaining
4. Warning appears when trial/subscription is about to expire

**Subscription statuses:**

| Status | Description |
|--------|-------------|
| `trial` | 7-day free trial period |
| `active` | Paid subscription is active |
| `expired` | Subscription has ended |
| `cancelled` | Membership was cancelled |

### Supplements

Get personalized supplement recommendations:

1. Go to `/supplements`
2. See recommendations based on your current goal
3. Supplements are categorized as:
   - **Recommended (⭐)**: Essential for your goal
   - **Optional (💡)**: Helpful but not critical
4. Tap any supplement to expand and see:
   - Timing: When to take it
   - Dosage: How much
   - Benefits: What it does for you

**Categories:**

| Category | Color | Purpose |
|----------|-------|---------|
| Essential | Green | Core supplements for your goal |
| Performance | Accent | Enhance workout performance |
| Recovery | Purple | Support muscle recovery |
| Health | Blue | General health benefits |

### Goal Settings

Change your fitness goal:

1. Go to `/goal`
2. See the three goal options with descriptions:
   - **Gubitak masnoće (Fat Loss)**: Calorie deficit, high protein
   - **Rekompozicija (Recomposition)**: Maintain calories, balanced macros
   - **Rast mišića (Muscle Gain)**: Calorie surplus, higher carbs
3. Each option shows:
   - Macro split (P/C/F percentages)
   - Calorie approach (deficit/maintenance/surplus)
4. Select a new goal and tap "Sačuvaj promene"
5. Your daily targets will update automatically

### Profile

Access your profile and account settings:

1. Tap your avatar (initials) on the home screen
2. View your profile information:
   - Name and Member ID
   - Current goal
   - Weight and height (if provided)
3. Quick links to change goal and view membership
4. **Logout button** at the bottom to sign out

---

## API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Member login |
| `/api/auth/staff-login` | POST | Staff login |
| `/api/auth/logout` | POST | Logout |

### Logs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/logs` | POST | Create a log (meal, training, water) |
| `/api/logs` | GET | Get today's logs |
| `/api/logs?days=30` | GET | Get aggregated logs for history view |

### Member Profile

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/member/profile` | GET | Get current member's profile |
| `/api/member/profile` | PATCH | Update member profile (e.g., goal) |
| `/api/member/subscription` | GET | Get subscription/trial status |

### Check-ins

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/checkins` | POST | Submit weekly check-in |
| `/api/checkins` | GET | Get check-in status |

### Members (Staff only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/members` | POST | Register new member |
| `/api/members` | GET | List all members |
| `/api/members/[id]` | GET | Get member details |

### AI

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/chat` | POST | Send message to AI coach |

### Coach Assignment (Staff only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/coach/assignments` | POST | Assign coach to member with custom targets |
| `/api/coach/assignments/:id` | PATCH | Update coach assignment settings |
| `/api/coach/unassigned-members` | GET | List members without a coach |

**POST `/api/coach/assignments` body:**

```json
{
  "memberId": "member-cuid",
  "customGoal": "fat_loss",       // Optional
  "customCalories": 1800,         // Optional
  "customProtein": 150,           // Optional
  "customCarbs": 180,             // Optional
  "customFats": 60,               // Optional
  "notes": "Initial notes",       // Optional
  "requireExactMacros": true      // Optional, default false
}
```

### Coach Nudges

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/coach/nudges` | POST | Send nudge to assigned member (Staff) |
| `/api/member/nudges` | GET | Get unread nudges (Member) |
| `/api/member/nudges/:id/seen` | PATCH | Mark nudge as seen (Member) |

---

## Configuration

### Gym Settings

The `settings` JSON field on the Gym model can store:

```json
{
  "primaryMetric": "calories",  // or "protein"
  "branding": {
    "name": "Classic Gym",
    "accentColor": "#dc2626"
  }
}
```

### Goal-Based Calculations

Daily calorie targets are calculated as:

| Goal | Formula |
|------|---------|
| Fat Loss | Body weight (lbs) × 10-12 |
| Recomposition | Body weight (lbs) × 13-15 |
| Muscle Gain | Body weight (lbs) × 16-18 |

Macro splits:

| Goal | Protein | Carbs | Fats |
|------|---------|-------|------|
| Fat Loss | 40% | 30% | 30% |
| Recomposition | 35% | 40% | 25% |
| Muscle Gain | 30% | 45% | 25% |

---

## Troubleshooting

### "Invalid Member ID or PIN"

- Check the Member ID is entered correctly (case-insensitive)
- Verify the PIN is correct
- Contact staff if issues persist

### AI Chat Not Responding

- Check `ANTHROPIC_API_KEY` is set in `.env`
- Verify API key is valid
- Check server logs for errors

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check network/firewall settings

---

## Security Notes

- PINs are hashed with bcrypt before storage
- Sessions use JWT with HTTP-only cookies
- No email or password storage
- Minimal personal data collected
- GDPR-compliant design

---

## Support

For issues or questions:
- Check this documentation
- Review server logs
- Contact the development team
