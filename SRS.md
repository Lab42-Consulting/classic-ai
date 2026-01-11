# Software Requirements Specification (SRS)

## Classic Method - Gym Intelligence System

**Version:** 1.13
**Last Updated:** January 2026

**Changelog v1.13:**
- Added Difficulty Mode system (Simple, Standard, Pro) for personalized complexity levels
- Simple mode: One-tap logging, no macro tracking, challenge-focused experience
- Standard mode: Preset meal sizes (S/M/L) + saved meals, basic calorie/macro display
- Pro mode: Exact macro entry (P/C/F), coach meals, saved meals, full tracking features
- Mode selection available in onboarding and profile page
- Photo-based meal logging with AI analysis (rate limited: 3/day for active members)
- Added `difficultyMode` field to Member model
- Updated log page with mode-specific UI layouts

**Changelog v1.12:**
- Added Challenge Winners tracking and exclusion system
- Winners are automatically recorded when challenge ends
- Configurable winner exclusion: `excludeTopN` (default 3) determines how many top winners are excluded
- Configurable cooldown period: `winnerCooldownMonths` (default 3) determines how long winners must wait
- Members who won recently see a cooldown notice with end date
- Admin can configure exclusion settings per challenge
- Added `ChallengeWinner` model to track historical winners
- API returns `isEligible` and `cooldownInfo` for member eligibility

**Changelog v1.11:**
- Added Session Scheduling feature for coaches and members
- Sessions support back-and-forth counter-proposals
- Session types: training, consultation, check-in
- Duration options: 30, 45, 60, 90 minutes
- Location: gym or virtual
- 24-hour minimum advance notice required
- Cancellation requires reason (min 10 characters)
- Added SessionRequest, SessionProposal, and ScheduledSession models
- Members access sessions via Termini button on home page
- Coaches access sessions via /coach-sessions page

**Changelog v1.10:**
- Added Meal Photos feature for shared meals
- Photos required when sharing meals with the gym (optional for private meals)
- 4:3 landscape aspect ratio, max 1MB file size, base64 storage
- Added `photoUrl` field to `CustomMeal` model
- Admin pending meals page shows photos for approval review
- Removing photo from shared meal auto-unshares it
- Copying shared meal also copies the photo

**Changelog v1.9:**
- Added Gym QR Check-in system for challenge anti-cheating
- Training points in challenges now require verified gym check-in
- Members scan QR code at gym to verify presence before logging training
- Admin can enable/disable gym check-in and regenerate QR codes
- Added `GymCheckin` model and `checkinSecret` to Gym model
- Challenge API returns `gymCheckinRequired` and `checkedInToday` status
- Implemented daily rotating codes for enhanced security:
  - QR codes change automatically at midnight UTC
  - Generated from hash(masterSecret + date)
  - 1-hour grace period after midnight for edge cases
  - Admin sees countdown to next code rotation

**Changelog v1.8:**
- Added Week Reset feature for members to restart consistency tracking
- Members can reset their week from profile page for a fresh start
- Consistency score now normalizes based on available days (fair for new members)
- Added `weekResetAt` field to Member model
- Coach Challenge View-Only mode: coaches can view challenges but cannot participate
- Added `isStaffMember` flag to challenge API for role-based UI
- Data visibility restrictions: coaches no longer see subscription data
- Coach dashboard excludes expiring subscription stats (admin-only data)
- Coach member detail API returns filtered data without subscription info

**Changelog v1.7:**
- Added Challenge/Game System for member engagement
- Challenges allow admins to create time-limited competitions with points and rewards
- Members earn points by logging meals, training, water, check-ins, and daily streaks
- Challenge statuses: draft, upcoming, registration, active, ended
- Leaderboard with rank tracking and cached point totals
- Admin can publish, end, and delete challenges
- Member challenge page with join flow and real-time leaderboard
- Challenge banner on home page for non-participants
- Point configuration per challenge (admin customizable)

**Changelog v1.6:**
- Added Coach Performance Dashboard with analytics and charts
- Added Members Per Coach chart (vertical bar chart using Recharts)
- Added Consistency Comparison chart (horizontal bar chart)
- Added expandable rows in coach table showing assigned member details
- Added CSV export for coach performance data
- Added Members page enhancements with tabbed interface (Lista članova / Statistika)
- Added member charts: Activity Distribution, Goal Distribution, Subscription Status
- Added CSV export for members data
- Added pagination to members table (default 5, options 5/10/20)
- Staff page redesign with tabbed interface (Osoblje / Performanse trenera)
- Staff table view with search, filter by role, and pagination

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
- **Input:** Varies by difficulty mode (see table below)
- **Process:**
  1. Fetch user's current goal, coach settings, and difficulty mode
  2. Render mode-appropriate UI
  3. Calculate estimated or exact macros based on input
  4. Store log with timestamp and optional photo
- **Output:** Success confirmation, redirect to home

**Meal Logging by Difficulty Mode:**

| Mode | Available Options | Macro Tracking |
|------|-------------------|----------------|
| Simple | Quick one-tap log ("I ate"), no details | None - just logged |
| Standard | Preset sizes (S/M/L) + Saved meals | Estimated from size |
| Pro | Exact macro entry (P/C/F) + Coach meals + Saved meals | Full tracking |

**Meal Size Modes (Standard/Pro):**

| Mode | Description | Required Input |
|------|-------------|----------------|
| Small/Medium/Large | Preset sizes with automatic macro estimation | Size selection |
| Saved Meal | User's previously saved meal templates | Meal selection |
| Exact (Pro only) | Full macro tracking | Protein, Carbs, Fats (all required) |
| Coach Meal (Pro only) | Coach-created meal with ingredients | Meal selection |

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

#### FR-PROF-005: Week Reset
- **Purpose:** Allow members to restart their weekly consistency tracking
- **Location:** Profile page → "Resetuj nedelju" button
- **Trigger:** Member clicks reset button and confirms
- **Effect:**
  - Sets `weekResetAt` to current timestamp
  - Consistency score calculation starts fresh from reset date
  - Historical logs remain intact (not deleted)
  - Useful after vacation, illness, or extended inactivity
