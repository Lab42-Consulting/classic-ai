# Software Requirements Specification (SRS)

## Classic Method - Gym Intelligence System

**Version:** 1.5
**Last Updated:** January 2025

**Changelog v1.5:**
- Added Member Custom Targets feature (calories, protein, carbs, fats)
- Members without a coach can manually adjust their daily nutrition targets
- Added target priority: Coach targets > Member custom targets > Auto-calculated
- Members with assigned coach cannot modify targets (coach controls)
- Added target adjustment UI in profile page
- Updated staff login response to include linkedMember field

**Changelog v1.4:**
- Added Gym Portal (B2B admin panel) at `/gym-portal/manage`
- Separated Admin and Coach experiences (different dashboards)
- Admins use desktop-first Gym Portal, Coaches use mobile-first Dashboard
- Added Gym Branding system (custom logo, primary color)
- Added Member Subscription Management (extend, track status)
- Added Staff Management in Gym Portal
- Branding colors apply only after login (login pages use defaults)
- Staff login redirects based on role (admin → gym-portal, coach → dashboard)

**Changelog v1.3:**
- Added Custom Meal System with ingredients and nutritional tracking
- Added Coach Meal Creation for members (full ingredient support)
- Added Member-Initiated Coach Requests (browse and request coaches)
- Added AI Ingredient Deduction with staff bypass (no rate limits for coaches)
- Added Coach Meal Selection in Exact Macros mode
- Updated member meals to show coach-created meals with visual distinction

**Changelog v1.2:**
- Added Specialized AI Agents (Nutrition, Supplements, Training)
- Added per-member Coach Knowledge for AI customization
- Weekly check-ins now only available on Sunday
- Week calculations use Monday-Sunday (not rolling 7 days)
- Context-aware training alerts (show from Thursday if behind pace)
- AI agents use Serbian language (ekavica dialect)

