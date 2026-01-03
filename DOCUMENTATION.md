# Gym Intelligence System - Documentation

A digital accountability and guidance system for gym members and staff.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Running the Application](#running-the-application)
5. [Admin Guide (Gym Portal)](#admin-guide-gym-portal)
   - [Logging In as Admin](#logging-in-as-admin)
   - [Admin Dashboard](#admin-dashboard)
   - [Member Management](#member-management)
   - [Staff Management](#staff-management)
   - [Gym Branding](#gym-branding)
6. [Coach Guide](#coach-guide)
   - [Logging In as Coach](#logging-in-as-coach)
   - [Coach Dashboard](#coach-dashboard)
   - [Personal Fitness Tracking (Dual-Role)](#personal-fitness-tracking-dual-role)
   - [Coach Assignment](#coach-assignment)
   - [Coach Request Flow](#coach-request-flow)
   - [Require Exact Macros](#require-exact-macros-feature)
   - [Coach Nudges](#coach-nudges)
   - [Per-Member AI Knowledge](#per-member-ai-knowledge)
   - [Coach Meal Creation](#coach-meal-creation)
7. [Member Guide](#member-guide)
   - [Custom Meal System](#custom-meal-system)
   - [Coach Meals](#coach-meals)
   - [Browse and Request Coaches](#browse-and-request-coaches)
   - [Home Screen](#home-screen)
   - [Progress Page](#progress-page)
   - [Custom Nutrition Targets](#custom-nutrition-targets)
   - [Meal Logging Modes](#log-a-meal)
   - [AI Agents](#ai-agents)
   - [Weekly Check-In](#weekly-check-in)
8. [API Reference](#api-reference)
9. [Configuration](#configuration)

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

## Admin Guide (Gym Portal)

Administrators use the **Gym Portal** at `/gym-portal/manage` - a desktop-first interface for comprehensive gym management.

### Logging In as Admin

1. Go to `/staff-login`
2. Enter your Staff ID (e.g., `S-ADMIN`)
3. Enter your 4-digit PIN
4. **Admins are automatically redirected to `/gym-portal/manage`**

> **Note:** Admins cannot access the coach dashboard at `/dashboard`. If you try to navigate there, you'll be redirected back to the Gym Portal.

### Admin Dashboard

The admin dashboard at `/gym-portal/manage` shows:

- **Gym subscription status** and expiration
- **Stats cards**: Total members, Active members, Total staff, Coaches
- **Quick action buttons**: Members, Staff, Branding

### Member Management

Access the full member list at `/gym-portal/manage/members`:

The members page has a **tabbed interface**:

#### Tab 1: Lista članova (Member List)
- **Stats cards**: Total, Active, Expiring Soon, Expired
- **Search** members by name or member ID
- **Filter by**:
  - Goal (Fat Loss, Muscle Gain, Recomposition)
  - Activity status (Active, Slipping, Inactive)
  - Subscription status (Active, Expiring, Expired)
- **Sort by**: Name, Created date, Subscription expiry
- **View subscription status** for each member
- **Pagination**: Default 5 per page (options: 5, 10, 20)
- Click any member to see details

#### Tab 2: Statistika (Member Analytics)
View member statistics with visual charts:

**Charts (Recharts):**
1. **Activity Distribution** - Pie chart showing:
   - Active members (green)
   - Slipping members (yellow)
   - Inactive members (red)

2. **Goal Distribution** - Horizontal bar chart showing:
   - Fat Loss (orange)
   - Muscle Gain (blue)
   - Recomposition (purple)

3. **Subscription Status** - Pie chart showing:
   - Active subscriptions (green)
   - Expiring soon (yellow)
   - Expired (red)

**CSV Export:**
Click "Preuzmi CSV" button to download member data:
- Member name and ID
- Goal and activity status
- Subscription status and end date
- Assigned coach (if any)
- Summary totals at the end

#### Registering a New Member (Admin)

1. Go to `/gym-portal/manage/members/new`
2. Fill in the form:
   - **Name** (required): Member's name or nickname
   - **Height** (optional): In centimeters
   - **Weight** (optional): In kilograms
   - **Gender** (optional): Male, Female, or Other
   - **Goal** (required): Fat Loss, Muscle Gain, or Recomposition
3. Click **"Registruj člana"**
4. Share the credentials with the member:
   - **Member ID**: 6-character code
   - **PIN**: 4-digit code
   - **QR Code**: For quick login

#### Member Subscription Management

View and extend member subscriptions at `/gym-portal/manage/members/[id]`:

1. See current subscription status (Active, Expired, Expiring)
2. Click **"Produži"** to extend subscription
3. Choose duration: 1, 3, 6, or 12 months
4. Or use custom date picker for specific end date

### Staff Management

Manage gym staff at `/gym-portal/manage/staff`:

The staff page has a **tabbed interface**:

#### Tab 1: Osoblje (Staff List)
- **Table view** with all staff members
- **Search** by name or Staff ID
- **Filter by role**: All, Coaches, Admins
- **Pagination**: 10 per page with navigation
- View assigned member count per coach
- **Add new staff**: Click "Dodaj novog člana osoblja"
  - Enter name
  - Select role (Coach or Admin)
  - Credentials are auto-generated (Staff ID + PIN)

#### Tab 2: Performanse trenera (Coach Performance Dashboard)

View comprehensive coach analytics:

**Summary Cards:**
- Total coaches in gym
- Members with coaches (coached)
- Members without coaches (uncoached)
- Overall member status breakdown

**Charts (Recharts):**
1. **Members Per Coach** - Vertical bar chart showing member distribution
2. **Consistency Comparison** - Horizontal bar chart comparing coach performance
   - Green (≥70%): Good performance
   - Yellow (≥40%): Average performance
   - Red (<40%): Needs attention

**Performance Table:**
- **Sortable columns**: Name, Members, Consistency, Nudge Rate
- **Search**: Filter coaches by name
- **Expandable rows**: Click any coach row to see their assigned members
  - Shows member cards with: name, ID, status badge, consistency score
  - Members sorted by status (off-track first for quick identification)
- **Pagination**: 10 coaches per page

**CSV Export:**
Click "Preuzmi CSV" to download performance data including:
- Coach name and Staff ID
- Member count and pending requests
- Nudge stats (sent, viewed, view rate)
- Member outcomes (on track, slipping, off track)
- Average consistency score
- Summary totals at the end

### Gym Branding

Customize your gym's appearance at `/gym-portal/manage/branding`:

1. **Logo upload**: Click to upload your gym logo (max 2MB)
2. **Primary color**: Use the color picker to set your accent color
3. Click **"Sačuvaj promene"** to save

**How branding works:**
- Custom colors apply to **members** and **coaches** after login
- **Login pages always use default colors** (red accent)
- Logo appears in member and coach headers

---

## Coach Guide

Coaches use the **Dashboard** at `/dashboard` - a mobile-first interface for day-to-day member coaching.

### Logging In as Coach

1. Go to `/staff-login`
2. Enter your Staff ID (e.g., `S-AB12`)
3. Enter your 4-digit PIN
4. **Coaches are automatically redirected to `/dashboard`**

> **Note:** Coaches cannot access the admin Gym Portal at `/gym-portal/manage`. If you try to navigate there, you'll be redirected back to the Dashboard.

### Coach Dashboard

After login, you'll see the **Coach Dashboard** with:

- **Stats cards**: Assigned members, Active, Slipping, Inactive
- **Filter buttons**: Filter your assigned members by activity status
- **Member list**: Click any member to view details
- **Pending requests**: Member requests awaiting your response

#### Activity Status Definitions

| Status | Meaning |
|--------|---------|
| Active | 3+ logs in the last 7 days |
| Slipping | Some activity in last 30 days, but <3 logs in last week |
| Inactive | No activity in last 30 days |

### Viewing Member Details

Click on any member in your list to see:

- Profile information and goals
- Consistency streak
- Activity summary (meals, training, water logs)
- Weight progress from weekly check-ins
- AI-generated summaries

### Personal Fitness Tracking (Dual-Role)

Coaches can track their own fitness progress using the same member features:

**Setting Up Your Personal Account:**

1. On the dashboard header, click **"Moj nalog"** (or the + icon if not set up yet)
2. If you don't have a linked member account, a setup modal appears:
   - **Select your goal**: Fat Loss, Muscle Gain, or Recomposition
   - **Enter your weight** (optional): Current weight in kg
3. Click **"Kreiraj nalog"**

**How It Works:**

- Uses the **same PIN** as your staff account (no additional login needed)
- Your member account gets **free subscription** (no 5€/month fee)
- Access all member features: meal logging, AI chat, progress tracking, check-ins
- Click **"Moj nalog"** button anytime to switch to member view

**Switching Between Views:**

| View | How to Access |
|------|---------------|
| Coach Dashboard | Click logout icon → login as staff, or navigate to `/dashboard` |
| Member Home | Click "Moj nalog" button in dashboard header |

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/staff/member-account` | GET | Check if staff has linked member |
| `/api/staff/member-account` | POST | Create or link member account |
| `/api/staff/member-account` | DELETE | Unlink member account |

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

### Coach Request Flow

The coach-member relationship follows a specific flow with two types of requests:

**Member-Initiated Requests (Interest Signals):**

When a member browses coaches and sends a request:
1. Member goes to `/find-coach` and clicks "Pošalji zahtev" on a coach
2. Creates a `CoachRequest` with `initiatedBy: "member"`
3. Coach sees notification in their dashboard under "Zahtevi članova"
4. This is just an **interest signal** - member is saying "I'd like to work with you"
5. Coach accepts/declines the notification (this is a meeting acknowledgment)
6. After accepting, the coach should meet the member in person

**Coach-Initiated Requests (Formal Plans):**

After the meeting, coach sends a formal request with a plan:
1. Coach goes to `/register` and finds the member
2. Clicks "Dodeli člana" and configures:
   - Custom goal, calories, macros
   - Optional notes
   - Require exact macros toggle
3. Creates a `CoachRequest` with `initiatedBy: "coach"`
4. **Member sees this on their home screen** as "Coach X želi da postane tvoj trener"
5. Member reviews the proposed plan and accepts/declines
6. If accepted: `CoachAssignment` is created, member's progress is reset

**Key Differences:**

| Type | Who Sees It | Action Required | Creates Assignment |
|------|-------------|-----------------|-------------------|
| Member-initiated | Coach dashboard | Meeting acknowledgment | No |
| Coach-initiated | Member home screen | Accept/decline plan | Yes (on accept) |

**Edge Cases:**

- If member sends interest to Coach A, Coach A can still send them a formal plan (replaces the interest signal)
- If member has pending coach-initiated request, other coaches cannot send requests
- Member can only have one pending request at a time

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

### Per-Member AI Knowledge

Customize how AI agents respond to specific members:

1. Go to the member's detail page
2. Scroll to **"AI Podešavanja"** section
3. You'll see three agent cards:
   - **Ishrana (Nutrition)** - emerald/green theme
   - **Suplementi (Supplements)** - violet/purple theme
   - **Trening (Training)** - orange theme
4. Click any agent card to open the knowledge editor
5. Enter your guidelines for this member (max 2000 characters)
6. Click **"Sačuvaj"** to save

**Status Indicators:**
- Colored dot (emerald/violet/orange) = Guidelines configured
- Gray dot = No guidelines set

**Example Guidelines:**

**Nutrition:**
```
- Preporučene namirnice: piletina, riba, jaja, povrće
- Izbegavati: mlečne proizvode (laktoza intolerancija)
- Broj obroka: 4-5 dnevno
- Fokus: povećati protein unos
```

**Training:**
```
- Program: Upper/Lower split, 4x nedeljno
- Izbegavati: čučnjeve (problem sa kolenom)
- Fokus: hipertrofija gornjih partija
- Intenzitet: RPE 7-8
```

**Supplements:**
```
- Već koristi: multivitamin
- Preporučiti: whey protein posle treninga, kreatin 5g dnevno
- Izbegavati: pre-workout (osetljivost na kofein)
```

### Coach Meal Creation

Create custom meals with full nutritional tracking for your assigned members:

1. Go to the member's detail page
2. Click **"Dodaj obrok"** (Add Meal) button
3. The meal creation modal opens with:
   - **Meal Name**: Required name for the meal
   - **Ingredients List**: Add multiple ingredients
   - **Totals Summary**: Auto-calculated or manual

**Adding Ingredients:**

For each ingredient, you can enter:
- **Name**: Ingredient name (e.g., "Piletina")
- **Portion**: Amount + unit (e.g., 150g, 2 komada)
- **Calories**: Required
- **Protein/Carbs/Fats**: Optional macros

**AI Deduce Feature:**

Click the cherries icon (🍒) next to any ingredient to auto-fill nutritional values:
1. Enter ingredient name and portion
2. Click the AI deduce button
3. System first checks the static nutrition database (free, instant)
4. If not found, uses AI to estimate values

**Note:** Coaches have **unlimited AI deduce calls** (no rate limits).

**Meal Totals:**

- **Auto-calculate**: Totals sum from all ingredients
- **Manual override**: Check "Ručno podesi" to enter totals manually

**After saving**, the meal appears in the member's **"Od trenera" (Coach Meals)** section.

### Reviewing Member Coach Requests

Members can browse coaches and send requests to work with you:

1. Check your dashboard for pending member requests
2. See member contact info: name, phone number
3. Read their message explaining their goals
4. **Accept**: Creates assignment, clears member history for fresh start
5. **Decline**: Removes the request, member can try another coach

---

## Member Guide

### Logging In

1. Go to `/login` (or scan your QR code)
2. Enter your Member ID
3. Enter your 4-digit PIN

### Custom Meal System

Create and save custom meals with detailed nutritional information:

1. Go to `/meals` or access from the meal logging screen
2. Click **"Novi obrok"** (New Meal)
3. Fill in the meal details:
   - **Naziv obroka**: Meal name (e.g., "Piletina sa risom")
   - **Sastojci**: Add ingredients

**Adding Ingredients:**

For each ingredient:
1. Enter the ingredient name
2. Set portion amount and unit (g, ml, komad, šolja, etc.)
3. Enter calories (required)
4. Optionally expand to add protein, carbs, fats

**AI Deduce Button:**

Click the cherries icon (🍒) to auto-fill nutritional values:
- First checks a database of 200+ common ingredients
- Falls back to AI if ingredient not found
- Rate limits apply: Trial (5/day), Active (20/day)

**Meal Totals:**

- Totals auto-calculate from ingredients
- Check "Ručno podesi" to override with manual totals

**Sharing Meals:**

- Check "Podeli sa teretanom" to share your meal
- Shared meals require admin approval
- Once approved, visible to all gym members

**Meal Categories:**

| Category | Description |
|----------|-------------|
| Moji obroci | Meals you created |
| Od trenera | Meals your coach created for you |
| Deljeni | Approved shared meals from gym |

### Coach Meals

If you have an assigned coach, they can create custom meals for you:

- Coach meals appear with a **"Trener"** badge
- Highlighted with accent color for easy identification
- Include full nutritional info (calories, P/C/F)
- Can be selected when logging meals

**In Exact Macros Mode:**

When your coach requires exact macro tracking:
1. Open the meal logging modal
2. Coach meals appear at the top under **"OD TRENERA"**
3. Select a coach meal to auto-fill macros
4. Or enter macros manually below

This makes it easy to log coach-prescribed meals with accurate nutrition.

### Browse and Request Coaches

If you don't have a coach, you can browse and request one:

1. Go to `/coaches`
2. See available coaches in your gym with:
   - Coach name
   - Number of assigned members
3. Click **"Pošalji zahtev"** on a coach
4. Fill in the request form:
   - **Ime**: Your first name
   - **Prezime**: Your last name
   - **Telefon**: Your phone number (required)
   - **Poruka**: Optional message about your goals
5. Submit the request
6. Wait for coach to accept or decline

**Status Tracking:**
- Pending request shows "Zahtev poslat" status
- If declined, you can request a different coach
- If accepted, coach becomes your assigned coach

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

### Custom Nutrition Targets

Members can manually adjust their daily nutrition targets from the **Profile page**:

**Location:** Profile → "Daily Targets" section

**Available Fields:**
- Calories (kcal): 800-10000
- Protein (g): 0-500
- Carbs (g): 0-1000
- Fats (g): 0-500

**How to Adjust:**
1. Go to your Profile page
2. Find the "Dnevni ciljevi" (Daily Targets) section
3. Click "Izmeni" (Edit)
4. Enter your custom values in the modal
5. Click "Sačuvaj" (Save)

**Reset to Auto:** Click "Vrati na automatski izračunato" to reset all targets to auto-calculated values based on your weight and goal.

**Target Priority:**
The system uses the following priority for determining your daily targets:
1. **Coach-assigned targets** (highest priority) - if you have a coach
2. **Your custom targets** - values you set manually
3. **Auto-calculated targets** - based on your weight and goal

**Important:** If you have an assigned coach, you **cannot** modify your targets. The "Izmeni" button will be hidden, and you'll see a notice showing your coach's name. Contact your coach to request target changes.

**Coach Notice Example:**
```
👨‍🏫 Managed by Coach Marko
Contact your coach to adjust targets
```

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

Complete your weekly check-in **on Sunday**:

1. Go to `/checkin`
2. If it's not Sunday, you'll see how many days until you can check in
3. On Sunday:
   - Enter your current weight (kg)
   - Select how you're feeling (emoji scale: 😞 😐 🙂 😄)
   - Submit

**Rules:**
- Check-ins are only available on **Sunday** (end of week)
- Minimum **7 days** must pass between check-ins
- One check-in per week maximum

**Status Messages:**
- "Nedeljni pregled je dostupan samo nedeljom" - Wait for Sunday
- "Već si završio pregled ove nedelje" - Already completed this week
- "Moraš sačekati još X dana" - Too soon since last check-in

This helps track your weight progress over time.

### AI Agents

Get specialized guidance from three AI agents:

1. Go to `/chat`
2. Choose an agent:
   - **Ishrana (Nutrition)** 🍒 - Calories, macros, meal timing, food choices
   - **Suplementi (Supplements)** 💊 - Protein, creatine, vitamins, dosages
   - **Trening (Training)** 🏋️ - Workout types, exercise technique, recovery
3. Each agent has domain-specific suggested questions
4. Type your question (max 500 characters)
5. Get AI-powered advice based on your data

**Example questions by agent:**

| Agent | Example Questions |
|-------|-------------------|
| Nutrition | "Šta da jedem pre treninga?", "Kako da povećam protein?" |
| Supplements | "Kada da pijem protein?", "Da li mi treba kreatin?" |
| Training | "Koliko puta nedeljno da treniram?", "Kako da poboljšam tehniku?" |

**Features:**
- Conversations are saved per agent (separate history)
- AI speaks Serbian (ekavica dialect)
- If you ask off-topic, the AI redirects you to the right agent
- Coach guidelines (if set) are automatically included

**Rate Limits:**
- Trial members: 5 messages/day
- Active members: 20 messages/day

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

### AI Agents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/agents/nutrition/chat` | POST | Chat with nutrition agent |
| `/api/ai/agents/supplements/chat` | POST | Chat with supplements agent |
| `/api/ai/agents/training/chat` | POST | Chat with training agent |

**POST body:**
```json
{
  "message": "Šta da jedem pre treninga?",
  "history": []  // Optional: previous messages for context
}
```

**Response:**
```json
{
  "response": "Pre treninga preporučujem...",
  "remaining": 19,  // Messages remaining today
  "limit": 20       // Daily limit
}
```

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

### Coach Knowledge (Staff only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/coach/knowledge?memberId=xxx` | GET | Get AI knowledge for a member |
| `/api/coach/knowledge` | POST | Save AI knowledge for a member |

**GET response:**
```json
{
  "nutrition": "Smernice za ishranu...",
  "supplements": null,
  "training": "Fokus na gornjem delu tela..."
}
```

**POST body:**
```json
{
  "memberId": "member-cuid",
  "agentType": "nutrition",
  "content": "Preporučene namirnice: piletina, riba..."
}
```

### Member Meals

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/member/meals` | GET | Get member's meals (own, coach, shared) |
| `/api/member/meals` | POST | Create a new meal with ingredients |

**GET `/api/member/meals` response:**
```json
{
  "own": [{ "id": "...", "name": "My Meal", "totalCalories": 500, ... }],
  "coach": [{ "id": "...", "name": "Coach Meal", "coachName": "Coach Marko", ... }],
  "shared": [{ "id": "...", "name": "Shared Meal", "authorName": "Petar", ... }]
}
```

**POST `/api/member/meals` body:**
```json
{
  "name": "Piletina sa risom",
  "ingredients": [
    {
      "name": "Chicken breast",
      "portionSize": "150g",
      "calories": 248,
      "protein": 47,
      "carbs": 0,
      "fats": 5
    }
  ],
  "isManualTotal": false,
  "isShared": false
}
```

### Coach Meals (Staff only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/coach/member-meals/[memberId]` | POST | Create meal for assigned member |

**POST body:** Same as member meals, creates meal with `createdByCoachId` set.

### AI Ingredient Deduction

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/deduce-ingredient` | POST | Deduce nutrition from ingredient name + portion |
| `/api/ai/deduce-ingredient?q=xxx` | GET | Search ingredient database |

**POST body:**
```json
{
  "name": "chicken breast",
  "portionSize": "150g"
}
```

**POST response (database match):**
```json
{
  "success": true,
  "source": "database",
  "confidence": "high",
  "ingredientName": "Chicken Breast",
  "calories": 248,
  "protein": 47,
  "carbs": 0,
  "fats": 5
}
```

**POST response (AI fallback):**
```json
{
  "success": true,
  "source": "ai",
  "confidence": "medium",
  "calories": 248,
  "protein": 47,
  "carbs": 0,
  "fats": 5,
  "remaining": 14,
  "limit": 20
}
```

**Note:** Staff (coaches) bypass rate limits and get unlimited AI deduce calls.

### Member Coach Browsing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/member/coaches` | GET | List available coaches in gym |
| `/api/member/coaches/[coachId]/request` | POST | Send request to coach |

**GET response:**
```json
{
  "coaches": [
    { "id": "staff-id", "name": "Coach Marko", "assignedMembersCount": 12 }
  ],
  "currentCoach": null,
  "pendingRequest": null
}
```

**POST body:**
```json
{
  "firstName": "Miloš",
  "lastName": "Mladenović",
  "phone": "+381641234567",
  "message": "Želim da radim na gubitku masti..."
}
```

### Coach Member Requests (Staff only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/coach/member-requests` | GET | Get pending requests from members |
| `/api/coach/member-requests/[id]` | POST | Accept or decline request |

**POST body:**
```json
{
  "action": "accept",
  "notes": "Welcome!",
  "customGoal": "fat_loss",
  "customCalories": 2200
}
```

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