- **Confirmation:** Modal with warning about reset implications
- **API:** `POST /api/member/reset-week`

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
- **Auto-Assignment:** When a coach creates a new member via `/api/members`, the member is automatically assigned to that coach
- **Direct Assignment:** Coaches can directly assign existing unassigned gym members to themselves via `/api/coach/assign-direct` (bypasses the request/approval flow)

#### FR-STAFF-004: Coach Data Visibility Restrictions
- **Purpose:** Limit sensitive business data exposure to coaches
- **Restricted Data:**
  - Member subscription status and dates (admin-only)
  - Expiring subscription counts (admin-only)
  - Subscription history and extension dates
- **Coach Dashboard:** Does not include `expiringSubscriptions` object
- **Member Detail API:** Returns filtered member data for coaches:
  - Excludes: `subscribedAt`, `subscribedUntil`, `subscriptionStatus`
  - Includes: Profile, goals, weight, activity data
- **Rationale:** Subscription management is a business/admin concern

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
  - Tabbed interface: "Osoblje" (Staff list) and "Performanse trenera" (Coach Performance)
  - Staff table view with search and filter by role
  - Pagination for staff list (10 per page)
  - Add new staff member (coach or admin role)
  - Auto-generated Staff ID and PIN

#### FR-ADMIN-005a: Coach Performance Dashboard
- **Location:** `/gym-portal/manage/staff` → "Performanse trenera" tab
- **Charts (using Recharts library):**
  - Members Per Coach (vertical bar chart)
  - Consistency Comparison (horizontal bar chart, color-coded by score)
- **Performance Table:**
  - Sortable columns: Name, Members, Consistency, Nudge Rate
  - Expandable rows showing assigned member details
  - Member cards show: name, ID, status badge, consistency score
  - Search and pagination (10 per page)
- **Summary Cards:**
  - Total coaches count
  - Total coached members
  - Uncoached members count
  - Overall member status distribution (on track, slipping, off track)
- **CSV Export:**
  - Export coach performance data with summary
  - Includes: coach name, staff ID, member counts, nudge stats, outcomes

#### FR-ADMIN-005b: Member Management Enhancements
- **Location:** `/gym-portal/manage/members`
- **Tabbed Interface:**
  - "Lista članova" tab: Member table with filters
  - "Statistika" tab: Visual charts and analytics
- **Charts (Statistika tab):**
  - Activity Distribution (pie chart: active, slipping, inactive)
  - Goal Distribution (horizontal bar chart: fat_loss, muscle_gain, recomposition)
  - Subscription Status (pie chart: active, expiring soon, expired)
- **Pagination:**
  - Default: 5 members per page
  - Options: 5, 10, 20 per page
  - Page size selector and navigation controls
- **CSV Export:**
  - Download members data with summary
  - Includes: name, ID, goal, activity status, subscription, coach

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

#### FR-ADMIN-007: Pending Meals Approval
- **Location:** `/gym-portal/manage/pending-meals`
- **Purpose:** Review and approve/reject meals that members want to share with the gym
- **Features:**
  - Grid display of pending meals with photos
  - Shows meal name, calories, macros, ingredients
  - Member info (name, ID) who submitted the meal
  - Request timestamp
  - Approve/Reject action buttons
- **Photo Display:**
  - 4:3 aspect ratio meal photos prominently displayed
  - Helps admin evaluate meal quality for sharing
- **Actions:**
  - **Approve:** Sets `shareApproved: true`, meal visible to all gym members
  - **Reject:** Sets `isShared: false`, meal remains private to the member
- **Quick Access:** Link from admin dashboard Quick Actions section

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

### 3.14 Challenge/Game System

The challenge system provides gamification features for member engagement through time-limited competitions.

#### FR-CHAL-001: Challenge Lifecycle
- **Statuses:**
  - `draft`: Admin-only, not visible to members
  - `upcoming`: Published but before start date, members can view but not join
  - `registration`: Active and open for member registration
  - `active`: Ongoing, registration window may be closed
  - `ended`: Challenge completed (manual or automatic)
- **Status Computation:** Based on dates and manual status field
- **Constraint:** One active challenge per gym at a time

#### FR-CHAL-002: Challenge Creation (Admin)
- **Location:** `/gym-portal/manage/challenges`
- **Fields:**
  - Name, Description, Reward Description
  - Start Date, End Date
  - Join Deadline (days after start)
  - Winner Count (default: 3)
  - Point Configuration (per action)
- **Default Point Values:**

| Action | Default Points |
|--------|----------------|
| Meal logged | 5 |
| Training logged | 15 |
| Water glass | 1 |
| Weekly check-in | 25 |
| Daily streak bonus | 5 |

#### FR-CHAL-003: Challenge Publishing
- **Action:** Admin clicks "Objavi" on draft challenge
- **Effect:** Status changes from `draft` to `registration`
- **Computed Status:**
  - If start date in future → shows as `upcoming`
  - If start date passed → shows as `registration`

#### FR-CHAL-004: Challenge Joining (Member)
- **Location:** `/challenge` or home page banner
- **Eligibility:**
  - Challenge must be in `registration` or `active` status
  - Must be within join deadline (startDate + joinDeadlineDays)
  - Member not already participating
- **Effect:** Creates `ChallengeParticipant` record with zero points

#### FR-CHAL-005: Point Awarding
- **Trigger:** Member logs meal, training, water, or check-in
- **Process:**
  1. Check if member is participating in active challenge
  2. Award points based on challenge configuration
  3. Calculate streak bonus if applicable
  4. Update cached totals in `ChallengeParticipant`
- **Streak Bonus:**
  - Awarded once per day for consecutive days of activity
  - Resets if no activity for 24+ hours