**Changelog v1.1:**
- Added Coach Assignment System with custom targets
- Added Coach Nudges (accountability messages)
- Added requireExactMacros feature for strict macro tracking
- Added custom and exact meal logging modes
- Updated Home Dashboard to show daily metrics only
- Moved Consistency Score to Progress page

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Data Models](#5-data-models)
6. [User Interface Specifications](#6-user-interface-specifications)
7. [API Specifications](#7-api-specifications)
8. [Business Logic](#8-business-logic)
9. [Localization](#9-localization)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements for the Classic Method Gym Intelligence System, a digital accountability and guidance platform for gym members and staff.

### 1.2 Scope

The system provides:
- Member onboarding and authentication
- Daily activity logging (meals, training, water)
- Goal-based calorie and macro tracking
- Weekly check-ins with progress tracking
- AI-powered coaching and guidance
- Staff dashboard for member management
- Subscription/trial management

### 1.3 Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| AI | Anthropic Claude API |
| Authentication | Custom JWT with HTTP-only cookies |

---

## 2. System Overview

### 2.1 User Roles

| Role | Description | Access Level | Primary Interface |
|------|-------------|--------------|-------------------|
| Member | Gym member using the app | Member pages only | `/home` (mobile-first) |
| Coach | Gym trainer/coach | Assigned members, nudges, AI knowledge | `/dashboard` (mobile-first) |
| Admin | Gym administrator | Full gym management, staff, branding | `/gym-portal/manage` (desktop-first) |

**Role Separation:**
- **Coaches** are redirected to `/dashboard` after login - mobile-first interface for day-to-day member coaching
- **Admins** are redirected to `/gym-portal/manage` after login - desktop-first interface for gym management
- Admins cannot access `/dashboard` (redirected to gym portal)
- Coaches cannot access `/gym-portal/manage` (redirected to dashboard)

### 2.2 System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Client (Browser/PWA)                             │
├──────────────────────────────────────────────────────────────────────────┤
│                         Next.js App Router                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │ (auth)     │  │ (member)   │  │ (staff)    │  │ gym-portal         │  │
│  │ - login    │  │ - home     │  │ - dashboard│  │ - page (landing)   │  │
│  │ - staff-   │  │ - log      │  │ - register │  │ - gym-signup       │  │
│  │   login    │  │ - chat     │  │            │  │ - manage/          │  │
│  │            │  │ - checkin  │  │ Coach-only │  │   - page (dash)    │  │
│  │ No theme   │  │ - history  │  │ Mobile-    │  │   - members        │  │
│  │ (defaults) │  │ - profile  │  │ first      │  │   - members/new    │  │
│  │            │  │ - goal     │  │            │  │   - members/[id]   │  │
│  │            │  │ - progress │  │            │  │   - staff          │  │
│  │            │  │ - meals    │  │            │  │   - branding       │  │
│  │            │  │ - coaches  │  │            │  │                    │  │
│  │            │  │            │  │            │  │ Admin-only         │  │
│  │            │  │ Gym theme  │  │ Gym theme  │  │ Desktop-first      │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────┤
│                           API Routes (/api)                               │
│  - auth/login, auth/logout, auth/staff-login                             │
│  - logs, checkins                                                        │
│  - member/profile, member/subscription, member/nudges, member/meals      │
│  - members, members/[id], members/[id]/subscription/extend               │
│  - coach/assignments, coach/nudges, coach/knowledge, coach/dashboard     │
│  - ai/agents/[type]/chat (nutrition, supplements, training)              │
│  - gym/settings, gym/branding                                            │
│  - staff (list, create staff)                                            │
├──────────────────────────────────────────────────────────────────────────┤
│                         Prisma ORM Layer                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                         PostgreSQL Database                               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Functional Requirements

### 3.1 Authentication System

#### FR-AUTH-001: Member Login
- **Input:** Member ID (6 characters), PIN (4 digits)
- **Process:** Validate credentials, create JWT session
- **Output:** Redirect to `/home` on success, error message on failure
- **Session:** HTTP-only cookie, 7-day expiry

#### FR-AUTH-002: Staff Login
- **Input:** Staff ID, PIN (4 digits)
- **Process:** Validate credentials, check role
- **Output:** Role-based redirect:
  - **Admin role:** Redirect to `/gym-portal/manage`
  - **Coach role:** Redirect to `/dashboard`
- **Note:** Each role is restricted to their respective interface

#### FR-AUTH-003: Logout
- **Process:** Clear session cookie, invalidate token
- **Output:** Redirect to `/login`

#### FR-AUTH-004: QR Code Login
- **Input:** QR code scan
- **Process:** Extract member ID, prompt for PIN
- **Output:** Same as FR-AUTH-001

### 3.2 Daily Logging

#### FR-LOG-001: Meal Logging
- **Input:** Meal size (small/medium/large/custom/exact), optional meal name, optional macros
- **Process:**
  1. Fetch user's current goal and coach settings
  2. If `requireExactMacros` is enabled by coach, require P/C/F input
  3. Calculate estimated or exact macros based on mode
  4. Store log with timestamp
- **Output:** Success confirmation, redirect to home

**Meal Size Modes:**

| Mode | Description | Required Input |
|------|-------------|----------------|
| Small/Medium/Large | Preset sizes with automatic macro estimation | Size selection |
| Custom | User enters exact calories, optional protein | Calories (required), Protein (optional) |
| Exact | Coach-required mode with full macro tracking | Protein, Carbs, Fats (all required) |

**Meal Size Estimation by Goal (Preset Sizes):**

| Goal | Small | Medium | Large |
|------|-------|--------|-------|
| Fat Loss | 300 kcal | 500 kcal | 750 kcal |
| Recomposition | 350 kcal | 600 kcal | 900 kcal |
| Muscle Gain | 400 kcal | 700 kcal | 1000 kcal |

#### FR-LOG-001a: Exact Macros Mode
- **Trigger:** Coach enables `requireExactMacros` for member
- **Input:** Protein (g), Carbs (g), Fats (g)
- **Auto-calculation:** Calories = (P × 4) + (C × 4) + (F × 9)
- **Display:** Real-time calorie preview as macros are entered
- **Validation:** All three macro fields required

#### FR-LOG-002: Training Logging
- **Input:** Single tap
- **Process:** Create training log entry for current date
- **Output:** Success confirmation

#### FR-LOG-003: Water Logging
- **Input:** Single tap
- **Process:** Increment water count (+1 glass)
- **Output:** Updated water count

#### FR-LOG-004: Macro Preview
- **Trigger:** User selects meal size
- **Display:** Real-time preview showing:
  - Estimated calories
  - Protein (g)
  - Carbs (g)
  - Fats (g)
- **Note:** "Bazirano na veličini obroka i tvom cilju"

### 3.3 Home Dashboard

The home dashboard displays **daily metrics only** for a focused, simplified view.

#### FR-HOME-001: Daily Metrics Display
- **Training Status:** ✓ (completed) or — (not yet)
- **Water Intake:** X/8 format (e.g., "3/8" glasses)
- **Meals Logged:** Count of meals for the day
- **Note:** Detailed calorie/macro tracking moved to Progress page

#### FR-HOME-002: Coach Nudge Banner
- **Trigger:** Unread nudge from assigned coach
- **Display:** Coach message at top of dashboard
- **Action:** Tap to dismiss (marks as seen)

#### FR-HOME-003: Quick Actions Grid
- **Layout:** 2x3 grid
- **Buttons:**
  1. AI Chat
  2. Check-in
  3. History
  4. Membership
  5. Supplements
  6. Goal

### 3.4 Progress Page

#### FR-PROGRESS-001: Calorie Ring
- **Display:** Circular progress indicator
- **Under target:** Show remaining calories
- **Over target:** Show surplus in red with recovery suggestions

#### FR-PROGRESS-002: Macro Balance
- **Display:** Three progress bars (Protein, Carbs, Fats)
- **Colors:** Green (on track), Yellow (attention), Red (off track)

#### FR-PROGRESS-003: Consistency Score
- **Range:** 0-100
- **Components:**
  - Training sessions (0-30 points)
  - Logging consistency (0-20 points)
  - Calorie adherence (0-25 points)
  - Protein adherence (0-15 points)
  - Water consistency (0-10 points)

### 3.5 Goal Management

#### FR-GOAL-001: View Goals
- **Display:** Three goal cards with:
  - Icon and title
  - Description
  - Macro split percentages
  - Calorie approach (deficit/maintenance/surplus)
  - Current goal indicator

#### FR-GOAL-002: Change Goal
- **Process:**
  1. Select new goal
  2. Show warning about target changes
  3. Submit via PATCH `/api/member/profile`
  4. Recalculate daily targets

**Goal Definitions:**

| Goal | Macro Split (P/C/F) | Calorie Approach |
|------|---------------------|------------------|
| Fat Loss | 40% / 30% / 30% | Deficit |
| Recomposition | 35% / 40% / 25% | Maintenance |
| Muscle Gain | 30% / 45% / 25% | Surplus |

### 3.6 Subscription/Trial System

#### FR-SUB-001: Trial Period
- **Duration:** 7 days from registration
- **Display:** Day counter, progress bar, days remaining
- **Warning:** Show at 3 days remaining

#### FR-SUB-002: Subscription Status
- **States:**
  - `trial`: Free 7-day period
  - `active`: Paid subscription
  - `expired`: Subscription ended
  - `cancelled`: Membership cancelled

#### FR-SUB-003: Status Display
- **Elements:**
  - Status icon and title
  - Progress bar (trial only)
  - End date (active only)
  - Warning/action prompt when expiring

### 3.7 Supplements

#### FR-SUPP-001: Goal-Based Recommendations
- **Categories:**
  - Essential (recommended: true)
  - Performance
  - Recovery
  - Health

#### FR-SUPP-002: Supplement Details
- **Expandable info:**
  - Timing
  - Dosage
  - Benefits

#### FR-SUPP-003: Goal Link
- **Feature:** Quick link to change goal from supplements page

### 3.8 History

#### FR-HIST-001: 30-Day Calendar
- **Display:** Grid calendar with color-coded days
- **Colors:**
  - Empty: No logs
  - Partial/Yellow: Some activity
  - Good/Green: Meals + training
  - Excellent: All targets met

#### FR-HIST-002: Day Details
- **On tap:** Show detailed stats for selected day
  - Calories consumed
  - Protein consumed
  - Training status
  - Meal count
  - Water glasses

#### FR-HIST-003: Summary Stats
- **Display:** 30-day totals
  - Training sessions
  - Days logged
  - Average calories

### 3.9 Profile

#### FR-PROF-001: Profile Display
- **Information:**
  - Avatar (initials)
  - Name
  - Member ID
  - Current goal
  - Weight/height (if provided)

#### FR-PROF-002: Quick Links
- Change goal
- View membership

#### FR-PROF-003: Logout
- **Button:** "Odjavi se"
- **Action:** Clear session, redirect to login

#### FR-PROF-004: Custom Nutrition Targets
- **Purpose:** Allow members to manually adjust their daily nutrition targets
- **Location:** Profile page → "Daily Targets" section
- **Fields:**
  - Custom Calories (kcal) - range: 800-10000
  - Custom Protein (g) - range: 0-500
  - Custom Carbs (g) - range: 0-1000
  - Custom Fats (g) - range: 0-500
- **Behavior:**
  - Members without a coach can edit targets via modal
  - Members with an assigned coach cannot edit (coach controls targets)
  - Targets can be reset to "Auto" (calculated from weight and goal)
  - Empty fields use auto-calculated values
- **Target Priority:**
  1. Coach-assigned targets (highest priority)
  2. Member custom targets
  3. Auto-calculated targets (based on weight and goal)

### 3.10 Weekly Check-In

#### FR-CHECK-001: Check-In Form
- **Fields:**
  - Current weight (required)
  - Feeling scale (1-4, emoji selection)
  - Progress photo (optional)

#### FR-CHECK-002: Check-In Availability
- **Rule:** Check-ins only available on Sunday (end of week)
- **Minimum Interval:** 7 days between check-ins
- **Validation:**
  - If not Sunday: Show days until Sunday
  - If already done this week: Show "already completed" message
  - If less than 7 days since last check-in: Show days remaining

#### FR-CHECK-003: Check-In Status Response
- **Fields returned:**
  - `canCheckIn`: Boolean
  - `reason`: "sunday_only" | "already_done" | "too_soon"
  - `isSunday`: Boolean
  - `daysUntilNextCheckin`: Number
  - `missedWeeks`: Number (accountability tracking)

### 3.11 Specialized AI Agents

The system uses three specialized AI agents instead of a single general chat. Each agent has a distinct visual identity and domain expertise.

#### FR-AI-001: Agent Types & Visual Identity

| Agent | Serbian Name | Domain | Icon | Primary Color |
|-------|--------------|--------|------|---------------|
| Nutrition | Ishrana | Calories, macros, meal timing, food choices | Cherries | Emerald (#10B981) |
| Supplements | Suplementi | Protein, creatine, vitamins, dosages | Pill/Capsule | Violet (#8B5CF6) |
| Training | Trening | Workout types, exercise technique, recovery | Dumbbell | Orange (#F97316) |

**Agent Visual Identity Details:**

| Agent | Gradient | Glow | Border | Text |
|-------|----------|------|--------|------|
| Nutrition | emerald-500 → 600 | emerald-500/30 | border-emerald-500/20 | text-emerald-500 |
| Supplements | violet-500 → 600 | violet-500/30 | border-violet-500/20 | text-violet-500 |
| Training | orange-500 → 600 | orange-500/30 | border-orange-500/20 | text-orange-500 |

#### FR-AI-002: Agent Avatar Component

The `AgentAvatar` component provides animated visual representation with states:

| State | Description | Animation |
|-------|-------------|-----------|
| `idle` | Default state | Slow orbital rings (12s), subtle glow |
| `active` | Agent responding | Faster rings (2.5s), pulsing icon |
| `thinking` | Processing request | Fastest rings (1s), orbiting dot |

**Avatar Sizes:** `sm` (40px), `md` (56px), `lg` (72px), `xl` (96px)

#### FR-AI-003: Where Agents Appear

| Location | Page | Usage |
|----------|------|-------|
| Agent Picker | `/chat` | Large cards for agent selection |
| Chat Header | `/chat/[agent]` | Medium avatar with name |
| Chat Messages | `/chat/[agent]` | Agent responses show avatar |
| AI Settings | `/members/[id]` (staff) | Small avatars for coach knowledge config |
| Onboarding | `/why-this-works` | Introduction to AI agents with avatars |

#### FR-AI-004: Agent Chat Interface
- **Selection:** Agent picker on main chat page (`/chat`)
- **Per-agent history:** Conversations stored separately per agent
- **Suggested prompts:** Domain-specific starter questions
- **Character limit:** 500 characters per message
- **Visual feedback:** Avatar animates based on state

#### FR-AI-005: AI Context
- **Includes:**
  - User's current stats (weight, goal)
  - Today's consumed macros vs targets
  - Training status (today and weekly)
  - Water intake
  - Consistency score
  - Coach knowledge (if configured)

#### FR-AI-006: AI Language
- **Primary:** Serbian (ekavica dialect)
- **Rules:**
  - Use "e" instead of "ije": "lepo" not "lijepo", "mleko" not "mlijeko"
  - Serbian terminology: "nedelja" not "tjedan", "hleb" not "kruh"
  - Cyrillic only if user writes in Cyrillic

#### FR-AI-007: AI Guardrails
- Each agent stays within its domain
- Redirects off-topic questions to appropriate agent
- No medical advice
- No specific meal/training plans
- Reference gym staff for personalized guidance

#### FR-AI-008: Rate Limiting
- **Trial members:** 5 messages/day
- **Active members:** 20 messages/day
- **Gym budget cap:** Optional monthly AI cost limit

#### FR-AI-009: Coach AI Knowledge Integration

Coaches can customize AI behavior per member:

**Location:** `/members/[id]` → "AI Podešavanja" section

**Visual Indicator:**
- Emerald dot: Nutrition configured
- Violet dot: Supplements configured
- Orange dot: Training configured
- Gray dot: Not configured

**Features:**
- Separate knowledge entries for each agent
- Max 2000 characters per agent
- Guidelines injected into AI prompts for that member

### 3.12 Coach Dashboard (Mobile-First)

The coach dashboard at `/dashboard` is designed for day-to-day member coaching on mobile devices.

#### FR-STAFF-001: Assigned Members Overview
- **List:** Only members assigned to the logged-in coach
- **Filters:** Active, Slipping, Inactive
- **Search:** By name or member ID

#### FR-STAFF-002: Member Details
- Profile information
- Activity summary
- Weight progress chart
- AI summaries
- Staff notes

#### FR-STAFF-003: Member Assignment (Coach)
- Coach can discover and assign unassigned members
- Quick assignment flow from dashboard

### 3.13 Gym Portal Admin Panel (Desktop-First)

The Gym Portal at `/gym-portal/manage` provides comprehensive gym management for administrators.

#### FR-ADMIN-001: Admin Dashboard
- **Location:** `/gym-portal/manage`
- **Access:** Admin role only (coaches redirected to `/dashboard`)
- **Display:**
  - Gym subscription status
  - Total members count
  - Active members count
  - Total staff count
  - Coach count
- **Quick Actions:** Members, Staff, Branding

#### FR-ADMIN-002: Member Management
- **Location:** `/gym-portal/manage/members`
- **Features:**
  - Full member list with search and filters
  - Filter by goal, activity status, subscription status
  - Subscription status display (active, expired, expiring)
  - Click to view member details

#### FR-ADMIN-003: Member Registration (Admin)
- **Location:** `/gym-portal/manage/members/new`
- **Auto-generated:**
  - Member ID (6 characters)
  - PIN (4 digits)
  - QR code
- **Required fields:** Name, Goal
- **Optional fields:** Height, Weight, Gender
- **Output:** Credentials display with QR code

#### FR-ADMIN-004: Member Subscription Management
- **Location:** `/gym-portal/manage/members/[id]`
- **Features:**
  - View current subscription status
  - Extend subscription (1, 3, 6, 12 months)
  - View subscription history
  - Manual date picker for custom extensions

#### FR-ADMIN-005: Staff Management
- **Location:** `/gym-portal/manage/staff`
- **Features:**
  - List all gym staff (admins and coaches)
  - View assigned members per coach
  - Add new staff member (coach or admin role)
  - Auto-generated Staff ID and PIN

#### FR-ADMIN-006: Gym Branding
- **Location:** `/gym-portal/manage/branding`
- **Features:**
  - Upload gym logo (base64, max 2MB)
  - Set primary accent color (color picker)
  - Live preview of branding changes
- **Behavior:**
  - Branding colors apply to members and coaches after login
  - Login pages always use default colors (no gym-specific theming)
  - Colors stored in `gym.primaryColor` field

### 3.13 Coach Features

#### FR-COACH-001: Coach Assignment
- **Purpose:** Assign staff member as coach to a gym member
- **Location:** Member registration and member details pages
- **Data Captured:**
  - Staff ID (auto-set to current logged-in coach)
  - Member ID
  - Assignment timestamp
- **Constraint:** One member can only have one coach

#### FR-COACH-002: Custom Targets
- **Purpose:** Coach can override member's automatic target calculations
- **Fields:**
  - Custom Goal (override member's selected goal)
  - Custom Calories (daily target)
  - Custom Protein (grams)
  - Custom Carbs (grams)
  - Custom Fats (grams)
  - Notes (initial coaching notes)
- **Behavior:** When set, custom targets take precedence over calculated values

#### FR-COACH-003: Require Exact Macros
- **Purpose:** Coach can enforce strict macro tracking for a member
- **Trigger:** Toggle `requireExactMacros` in coach assignment
- **Effect:** Member must enter Protein, Carbs, and Fats for every meal
- **Calories:** Auto-calculated from macros (P×4 + C×4 + F×9)
- **UI Change:** Meal size selection replaced with macro input fields

#### FR-COACH-004: Coach Nudges
- **Purpose:** One-way accountability messages from coach to member
- **Features:**
  - Coach can send text messages to assigned members
  - Messages appear as banner on member's home dashboard
  - Member can tap to dismiss (marks as seen)
  - Track when message was seen (`seenAt` timestamp)
- **Note:** Not a two-way chat, just accountability signals

#### FR-COACH-005: Per-Member AI Knowledge
- **Purpose:** Coach can customize AI agent behavior for specific members
- **Location:** Member detail page → "AI Podešavanja" section
- **Features:**
  - Separate knowledge entries for each agent (Nutrition, Supplements, Training)
  - Coach writes guidelines that get injected into AI prompts
  - Status indicator dot shows which agents have configured knowledge:
    - Emerald dot: Nutrition configured
    - Violet dot: Supplements configured
    - Orange dot: Training configured
    - Gray dot: Not configured
  - Max 2000 characters per agent
  - Success feedback when saving
- **Examples:**
  - Nutrition: "This member is lactose intolerant, suggest dairy alternatives"
  - Training: "Focus on upper body, avoid squats due to knee injury"
  - Supplements: "Already taking multivitamins, focus on protein and creatine"

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Requirement | Target |
|-------------|--------|
| Page load time | < 2 seconds |
| API response time | < 500ms |
| AI response time | < 5 seconds |

### 4.2 Security

- Passwords/PINs hashed with bcrypt
- JWT tokens in HTTP-only cookies
- No storage of sensitive personal data
- HTTPS required in production

### 4.3 Usability

- Mobile-first design
- Dark mode default
- Large touch targets (min 44px)
- Serbian language primary
- Accessibility compliance (WCAG 2.1 AA)

### 4.4 Reliability

- 99.9% uptime target
- Graceful degradation without AI
- Offline-capable (PWA)

---

## 5. Data Models

### 5.1 Member Model

```prisma
model Member {
  id                  String          @id @default(cuid())
  memberId            String          @unique
  pin                 String          // Hashed
  qrCode              String?         @unique
  name                String
  height              Float?          // cm
  weight              Float?          // kg
  gender              String?
  goal                String          // fat_loss | muscle_gain | recomposition
  status              String          @default("active")

  // Custom targets (member can set if no coach)
  customCalories      Int?            // Custom daily calorie target
  customProtein       Int?            // Custom protein target (grams)
  customCarbs         Int?            // Custom carbs target (grams)
  customFats          Int?            // Custom fats target (grams)

  // Subscription
  trialStartDate      DateTime        @default(now())
  trialEndDate        DateTime?
  subscriptionStatus  String          @default("trial")
  subscriptionEndDate DateTime?

  // Relations
  gymId               String
  gym                 Gym             @relation(...)
  dailyLogs           DailyLog[]
  weeklyCheckins      WeeklyCheckin[]
  aiSummaries         AISummary[]
  chatMessages        ChatMessage[]

  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
}
```

### 5.2 DailyLog Model

```prisma
model DailyLog {
  id                String   @id @default(cuid())
  memberId          String
  date              DateTime @default(now())
  type              String   // meal | training | water
  mealSize          String?  // small | medium | large
  mealName          String?
  estimatedCalories Int?
  estimatedProtein  Int?
  estimatedCarbs    Int?
  estimatedFats     Int?
  createdAt         DateTime @default(now())
}
```

### 5.3 WeeklyCheckin Model

```prisma
model WeeklyCheckin {
  id         String   @id @default(cuid())
  memberId   String
  weight     Float
  feeling    Int      // 1-4
  photoUrl   String?
  weekNumber Int
  year       Int
  createdAt  DateTime @default(now())
}
```

### 5.4 CoachAssignment Model

```prisma
model CoachAssignment {
  id             String   @id @default(cuid())
  staffId        String
  memberId       String   @unique // One member can only have one coach
  assignedAt     DateTime @default(now())

  // Coach-set targets (overrides automatic calculations)
  customGoal     String?  // Coach can override member's goal
  customCalories Int?     // Coach-set daily calorie target
  customProtein  Int?     // Coach-set daily protein target (grams)
  customCarbs    Int?     // Coach-set daily carbs target (grams)
  customFats     Int?     // Coach-set daily fats target (grams)
  notes          String?  // Initial notes when assigning

  // Tracking settings
  requireExactMacros Boolean @default(false) // If true, member must enter exact P/C/F for each meal

  staff          Staff    @relation(...)
  member         Member   @relation(...)
}
```

### 5.5 CoachNudge Model

```prisma
model CoachNudge {
  id        String    @id @default(cuid())
  staffId   String
  memberId  String
  message   String
  createdAt DateTime  @default(now())
  seenAt    DateTime? // Null until member sees it

  staff     Staff     @relation(...)
  member    Member    @relation(...)
}
```

### 5.6 CoachKnowledge Model

```prisma
model CoachKnowledge {
  id        String   @id @default(cuid())
  staffId   String
  memberId  String   // Knowledge is specific to each member
  agentType String   // "nutrition" | "supplements" | "training"
  content   String   @db.Text // Coach's custom knowledge/instructions (max 2000 chars)

  staff     Staff    @relation(...)
  member    Member   @relation(...)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([staffId, memberId, agentType])
}
```

### 5.7 ChatMessage Model (Updated)

```prisma
model ChatMessage {
  id        String   @id @default(cuid())
  memberId  String
  role      String   // "user" | "assistant"
  content   String
  agentType String?  // "nutrition" | "supplements" | "training" | null (legacy)
  createdAt DateTime @default(now())

  member    Member   @relation(...)
}
```

---

## 6. User Interface Specifications

### 6.1 Design System

#### Colors

| Name | Value | Usage |
|------|-------|-------|
| Background | `#0a0a0a` | Main background |
| Foreground | `#fafafa` | Primary text |
| Foreground Muted | `#a1a1aa` | Secondary text |
| Accent | `#dc2626` | Primary actions, highlights |
| Success | `#22c55e` | Positive states |
| Warning | `#f59e0b` | Caution states |
| Error | `#ef4444` | Negative states |

#### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Display | Geist | 3xl | Bold |
| Headline | Geist | xl | Semibold |
| Body | Geist | base | Normal |
| Label | Geist | sm | Medium |
| Caption | Geist | xs | Normal |

#### Components

- **GlassCard:** Frosted glass effect with backdrop blur
- **Button:** Large, rounded, high-contrast
- **Modal:** Bottom sheet variant for mobile
- **ProgressRing:** Circular progress with overflow handling
- **StatusIndicator:** Colored dots (green/yellow/red)

### 6.2 Page Layouts

All pages follow mobile-first design with:
- Safe area padding (pt-14)
- Consistent header with back button
- Fixed bottom actions where appropriate
- Slide-up animations for content

---

## 7. API Specifications

### 7.1 Authentication

#### POST /api/auth/login
```json
// Request
{ "memberId": "ABC123", "pin": "1234" }

// Response (200)
{ "success": true }

// Response (401)
{ "error": "Invalid credentials" }
```

#### POST /api/auth/logout
```json
// Response (200)
{ "success": true }
```

### 7.2 Logs

#### POST /api/logs
```json
// Request (meal - preset size)
{
  "type": "meal",
  "mealSize": "medium",
  "mealName": "Piletina sa risom"
}

// Request (meal - custom calories)
{
  "type": "meal",
  "mealSize": "custom",
  "customCalories": 450,
  "customProtein": 30,
  "mealName": "Salata sa piletinom"
}

// Request (meal - exact macros, coach-required)
{
  "type": "meal",
  "mealSize": "exact",
  "customProtein": 35,
  "customCarbs": 45,
  "customFats": 15,
  "customCalories": 455,  // Auto-calculated: 35*4 + 45*4 + 15*9
  "mealName": "Piletina, riza, povrce"
}

// Request (training)
{ "type": "training" }

// Request (water)
{ "type": "water" }

// Response (200)
{ "success": true, "log": { ... } }
```

#### GET /api/logs
```json
// Response (200) - today's logs
{ "logs": [...] }
```

#### GET /api/logs?days=30
```json
// Response (200) - aggregated history
[
  {
    "date": "2024-12-27",
    "meals": 3,
    "training": true,
    "water": 6,
    "calories": 1850,
    "protein": 145
  }
]
```

### 7.3 Member Profile

#### GET /api/member/profile
```json
// Response (200)
{
  "name": "Marko Markovic",
  "memberId": "ABC123",
  "goal": "fat_loss",
  "weight": 85,
  "height": 180,
  "requireExactMacros": false,  // From coach assignment
  // Member's custom targets (if set)
  "customCalories": 2000,       // null if not set
  "customProtein": 160,         // null if not set
  "customCarbs": null,          // null if not set
  "customFats": null,           // null if not set
  // Coach info
  "hasCoach": true,
  "coachName": "Coach Marko",
  // Coach-assigned targets (if assigned)
  "coachCalories": 1800,
  "coachProtein": 150,
  "coachCarbs": null,
  "coachFats": null
}
```

#### PATCH /api/member/profile
```json
// Request - Update goal
{ "goal": "muscle_gain" }

// Request - Update custom targets
{
  "customCalories": 2200,
  "customProtein": 180,
  "customCarbs": 250,
  "customFats": 70
}

// Request - Reset to auto-calculated
{
  "customCalories": null,
  "customProtein": null,
  "customCarbs": null,
  "customFats": null
}

// Response (403) - Has coach
{ "error": "Cannot modify targets while assigned to a coach" }

// Response (200)
{ "success": true }
```

### 7.4 Subscription

#### GET /api/member/subscription
```json
// Response (200)
{
  "status": "trial",
  "trialStartDate": "2024-12-25T00:00:00Z",
  "trialEndDate": "2025-01-01T00:00:00Z",
  "subscriptionEndDate": null
}
```

### 7.5 Coach Assignment (Staff Only)

#### POST /api/coach/assignments
```json
// Request - Assign coach to member
{
  "memberId": "member-cuid",
  "customGoal": "fat_loss",       // Optional
  "customCalories": 1800,         // Optional
  "customProtein": 150,           // Optional
  "customCarbs": 180,             // Optional
  "customFats": 60,               // Optional
  "notes": "Fokus na deficit",    // Optional
  "requireExactMacros": true      // Optional, default false
}

// Response (200)
{ "success": true, "assignment": { ... } }
```

#### PATCH /api/coach/assignments/:id
```json
// Request - Update coach assignment
{
  "customCalories": 1900,
  "requireExactMacros": false
}

// Response (200)
{ "success": true, "assignment": { ... } }
```

### 7.6 Coach Nudges (Staff Only)

#### POST /api/coach/nudges
```json
// Request - Send nudge to member
{
  "memberId": "member-cuid",
  "message": "Odlično napredujete! Nastavite tako! 💪"
}

// Response (200)
{ "success": true, "nudge": { ... } }
```

#### GET /api/member/nudges (Member)
```json
// Response (200) - Get unread nudges
{
  "nudges": [
    {
      "id": "nudge-cuid",
      "message": "Odlično napredujete!",
      "createdAt": "2024-12-28T10:00:00Z",
      "coachName": "Marko Trener"
    }
  ]
}
```

#### PATCH /api/member/nudges/:id/seen
```json
// Request - Mark nudge as seen
// No body required

// Response (200)
{ "success": true }
```

---

## 8. Business Logic

### 8.1 Daily Target Calculation

```typescript
function calculateDailyTargets(weightKg: number, goal: Goal): DailyTargets {
  const weightLbs = weightKg * 2.205;

  const multipliers = {
    fat_loss: { min: 10, max: 12 },
    recomposition: { min: 13, max: 15 },
    muscle_gain: { min: 16, max: 18 }
  };

  const avgMultiplier = (multipliers[goal].min + multipliers[goal].max) / 2;
  const calories = Math.round(weightLbs * avgMultiplier);

  const splits = {
    fat_loss: { protein: 0.40, carbs: 0.30, fats: 0.30 },
    recomposition: { protein: 0.35, carbs: 0.40, fats: 0.25 },
    muscle_gain: { protein: 0.30, carbs: 0.45, fats: 0.25 }
  };

  const protein = Math.round((calories * splits[goal].protein) / 4);
  const carbs = Math.round((calories * splits[goal].carbs) / 4);
  const fats = Math.round((calories * splits[goal].fats) / 9);

  return { calories, protein, carbs, fats };
}
```

### 8.2 Meal Macro Estimation

```typescript
const MEAL_SIZE_CALORIES = {
  fat_loss: { small: 300, medium: 500, large: 750 },
  recomposition: { small: 350, medium: 600, large: 900 },
  muscle_gain: { small: 400, medium: 700, large: 1000 }
};

function estimateMealMacros(size: MealSize, goal: Goal): MacroEstimate {
  const calories = MEAL_SIZE_CALORIES[goal][size];
  const splits = GOAL_MACRO_SPLITS[goal];

  return {
    calories,
    protein: Math.round((calories * splits.protein) / 4),
    carbs: Math.round((calories * splits.carbs) / 4),
    fats: Math.round((calories * splits.fats) / 9)
  };
}
```

### 8.3 Consistency Score

```typescript
function calculateConsistencyScore(input: ConsistencyInput): number {
  const trainingScore = Math.min(30, input.trainingSessions * 10);
  const loggingScore = Math.min(20, Math.floor(input.daysWithMeals / 7 * 20));
  const calorieScore = Math.max(0, 25 - Math.abs(100 - input.avgCalorieAdherence) * 0.5);
  const proteinScore = Math.min(15, input.avgProteinAdherence * 0.15);
  const waterScore = Math.min(10, Math.floor(input.waterConsistency / 7 * 10));

  return Math.min(100, Math.max(0, Math.round(
    trainingScore + loggingScore + calorieScore + proteinScore + waterScore
  )));
}
```

### 8.4 Trial Period Calculation

```typescript
function getTrialDayNumber(trialStartDate: Date): number {
  const now = new Date();
  const diff = now.getTime() - trialStartDate.getTime();
  const dayNumber = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(7, Math.max(1, dayNumber));
}

function getDaysRemaining(endDate: Date): number {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.min(7, Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))));
}
```

---

## 9. Localization

### 9.1 Supported Languages

| Language | Code | Status |
|----------|------|--------|
| Serbian | `sr` | Primary |
| English | `en` | Secondary |

### 9.2 Translation Structure

```typescript
interface Translations {
  common: { cal, glasses, days, ... };
  home: { onTrack, caloriesLeft, macroBalance, ... };
  log: { title, iTrained, iAte, small, medium, large, ... };
  subscription: { title, trialPeriod, trialDaysLeft, ... };
  supplements: { title, recommended, optional, timing, dosage, ... };
  ...
}
```

### 9.3 Date Formatting

- Dates formatted with `sr-RS` locale
- Format: "27. decembar 2024"

---

## Appendix A: File Structure

```
/app
  /(auth)
    /login/page.tsx              # Member login (no gym theming)
    /staff-login/page.tsx        # Staff login (no gym theming)
    /layout.tsx                  # No ThemeProvider - uses default colors
  /(member)
    /home/page.tsx, home-client.tsx
    /log/page.tsx
    /chat/page.tsx               # Agent selection
    /chat/[agent]/page.tsx       # Per-agent chat (nutrition, supplements, training)
    /checkin/page.tsx
    /history/page.tsx
    /profile/page.tsx
    /goal/page.tsx
    /progress/page.tsx           # Calorie ring, macros, consistency score
    /subscription/page.tsx
    /supplements/page.tsx
    /meals/page.tsx              # Custom meal management
    /coaches/page.tsx            # Browse and request coaches
    /layout.tsx                  # ThemeProvider with gym colors
  /(staff)
    /dashboard/page.tsx          # Coach-only, redirects admins to gym-portal
    /register/page.tsx           # Coach member assignment
    /layout.tsx                  # ThemeProvider with gym colors
  /gym-portal
    /page.tsx                    # Public landing page (no auth)
    /gym-signup/page.tsx         # Gym registration
    /layout.tsx                  # Minimal layout (no ThemeProvider)
    /manage
      /page.tsx                  # Admin dashboard
      /layout.tsx                # Admin layout with auth check
      /members/page.tsx          # Member list
      /members/new/page.tsx      # Register new member
      /members/[id]/page.tsx     # Member details + subscription
      /staff/page.tsx            # Staff management
      /branding/page.tsx         # Gym branding (logo, colors)
  /api
    /auth/login, logout, staff-login
    /logs/route.ts               # Supports exact macros mode
    /checkins/route.ts
    /member/profile, subscription, nudges, meals, coaches
    /members/route.ts, [id]/route.ts
    /members/[id]/subscription/extend/route.ts  # Extend subscription
    /coach/assignments, nudges, knowledge, dashboard, member-requests
    /ai/agents/[type]/chat/route.ts  # Specialized AI agents
    /gym/settings/route.ts       # Gym settings + branding colors
    /gym/branding/route.ts       # Branding CRUD
    /staff/route.ts              # Staff list and creation
/components
  /ui/index.ts (GlassCard, Button, Modal, ProgressRing, Input, etc.)
/lib
  /auth.ts
  /db.ts
  /i18n.ts
  /calculations/index.ts
  /theme-context.tsx             # Gym theming (colors from primaryColor)
  /types/gym.ts                  # GymSettings, color utilities
/prisma
  /schema.prisma                 # Includes Gym branding fields
  /seed.ts
```

---

## Appendix B: Environment Variables

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="min-32-characters"
ANTHROPIC_API_KEY="sk-ant-..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

*End of SRS Document*