#### FR-CHAL-006: Leaderboard
- **Display:** Ranked list of participants by total points
- **Data:** Cached in `ChallengeParticipant.totalPoints` for performance
- **Breakdown:** Shows points by category (meals, training, water, check-in, streak)
- **Tie-breaking:** Earlier join date wins

#### FR-CHAL-007: Challenge End
- **Automatic:** When end date passes
- **Manual:** Admin clicks "Završi izazov"
- **Effect:**
  - Status becomes `ended`, leaderboard frozen
  - Winners (top N based on `winnerCount`) are saved to `ChallengeWinner` table
  - Winners recorded with rank, totalPoints, and timestamp
- **Transaction:** Winner saving and status update happen atomically

#### FR-CHAL-008: Member Challenge View
- **Location:** `/challenge`
- **States:**
  1. No active challenge → Empty state
  2. Challenge upcoming → Preview with countdown
  3. Not joined, can join → Join prompt with reward info
  4. Joined → Rank card + full leaderboard

#### FR-CHAL-009: Home Page Integration
- **Banner Display:** Shows when:
  - Active/upcoming challenge exists
  - Member not participating
  - Registration still open OR challenge is upcoming
- **Banner Content:**
  - Challenge name and reward
  - Participant count
  - Days until deadline (registration) or days until start (upcoming)
- **Styling:** Emerald for joinable, Amber for upcoming

#### FR-CHAL-010: Coach View-Only Mode
- **Purpose:** Coaches can monitor challenges but cannot participate
- **Behavior:**
  - Coaches accessing `/challenge` see read-only leaderboard view
  - Blue info banner explains view-only mode
  - No "Join" button displayed for coaches
  - `POST /api/member/challenge` returns 403 for coaches
- **API Response:** Includes `isStaffMember: true` flag for coaches
- **Rationale:** Coaches should monitor member progress without competing

#### FR-CHAL-011: Winner Exclusion System
- **Purpose:** Prevent recent winners from dominating consecutive challenges
- **Configuration (per challenge):**
  - `excludeTopN` (default 3): Top N winners from previous challenges are excluded
  - `winnerCooldownMonths` (default 3): Duration of the exclusion period
- **Eligibility Check:**
  - When member tries to join a challenge, system checks `ChallengeWinner` records
  - Looks for wins within the cooldown period where rank ≤ `excludeTopN`
  - If found: Member cannot join, shown cooldown notice with end date
- **API Response:** Returns `isEligible: false` and `cooldownInfo` object with:
  - `reason`: Human-readable explanation in Serbian
  - `endsAt`: Date when cooldown expires
  - `challengeName`: Name of the challenge they won
- **UI Behavior:**
  - Ineligible members see congratulatory banner with cooldown info
  - Can still view leaderboard but cannot join
  - Shows countdown to when they can participate again

### 3.15 Gym QR Check-in System

The gym check-in system provides anti-cheating verification for challenge participants by requiring physical gym presence.

#### FR-CHECKIN-001: Gym Check-in Setup (Admin)
- **Purpose:** Admin enables QR-based gym check-in for challenge verification
- **Location:** `/gym-portal/manage/settings` or admin check-in settings
- **Actions:**
  - **Enable:** Generate a unique UUID check-in secret
  - **Regenerate:** Create a new QR code (invalidates old one)
  - **Disable:** Remove check-in requirement
- **Stats Display:** Today's check-ins, total check-ins

#### FR-CHECKIN-002: Member Gym Check-in
- **Purpose:** Members verify gym presence before logging training
- **Process:**
  1. Gym displays QR code containing `checkinSecret`
  2. Member scans QR code (or enters secret manually)
  3. System validates secret against gym's `checkinSecret`
  4. Creates `GymCheckin` record for today
  5. Member can now log training for challenge points
- **Constraint:** One check-in per member per day

#### FR-CHECKIN-003: Challenge Training Verification
- **Purpose:** Prevent cheating by requiring gym presence for training points
- **Behavior:**
  - When member logs training during active challenge
  - System checks if gym has `checkinSecret` enabled
  - If enabled: Training points only awarded if checked in today
  - If disabled: Training points awarded normally (no verification)
- **API Response:** Returns `no_gym_checkin` reason if check-in required but missing

#### FR-CHECKIN-004: Challenge API Check-in Status
- **Purpose:** Frontend knows whether to prompt for check-in
- **Fields returned in `GET /api/member/challenge`:**
  - `gymCheckinRequired`: Boolean - gym has check-in enabled
  - `checkedInToday`: Boolean - member checked in today
- **UI Behavior:**
  - If `gymCheckinRequired && !checkedInToday`: Show check-in prompt
  - If `gymCheckinRequired && checkedInToday`: Show green verified badge
  - If `!gymCheckinRequired`: Hide check-in UI

### 3.16 Session Scheduling System

The session scheduling system enables coaches and members to schedule appointments with back-and-forth counter-proposals.

#### FR-SESSION-001: Session Request Creation
- **Purpose:** Allow coaches and members to request sessions with each other
- **Initiator:** Either coach or member can initiate
- **Required Fields:**
  - Session type: "training" | "consultation" | "checkin"
  - Proposed date/time (minimum 24 hours in advance)
  - Duration: 30 | 45 | 60 | 90 minutes
  - Location: "gym" | "virtual"
  - Note (optional)
- **Validation:**
  - Member must have assigned coach (for member-initiated)
  - Coach can only request sessions with assigned members
  - Proposed time must be at least 24 hours in the future

#### FR-SESSION-002: Counter-Proposal Flow
- **Purpose:** Allow back-and-forth negotiation on session details
- **Status Flow:**
  ```
  PENDING ──┬── ACCEPTED ──→ Session created (CONFIRMED)
            │                      │
            ├── DECLINED           ├── COMPLETED
            │                      │
            └── COUNTERED ──→ PENDING (other party's turn)
                                └── (loop continues)
  ```
- **Counter-Proposal:**
  - Can modify: date/time, duration, location, note
  - Creates entry in proposal history for audit trail
  - Increments counter count
  - Sets `lastActionBy` to track whose turn it is

#### FR-SESSION-003: Session Confirmation
- **Trigger:** One party accepts the current proposal
- **Effect:**
  - SessionRequest status becomes "accepted"
  - ScheduledSession record created with confirmed details
  - Both parties can view confirmed session in their sessions list

#### FR-SESSION-004: Session Cancellation
- **Who Can Cancel:** Both coach and member can cancel confirmed sessions
- **Requirements:**
  - Cancellation reason required (minimum 10 characters)
  - Records `cancelledBy`, `cancelledAt`, `cancellationReason`
- **Effect:** Session status becomes "cancelled"

#### FR-SESSION-005: Session Completion (Coach Only)
- **Purpose:** Coach marks session as completed after it occurs
- **Effect:** Session status becomes "completed", `completedAt` timestamp set

#### FR-SESSION-006: Member Sessions Page
- **Location:** `/sessions`
- **Access:** Trainer button on home page (when member has coach)
- **Display:**
  - Pending requests requiring action (highlight whose turn)
  - Upcoming confirmed sessions
  - Past sessions (collapsible)
  - "Request Session" button
- **Actions:**
  - Accept, Counter, or Decline pending requests
  - Cancel confirmed sessions
  - Create new session requests

#### FR-SESSION-007: Coach Sessions Page
- **Location:** `/coach-sessions`
- **Access:** Session requests card on coach dashboard
- **Display:**
  - All pending requests across members
  - Upcoming confirmed sessions
  - Past sessions
- **Actions:**
  - Accept, Counter, or Decline pending requests
  - Cancel confirmed sessions
  - Mark sessions as completed
  - Create new session requests for assigned members

#### FR-SESSION-008: Dashboard Integration
- **Member Home:** Trainer button navigates to `/sessions` (when has coach)
- **Coach Dashboard:** Session requests card shows pending count with preview

### 3.17 Difficulty Mode System

The difficulty mode system allows members to choose their preferred complexity level for the app experience.

#### FR-DIFF-001: Mode Definitions

| Mode | Target User | Features | UI Complexity |
|------|-------------|----------|---------------|
| Simple | Casual users, beginners | One-tap logging, challenges, basic stats | Minimal |
| Standard | Regular gym-goers | Preset sizes, saved meals, calorie ring | Balanced |
| Pro | Serious athletes, coached members | Exact macros, coach meals, full analytics | Full |

#### FR-DIFF-002: Simple Mode Experience
- **Logging:** Quick one-tap buttons ("I trained", "I ate", "Drank water")
- **Meals:** No size selection, no macro tracking, just "I ate"
- **Display:** No calorie ring, no macro bars, no detailed stats
- **Focus:** Challenge participation and accountability
- **AI Chat:** Not available (redirects to upgrade)

#### FR-DIFF-003: Standard Mode Experience
- **Logging:** Training, water, preset meal sizes (S/M/L), saved meals
- **Meals:** Preset sizes with estimated macros, saved meal templates
- **Display:** Calorie ring, basic macro overview
- **Features:** Photo meal logging with AI analysis, saved meals
- **Restriction:** No custom/exact macro entry (Pro only)

#### FR-DIFF-004: Pro Mode Experience
- **Logging:** All options including exact macro entry (P/C/F)
- **Meals:** Exact macros, coach-created meals, saved meals, full ingredient tracking
- **Display:** Full calorie ring, detailed macro bars, all analytics
- **Features:** All AI features, coach integration, custom targets
- **Coach Integration:** `requireExactMacros` enforcement available

#### FR-DIFF-005: Mode Selection
- **Onboarding:** New users select mode during onboarding flow
- **Profile:** Mode can be changed anytime via profile page
- **Default:** "standard" for new members
- **Persistence:** Stored in `Member.difficultyMode` field

#### FR-DIFF-006: Mode Transition
- **Upgrading (Simple → Standard → Pro):** Immediate, full features unlock
- **Downgrading (Pro → Standard → Simple):** Immediate, features hide but data preserved
- **Coach Override:** Coach assignment may require Pro mode for `requireExactMacros`

### 3.18 Photo-Based Meal Logging

AI-powered meal analysis from photos for faster logging.

#### FR-PHOTO-001: Photo Capture
- **Trigger:** User taps camera icon or "Snap Photo" button
- **Input:** Camera capture or gallery selection
- **Constraints:** Max 1MB file size, JPEG/PNG/WebP formats
- **Storage:** Base64 encoded in DailyLog.mealPhotoUrl

#### FR-PHOTO-002: AI Meal Analysis
- **Purpose:** Estimate macros from meal photo using vision AI
- **Model:** Claude 3 Haiku (cost-efficient)
- **Output:** Estimated calories, protein, carbs, fats, meal description
- **Confidence:** Returns "high", "medium", or "low" confidence level
- **User Action:** Can accept AI estimates or edit before logging

#### FR-PHOTO-003: Rate Limiting (Cost Control)
- **Trial users:** 0 photo analyses per day (button disabled)
- **Active subscribers:** 3 photo analyses per day
- **Display:** Shows remaining uses "(2/3 danas)"
- **Fallback:** When limit reached, use preset size estimation

#### FR-PHOTO-004: Photo Analysis Flow
1. User takes/selects photo
2. Optionally describes meal in text input
3. Selects meal size (S/M/L) for base estimation
4. Optionally taps "AI Analiza" for vision-based estimate
5. Reviews and edits estimates if needed
6. Confirms to log meal with photo

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

  // Difficulty mode for UI complexity
  difficultyMode      String          @default("standard") // simple | standard | pro

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

  // Week reset - when set, consistency tracking starts from this date
  weekResetAt         DateTime?

  // Relations
  gymId               String
  gym                 Gym             @relation(...)
  dailyLogs           DailyLog[]
  weeklyCheckins      WeeklyCheckin[]
  aiSummaries         AISummary[]
  chatMessages        ChatMessage[]
  challengeParticipations ChallengeParticipant[]

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

### 5.8 Challenge Model

```prisma
model Challenge {
  id                String   @id @default(cuid())
  gymId             String
  gym               Gym      @relation(fields: [gymId], references: [id], onDelete: Cascade)

  name              String
  description       String   @db.Text
  rewardDescription String   @db.Text

  startDate         DateTime
  endDate           DateTime
  joinDeadlineDays  Int      @default(7)

  winnerCount       Int      @default(3)
  status            String   @default("draft") // draft | registration | active | ended

  // Point configuration
  pointsPerMeal     Int      @default(5)
  pointsPerTraining Int      @default(15)
  pointsPerWater    Int      @default(1)
  pointsPerCheckin  Int      @default(25)
  streakBonus       Int      @default(5)

  // Winner exclusion settings
  excludeTopN          Int   @default(3)   // Top N winners are excluded from future challenges
  winnerCooldownMonths Int   @default(3)   // Months until winners can participate again

  participants      ChallengeParticipant[]
  winners           ChallengeWinner[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([gymId])
  @@index([gymId, status])
  @@index([startDate, endDate])
  @@map("challenges")
}
```

### 5.9 ChallengeParticipant Model

```prisma
model ChallengeParticipant {
  id             String    @id @default(cuid())
  challengeId    String
  challenge      Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  memberId       String
  member         Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)

  // Cached point totals for fast leaderboard queries
  totalPoints    Int       @default(0)
  mealPoints     Int       @default(0)
  trainingPoints Int       @default(0)
  waterPoints    Int       @default(0)
  checkinPoints  Int       @default(0)
  streakPoints   Int       @default(0)

  // Streak tracking
  currentStreak  Int       @default(0)
  lastActiveDate DateTime?

  joinedAt       DateTime  @default(now())

  @@unique([challengeId, memberId])
  @@index([challengeId, totalPoints])
  @@map("challenge_participants")
}
```

### 5.10 ChallengeWinner Model

```prisma
model ChallengeWinner {
  id          String   @id @default(cuid())
  challengeId String
  memberId    String
  rank        Int      // Final rank (1, 2, 3, etc.)
  totalPoints Int      // Points at time of win
  wonAt       DateTime @default(now())

  challenge   Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  member      Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([challengeId, memberId])
  @@index([memberId])
  @@index([memberId, wonAt])
  @@map("challenge_winners")
}
```

**Purpose**: Records winners when a challenge ends, enabling the winner exclusion system to prevent repeated winners from dominating consecutive challenges.

**Key Fields**:
- `rank`: Final position (1st, 2nd, 3rd, etc.)
- `totalPoints`: Points at the time of winning
- `wonAt`: Timestamp for calculating cooldown period

### 5.11 GymCheckin Model

```prisma
model GymCheckin {
  id        String   @id @default(cuid())
  memberId  String
  member    Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  gymId     String
  gym       Gym      @relation(fields: [gymId], references: [id], onDelete: Cascade)
  date      DateTime @db.Date  // Date only (no time), for one check-in per day
  createdAt DateTime @default(now())

  @@unique([memberId, date])  // One check-in per member per day
  @@index([memberId])
  @@index([gymId])
  @@index([memberId, date])
  @@map("gym_checkins")
}
```

**Gym Model Addition:**
```prisma
model Gym {
  // ... existing fields
  checkinSecret  String?  // UUID for QR check-in verification
  gymCheckins    GymCheckin[]
}
```

### 5.12 CustomMeal Model

```prisma
model CustomMeal {
  id                 String             @id @default(cuid())
  memberId           String
  member             Member             @relation(fields: [memberId], references: [id], onDelete: Cascade)
  gymId              String
  gym                Gym                @relation(fields: [gymId], references: [id], onDelete: Cascade)

  name               String
  totalCalories      Int
  totalProtein       Int?
  totalCarbs         Int?
  totalFats          Int?
  isManualTotal      Boolean            @default(false)

  // Meal photo (required for shared meals, optional for private)
  photoUrl           String?            @db.Text  // Base64 encoded image (4:3 landscape, max 1MB)

  // Sharing with gym
  isShared           Boolean            @default(false)
  shareApproved      Boolean            @default(false)
  shareRequestedAt   DateTime?

  // Coach-created meal (null for member-created)
  createdByCoachId   String?
  createdByCoach     Staff?             @relation(fields: [createdByCoachId], references: [id])

  ingredients        CustomMealIngredient[]

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@index([memberId])
  @@index([gymId, isShared, shareApproved])
  @@map("custom_meals")
}

model CustomMealIngredient {
  id           String      @id @default(cuid())
  mealId       String
  meal         CustomMeal  @relation(fields: [mealId], references: [id], onDelete: Cascade)

  name         String
  portionSize  String      // e.g., "150g", "1 cup", "2 pieces"
  calories     Int
  protein      Int?
  carbs        Int?
  fats         Int?

  createdAt    DateTime    @default(now())

  @@index([mealId])
  @@map("custom_meal_ingredients")
}
```

**Meal Photo Constraints:**
- Photo is **required** when `isShared` is `true`
- 4:3 landscape aspect ratio (800x600 pixels output)
- Maximum 1MB file size (base64 encoded)
- Supported formats: JPEG, PNG, WebP
- Removing photo from shared meal auto-unshares the meal

### 5.13 SessionRequest Model

```prisma
model SessionRequest {
  id              String   @id @default(cuid())
  staffId         String
  memberId        String

  // Session details (current proposal)
  sessionType     String   // "training" | "consultation" | "checkin"
  proposedAt      DateTime // Proposed date/time
  duration        Int      // 30 | 45 | 60 | 90 minutes
  location        String   // "gym" | "virtual"
  note            String?  @db.Text

  // Request tracking
  initiatedBy     String   // "coach" | "member"
  status          String   @default("pending") // "pending" | "countered" | "accepted" | "declined"
  counterCount    Int      @default(0)
  lastActionBy    String?  // "coach" | "member"
  lastActionAt    DateTime @default(now())

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  staff           Staff    @relation(fields: [staffId], references: [id], onDelete: Cascade)
  member          Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  proposalHistory SessionProposal[]

  @@index([staffId])
  @@index([memberId])
  @@index([status])
  @@map("session_requests")
}
```

### 5.14 SessionProposal Model

```prisma
model SessionProposal {
  id               String         @id @default(cuid())
  sessionRequestId String
  sessionRequest   SessionRequest @relation(fields: [sessionRequestId], references: [id], onDelete: Cascade)

  proposedBy      String   // "coach" | "member"
  proposedAt      DateTime
  duration        Int
  location        String
  note            String?  @db.Text

  response        String?  // "accepted" | "declined" | "countered"
  responseAt      DateTime?
  createdAt       DateTime @default(now())

  @@index([sessionRequestId])
  @@map("session_proposals")
}
```

### 5.15 ScheduledSession Model

```prisma
model ScheduledSession {
  id              String   @id @default(cuid())
  staffId         String
  memberId        String

  sessionType     String   // "training" | "consultation" | "checkin"
  scheduledAt     DateTime
  duration        Int      // 30 | 45 | 60 | 90 minutes
  location        String   // "gym" | "virtual"
  note            String?  @db.Text

  status          String   @default("confirmed") // "confirmed" | "completed" | "cancelled"

  cancelledAt     DateTime?
  cancelledBy     String?  // "coach" | "member"
  cancellationReason String? @db.Text
  completedAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  staff           Staff    @relation(fields: [staffId], references: [id], onDelete: Cascade)
  member          Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@index([staffId])
  @@index([memberId])
  @@index([scheduledAt])
  @@map("scheduled_sessions")
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

#### POST /api/member/reset-week
```json
// Request - No body required

// Response (200)
{
  "success": true,
  "message": "Nedelja uspešno resetovana",
  "weekResetAt": "2025-01-03T12:00:00Z"
}

// Response (401)
{ "error": "Unauthorized", "code": "NO_SESSION" }
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

#### POST /api/coach/assign-direct
Direct assignment endpoint that bypasses the request/approval flow. Used when coach registers a member or for bulk assignment of unassigned gym members.

```json
// Request - Directly assign member to coach
{
  "memberId": "member-cuid"
}

// Response (200)
{
  "success": true,
  "assignment": {
    "id": "assignment-cuid",
    "member": { "id": "...", "memberId": "ABC123", "name": "John Doe", "avatarUrl": null },
    "assignedAt": "2024-12-28T10:00:00Z"
  }
}

// Response (400) - Member already has coach
{ "error": "Member already has a coach assigned" }

// Response (403) - Not a coach
{ "error": "Only coaches can assign members to themselves" }

// Response (404) - Member not found
{ "error": "Member not found in your gym" }
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

### 7.7 Challenges (Admin)

#### GET /api/admin/challenges
```json
// Response (200) - List challenges for gym
{
  "challenges": [
    {
      "id": "challenge-cuid",
      "name": "Zimski Izazov",
      "computedStatus": "active",
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-01-31T00:00:00Z",
      "participantCount": 15
    }
  ]
}
```

#### POST /api/admin/challenges
```json
// Request - Create new challenge
{
  "name": "Zimski Izazov",
  "description": "Održi formu tokom zime!",
  "rewardDescription": "Top 3: Mesečna članarina gratis",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "joinDeadlineDays": 7,
  "winnerCount": 3,
  "pointsPerMeal": 5,
  "pointsPerTraining": 15,
  "pointsPerWater": 1,
  "pointsPerCheckin": 25,
  "streakBonus": 5
}

// Response (201)
{ "success": true, "challenge": { ... } }

// Response (400) - Already has active challenge
{ "error": "Another challenge is already active" }
```

#### GET /api/admin/challenges/[id]
```json
// Response (200) - Challenge with leaderboard
{
  "challenge": {
    "id": "challenge-cuid",
    "name": "Zimski Izazov",
    "computedStatus": "active",
    "participantCount": 15,
    ...
  },
  "leaderboard": [
    {
      "member": { "id": "...", "name": "Marko" },
      "totalPoints": 145,
      "mealPoints": 60,
      "trainingPoints": 45,
      ...
    }
  ]
}
```

#### PATCH /api/admin/challenges/[id]
```json
// Request - Update challenge (draft/registration only)
{ "name": "Updated Name", ... }

// Request - Publish challenge
{ "action": "publish" }

// Request - End challenge early (automatically records winners to ChallengeWinner table)
{ "action": "end" }

// Response (200)
{ "success": true, "challenge": { ... }, "winnersRecorded": 3 }
```

#### DELETE /api/admin/challenges/[id]
```json
// Only allowed for draft challenges with no participants

// Response (200)
{ "success": true }

// Response (400)
{ "error": "Only draft challenges can be deleted" }
```

### 7.8 Challenges (Member)

#### GET /api/member/challenge
```json
// Response (200) - Active challenge info
{
  "challenge": {
    "id": "challenge-cuid",
    "name": "Zimski Izazov",
    "description": "...",
    "rewardDescription": "...",
    "status": "active",
    "canJoin": true,
    "daysUntilDeadline": 5,
    "daysUntilEnd": 25,
    "daysUntilStart": 0,
    "participantCount": 15,
    "pointsPerMeal": 5,
    ...
  },
  "participation": {
    "totalPoints": 145,
    "mealPoints": 60,
    "trainingPoints": 45,
    ...
  },
  "rank": 3,
  "leaderboard": [...],
  "isEligible": true,
  "cooldownInfo": null
}

// Response (200) - Member in cooldown from previous win
{
  "challenge": { ... },
  "participation": null,
  "isEligible": false,
  "cooldownInfo": {
    "reason": "Kao pobednik izazova \"Prolećni Izazov\", ne možeš učestvovati do 15.04.2026",
    "endsAt": "2026-04-15T00:00:00Z",
    "challengeName": "Prolećni Izazov"
  }
}

// Response (200) - No active challenge
{ "challenge": null, "participation": null, "leaderboard": [], "rank": null }
```

#### POST /api/member/challenge
```json
// Request - Join challenge (no body required)

// Response (200)
{ "success": true, "participation": { "id": "...", "joinedAt": "..." } }

// Response (400) - Registration closed
{ "error": "Rok za prijavu je istekao" }

// Response (400) - Already participating
{ "error": "Već učestvuješ u ovom izazovu" }

// Response (403) - Winner cooldown active
{
  "error": "Kao pobednik izazova \"Prolećni Izazov\", ne možeš učestvovati do 15.04.2026",
  "code": "WINNER_COOLDOWN",
  "cooldownEndsAt": "2026-04-15T00:00:00Z"
}
```

### 7.9 Gym Check-in (Admin)

#### GET /api/admin/gym-checkin
```json
// Response (200) - Check-in settings and stats
{
  "hasSecret": true,
  "checkinSecret": "uuid-secret-here",
  "stats": {
    "todayCheckins": 15,
    "totalCheckins": 342
  }
}
```

#### POST /api/admin/gym-checkin
```json
// Generate new check-in secret

// Response (200)
{
  "success": true,
  "message": "Novi kod za prijavu je generisan",
  "checkinSecret": "new-uuid-secret"
}
```

#### DELETE /api/admin/gym-checkin
```json
// Disable check-in (remove secret)

// Response (200)
{
  "success": true,
  "message": "Sistem prijave je deaktiviran"
}
```

### 7.10 Gym Check-in (Member)

#### GET /api/member/gym-checkin
```json
// Response (200) - Check-in status
{
  "checkedInToday": true,
  "checkInTime": "2025-01-03T10:30:00Z",
  "hasActiveChallenge": true
}

// Response (200) - Not checked in
{
  "checkedInToday": false,
  "checkInTime": null,
  "hasActiveChallenge": true
}
```

#### POST /api/member/gym-checkin
```json
// Request - Verify gym presence
{ "secret": "uuid-from-qr-code" }

// Response (200) - Success
{
  "success": true,
  "message": "Uspešna prijava u teretanu"
}

// Response (200) - Already checked in
{
  "success": true,
  "message": "Već si prijavljen/a danas",
  "alreadyCheckedIn": true
}

// Response (400) - Invalid secret
{ "error": "Neispravan kod za prijavu" }
```

### 7.11 Session Scheduling (Member)

#### GET /api/member/sessions
```json
// Response (200) - Sessions data
{
  "requests": [
    {
      "id": "request-cuid",
      "sessionType": "training",
      "proposedAt": "2026-01-10T10:00:00Z",
      "duration": 60,
      "location": "gym",
      "note": "Upper body focus",
      "status": "pending",
      "initiatedBy": "coach",
      "lastActionBy": "coach",
      "counterCount": 0,
      "staff": { "id": "...", "name": "Coach Marko", "avatarUrl": null }
    }
  ],
  "upcoming": [
    {
      "id": "session-cuid",
      "sessionType": "training",
      "scheduledAt": "2026-01-15T14:00:00Z",
      "duration": 60,
      "location": "gym",
      "status": "confirmed",
      "staff": { "id": "...", "name": "Coach Marko", "avatarUrl": null }
    }
  ],
  "past": [...],
  "coach": { "id": "...", "name": "Coach Marko", "avatarUrl": null }
}
```

#### POST /api/member/sessions
```json
// Request - Create session request
{
  "sessionType": "training",
  "proposedAt": "2026-01-10T10:00:00Z",
  "duration": 60,
  "location": "gym",
  "note": "Would like to focus on upper body"
}

// Response (201)
{ "success": true, "request": { ... } }

// Response (400) - No coach assigned
{ "error": "You must have an assigned coach to request sessions" }

// Response (400) - Invalid time
{ "error": "Session must be scheduled at least 24 hours in advance" }
```

#### POST /api/member/sessions/requests/[id]
```json
// Request - Accept
{ "action": "accept" }

// Request - Decline
{ "action": "decline" }

// Request - Counter
{
  "action": "counter",
  "proposedAt": "2026-01-11T11:00:00Z",
  "duration": 45,
  "location": "virtual",
  "note": "Can we do earlier?"
}

// Response (200)
{ "success": true }

// Response (200) - Accept creates session
{ "success": true, "session": { ... } }
```

#### POST /api/member/sessions/[id]/cancel
```json
// Request - Cancel confirmed session
{ "reason": "I have a scheduling conflict, need to reschedule" }

// Response (200)
{ "success": true }

// Response (400) - Reason too short
{ "error": "Cancellation reason must be at least 10 characters" }
```

### 7.12 Session Scheduling (Coach)

#### GET /api/coach/sessions
```json
// Response (200) - Sessions data
{
  "requests": [...],
  "upcoming": [...],
  "past": [...],
  "members": [
    { "id": "...", "name": "Marko", "avatarUrl": null }
  ]
}
```

#### POST /api/coach/sessions
```json
// Request - Create session request for member
{
  "memberId": "member-cuid",
  "sessionType": "consultation",
  "proposedAt": "2026-01-10T15:00:00Z",
  "duration": 30,
  "location": "virtual",
  "note": "Let's review your progress"
}

// Response (201)
{ "success": true, "request": { ... } }

// Response (400) - Not assigned to member
{ "error": "You can only request sessions with your assigned members" }
```

#### POST /api/coach/sessions/requests/[id]
```json
// Same as member endpoint - accept, decline, or counter
```

#### POST /api/coach/sessions/[id]/cancel
```json
// Same as member endpoint - requires reason
```

#### POST /api/coach/sessions/[id]/complete
```json
// Request - Mark session as completed (no body required)

// Response (200)
{ "success": true }

// Response (400) - Not in the past
{ "error": "Cannot mark future session as completed" }
```

### 7.13 Photo Meal Analysis

#### POST /api/ai/analyze-meal-photo
```json
// Request - Analyze meal photo with AI
{
  "photo": "base64-encoded-image-data",
  "sizeHint": "medium",  // Optional: small | medium | large
  "goal": "fat_loss"     // Optional: defaults to member's goal
}

// Response (200) - Successful analysis
{
  "success": true,
  "estimation": {
    "description": "Piletina sa risom",
    "items": ["piletina ~150g", "beli pirinač ~100g", "mešana salata ~80g"],
    "calories": 520,
    "protein": 45,
    "carbs": 50,
    "fats": 12,
    "confidence": "high"
  },
  "remaining": 2,
  "limit": 3
}

// Response (429) - Rate limit exceeded
{
  "error": "Daily photo analysis limit reached",
  "remaining": 0,
  "limit": 3,
  "message": "AI analiza nije dostupna (limit 3/dan). Koristi procenu na osnovu veličine obroka."
}

// Response (400) - Photo too large
{ "error": "Photo too large. Maximum 1MB." }

// Response (422) - Analysis failed
{ "error": "Could not analyze meal photo. Try again or use manual entry." }
```

#### GET /api/ai/analyze-meal-photo
```json
// Response (200) - Current usage status
{
  "used": 1,
  "remaining": 2,
  "limit": 3,
  "available": true
}
```

### 7.14 Member Difficulty Mode

#### PATCH /api/member/profile (Difficulty Mode)
```json
// Request - Update difficulty mode
{ "difficultyMode": "pro" }

// Response (200)
{ "success": true }

// Valid values: "simple" | "standard" | "pro"
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

The consistency score normalizes based on available days, ensuring fair scoring for new members and those who reset their week.

```typescript
interface ConsistencyInput {
  trainingSessions: number;
  daysWithMeals: number;
  avgCalorieAdherence: number;
  avgProteinAdherence: number;
  waterConsistency: number;
  availableDays?: number; // 1-7, defaults to 7
}

function calculateConsistencyScore(input: ConsistencyInput): number {
  const daysToEvaluate = Math.min(7, Math.max(1, input.availableDays ?? 7));

  // Training (0-30): Normalized expectation based on available days
  const expectedTraining = Math.max(1, Math.ceil(daysToEvaluate * (3 / 7)));
  const trainingScore = Math.min(1, input.trainingSessions / expectedTraining) * 30;

  // Logging (0-20): Full score if logged all available days
  const loggingScore = Math.min(20, (input.daysWithMeals / daysToEvaluate) * 20);

  // Calories (0-25): Only if meals logged
  const calorieScore = input.daysWithMeals > 0
    ? Math.max(0, 25 - Math.abs(100 - input.avgCalorieAdherence) * 0.5)
    : 0;

  // Protein (0-15): Only if meals logged
  const proteinScore = input.daysWithMeals > 0
    ? Math.min(15, input.avgProteinAdherence * 0.15)
    : 0;

  // Water (0-10): Normalized to available days
  const waterScore = Math.min(10, (input.waterConsistency / daysToEvaluate) * 10);

  return Math.min(100, Math.max(0, Math.round(
    trainingScore + loggingScore + calorieScore + proteinScore + waterScore
  )));
}
```

### 8.4 Available Days Calculation

```typescript
function calculateAvailableDays(
  memberCreatedAt: Date,
  weekResetAt: Date | null,
  mondayOfThisWeek: Date
): number {
  // Use weekResetAt if set, otherwise createdAt
  const startDate = weekResetAt || memberCreatedAt;

  const now = new Date();
  const daysSinceStart = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const dayOfWeek = now.getDay();
  const daysPassedThisWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

  // If started before this week, use full week
  if (startDate.getTime() < mondayOfThisWeek.getTime()) {
    return daysPassedThisWeek;
  }

  // Otherwise, use days since start/reset
  return Math.min(daysSinceStart, daysPassedThisWeek, 7);
}
```

### 8.5 Trial Period Calculation

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
      /pending-meals/page.tsx    # Admin meal approval queue
  /api
    /auth/login, logout, staff-login
    /logs/route.ts               # Supports exact macros mode
    /checkins/route.ts
    /member/profile, subscription, nudges, meals, coaches
    /admin/pending-shares/route.ts  # Meal approval (admin only)
    /members/route.ts, [id]/route.ts
    /members/[id]/subscription/extend/route.ts  # Extend subscription
    /coach/assignments, nudges, knowledge, dashboard, member-requests
    /ai/agents/[type]/chat/route.ts  # Specialized AI agents
    /gym/settings/route.ts       # Gym settings + branding colors
    /gym/branding/route.ts       # Branding CRUD
    /staff/route.ts              # Staff list and creation
/components
  /ui/index.ts (GlassCard, Button, Modal, ProgressRing, Input, etc.)
  /ui/image-cropper.tsx          # Reusable image cropper (avatar, meal photos)
  /meals/
    create-edit-modal.tsx        # Meal creation/editing with photo upload
    meal-card.tsx                # Meal display card with photo
    ingredient-row.tsx           # Single ingredient input
    ingredient-picker.tsx        # Ingredient library picker
  /staff/
    coach-performance-dashboard.tsx  # Main coach performance wrapper
    coach-performance-table.tsx      # Table with expandable rows
    csv-export-button.tsx            # CSV download for coach data
    /charts/
      members-per-coach-chart.tsx    # Vertical bar chart
      consistency-comparison-chart.tsx # Horizontal bar chart
  /members/
    member-csv-export-button.tsx     # CSV download for members
    /charts/
      activity-distribution-chart.tsx # Pie chart for activity status
      goal-distribution-chart.tsx     # Bar chart for goals
      subscription-status-chart.tsx   # Pie chart for subscriptions
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
