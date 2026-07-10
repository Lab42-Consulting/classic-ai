# Coach / Staff Guide

This guide covers the staff-facing side of the Classic Method Gym Intelligence System — everything a **coach** does day to day: logging in, triaging assigned members, sending accountability nudges, tuning per-member AI guidance, building meals and metrics for a member, running the assignment flows, negotiating training sessions, and using a personal member account for your own tracking.

The app UI is in **Serbian (ekavica)**; where a button or label matters, the Serbian term is shown in parentheses, e.g. "Send message (Pošalji poruku)". The staff experience is **mobile-first** — it is designed to be used from a phone on the gym floor.

> **Related guides:** [Member Guide](./member-guide.md) · [Admin / Gym Portal Guide](./admin-guide.md)

---

## 1. Who this guide is for

Staff accounts carry one of three roles, stored on your staff record:

| Role | Serbian | Where you land after login | This guide |
|------|---------|----------------------------|------------|
| `coach` | Trener | Coach dashboard (`/dashboard`) | **Yes — primary audience** |
| `admin` | Administrator | Gym portal (`/gym-portal/manage`) | See [Admin Guide](./admin-guide.md) |
| `owner` | Vlasnik | Locations (`/gym-portal/manage/locations`) | See [Admin Guide](./admin-guide.md) |

Admins can reuse most of the same member APIs (and see all gym members), but the workflows below assume a **coach** managing their own assigned clients. Where behaviour differs by role, it is called out.

---

## 2. Logging in as staff

Coaches and admins use the **staff login** page, which is separate from the member login.

1. Open **`/staff-login`** (a member trying to open `/dashboard` while logged out is redirected here automatically).
2. Select your **gym** from the dropdown (the page fetches the gym list on load).
3. Enter your **Staff ID (Staff ID / ID trenera)** — format `S-XXXX`, for example `S-AB12`. It is auto-uppercased as you type.
4. Enter your **4-digit PIN**.
5. Submit. The system verifies your Staff ID + PIN within the selected gym and issues a 30-day session cookie.

On success you are routed by role:

- **coach** → the coach dashboard `/dashboard` (or a sanitized `?redirect=` target if one was supplied)
- **admin** → `/gym-portal/manage`
- **owner** → `/gym-portal/manage/locations`

> **Credentials note:** Your Staff ID and PIN were shown **once** when your account was created (by an admin, or by an owner for a location). PINs are bcrypt-hashed and can never be retrieved — if lost, an admin must create a new staff account. Login errors are deliberately generic ("Invalid Staff ID or PIN") and do not reveal which field was wrong.

To log out, use the logout action; it clears the `gym-session` cookie.

---

## 3. The coach dashboard

After login a coach lands on **`/dashboard`**. If your account is not a coach, the dashboard redirects you (owner → locations, admin → gym portal).

The dashboard loads your assigned members with a **computed activity status** for each, aggregate stats across your roster, and an action queue.

### 3.1 Roster stats

At the top you see aggregate counts across your assigned members:

- **total** — members assigned to you
- **on_track**, **slipping**, **off_track** — members in each activity band
- **needsAttention** — members with at least one active alert

### 3.2 Per-member cards

Each assigned member appears as a card showing:

- Goal (fat_loss / muscle_gain / recomposition), current weight, and weight trend
- **Consistency score** (0–100) and current **streak**
- Text **alerts** (see thresholds below)
- Activity status badge: **on_track**, **slipping**, or **off_track**

Cards are sorted **off_track → slipping → on_track**, then by days-since-activity descending, so the members who need you most surface first.

### 3.3 How activity status is computed

Status is derived from the member's daily logs and weekly check-ins over the current week and last 30 days. **Training frequency is deliberately not part of the status formula.**

| Status | Rule (simplified) |
|--------|-------------------|
| **on_track** | Recent activity (≤2 days since last log) AND logging consistently (meal-days ≥ days passed this week − 1) AND good calorie adherence (≥50% of logged days within 70–130% of target) |
| **off_track** | ≥7 days since any activity, **or** ≥3 days into the week with zero meal-days |
| **slipping** | Anything in between |

### 3.4 Alert thresholds

Alerts appear on a card (and feed the "needs attention" count) when:

- **No activity** ("Nema aktivnosti N dana") — ≥5 days since last activity
- **Missed weekly review** ("Propušten nedeljni pregled") — last week's check-in is missing
- **Do weekly review** ("Uradi nedeljni pregled") — only on Sunday, if this week's check-in is missing
- **Calorie alert** — ≥2 logged days and average adherence <70% or >130%
- **Protein alert** — average protein adherence <70%
- **Water alert** — ≥3 days into the week and water consistency <30%

### 3.5 The "Needs action" queue

The dashboard also pulls two lists into a **"Potrebna akcija"** (Needs action) section:

- **Member-initiated coach requests** — members who signalled interest in you (see §8)
- **Session requests** — training sessions needing your response (see §9)

### 3.6 Triage workflow

1. Log in and land on `/dashboard`.
2. Review the roster stats and the "Needs action" queue.
3. Filter members by status tab — **Svi** (All) / off_track / slipping / on_track — or tap **needs attention**.
4. Tap a member card to open their detail page at `/members/{id}`.

---

## 4. Member detail / client profile

Open a member from the dashboard to reach **`/members/{id}`**. You must be **assigned** to that member — otherwise the API returns **403 "Not assigned to this member"**. (Admins may view any member in the gym and additionally see subscription data, which is hidden from coaches.)

The page shows a full client snapshot:

- **Weekly snapshot vs targets** — weight trend, weekly training sessions, days logged, water, average calories/protein against the member's effective targets
- **Recent check-ins** (weekly weight + feeling)
- **Recent nudges** you have sent
- **Coach notes** ("Moje beleške") — your private `StaffNote` entries
- A **rule-based behaviour summary** (plain text generated from the member's data — **not** an AI/LLM call)
- Sections for **AI knowledge**, **coach meals**, and **metrics** (covered below)

From this page you can send nudges, edit AI knowledge, add meals, and create/inspect metrics.

---

## 5. Sending accountability nudges

A **nudge (CoachNudge)** is a one-way accountability message to a member. It is stored with a read marker (`seenAt`) so you can tell whether the member has seen it.

1. On `/members/{id}` tap **Send message (Pošalji poruku)**.
2. The modal loads **templates** (fetched with `?templates=true`).
3. Pick a predefined template or type a custom message.
4. Send. The system verifies you are assigned to the member, creates the nudge, and refreshes the "recent nudges" list.

**Predefined templates** (by id):

| Template id | Purpose |
|-------------|---------|
| `comeback` | Nudge an inactive member to return |
| `great_week` | Praise a strong week |
| `focus_training` | Encourage more training |
| `checkin_reminder` | Remind to do the weekly review |
| `protein_focus` | Encourage hitting protein |

> If both a custom message and a template are submitted, the **custom message wins**.

Nudges are one-directional — members do not reply through them.

---

## 6. Per-member AI knowledge (customizing the AI agents)

Members chat with three specialized Serbian AI agents: **Ishrana** (Nutrition), **Suplementi** (Supplements), and **Trening** (Training). As a coach you can inject **per-member, per-agent guidance** (`CoachKnowledge`) that is appended to that member's AI agent system prompt — so the AI follows *your* instructions when advising *your* client.

1. On load, the member page fetches your existing knowledge (`GET /api/coach/knowledge?memberId={id}`) and prefills the nutrition / supplements / training fields.
2. Open an agent tab (e.g. Nutrition), edit the guidance. A default template is offered; content is capped at **2000 characters**.
3. Save. The system verifies your assignment and **upserts** the `CoachKnowledge` entry keyed by (you, member, agent type).
4. Later, when the member chats with that agent, the platform loads your knowledge for that (coach, member, agent) triple and injects it into the agent prompt under **"SPECIFIČNE SMERNICE TRENERA"** (Coach's specific guidance).

> **To remove guidance:** save an **empty/blank** field — that deletes the entry for that agent.

The AI itself runs on Claude (`claude-3-haiku-20240307`) on the member-facing side; your knowledge only shapes those replies. The behaviour summary you see on the coach page is rule-based text, not an AI call.

---

## 7. Creating content for a member

### 7.1 Create a meal for a member

You can build meals on a member's behalf. Coach-created meals are marked with your coach id, are **never shared**, and the member can **use and delete but not edit** them (they appear in the member's **"Od trenera"** — "From coach" — tab).

1. On `/members/{id}` tap **+ Dodaj** ("+ Add") in the **"Obroci za člana"** (Member's meals) section.
2. Fill the meal modal: a name, plus either ingredient rows (name, portion, calories; protein/carbs/fats optional) **or** manual totals ("Ručno podesi").
3. Save. The system verifies your coach role + assignment, computes totals (or uses your manual totals), and creates the meal with `createdByCoachId` set and `isShared=false`.

You can later **edit or delete** meals you created (via the coach meal routes; only the creating coach may modify them). Ingredients cascade-delete with the meal.

### 7.2 Create and track a custom metric for a member

Metrics are numeric progress trackers (e.g. Bench Press, Body Fat %) with per-day entries, a traffic-light status vs. a target, and change-from-reference. Coach-created metrics carry a coach badge; the member cannot edit or delete them.

**Create a metric:**

1. Tap **+ Dodaj** in the **"Metrike za člana"** (Member's metrics) section.
2. Enter **name** and **unit** (both required), an optional **target value**, and a **direction** — **higherIsBetter** (↑ Veća — higher is better, the default) or ↓ Manja (lower is better).
3. Save. A `CustomMetric` is created with your coach id; `referenceValue` starts null.

**Review a metric's entries:**

1. Tap a metric to open its entries (`GET /api/coach/member-metrics/{memberId}/{metricId}?range=30`).
2. Choose a range — **7 / 30 / 90 / 365 days** — and toggle **table** or **graph** view.
3. Each entry shows a **status** and **change-from-reference**:
   - **Status** (semaphore): with higherIsBetter → on_track if value ≥ target, needs_attention if ≥ 90% of target, else off_track; lower-is-better inverts (on_track ≤ target, needs_attention ≤ 110%). No target ⇒ neutral.
   - **Change** vs the effective reference (`referenceValue`, else the first-ever entry): a relative percentage for normal units, or absolute **percentage points (p.p.)** when the unit contains `%`.

You can **edit or delete** metrics you created. You can also **view (read-only)** the member's own metrics.

> **Important:** Coaches **cannot add metric entries** — only the member records values for their metrics. You define and review metrics; the member logs the numbers.

---

## 8. Getting members assigned to you

There are three ways a member ends up assigned to you. All rely on **one coach per member** — a member can have at most one active `CoachAssignment`.

### 8.1 Assign with a plan (request flow — member must accept)

This is the standard flow: you send a plan, the member accepts.

1. Open **`/register`** ("Novi član" — New client). The page lists **unassigned members** (active members with no coach and no staff-linked account; max 20 shown, searchable).
2. Select a member.
3. Set a **goal**, optional **custom macros** (calories auto-calc = protein×4 + carbs×4 + fats×9), toggle **"Zahtevaj unos tačnih makrosa"** (Require exact macros — see §8.4), and add notes.
4. Send. The system checks the member has no coach and no conflicting pending request, then creates a **`CoachRequest`** (initiatedBy = coach) and shows a **"Zahtev poslat"** (Request sent) confirmation.
5. **The member must accept.** On acceptance, a `CoachAssignment` is created — and note this is **destructive**: all of the member's daily logs are deleted (a full progress reset) and their goal is overwritten if you set a custom goal.

### 8.2 Direct assign (no member consent step)

For coach-registered members or bulk assignment you can assign immediately, bypassing the accept step:

1. From the unassigned-members flow, choose **direct assign**.
2. The system creates the `CoachAssignment` right away and deletes any pending requests for that member.

Use this only when consent is implied (e.g. you just registered the member yourself).

> **Request vs direct:** `/assign` sends a pending request needing member acceptance; `/assign-direct` skips consent and assigns immediately.

### 8.3 Reviewing member-initiated coach requests

Members can signal interest in a coach. These appear on your dashboard's "Needs action" queue.

1. The dashboard lists **member-initiated requests** (name, phone, goal, message).
2. Tap **Prihvati** (Accept) or **Odbij** (Decline).
3. Both actions **delete the request**. Importantly:
   - **Accept only acknowledges** — it returns the member's phone number in a toast so you can arrange a meeting. **It does NOT create an assignment.**
   - **Decline** simply removes the interest signal.
4. After accepting/meeting, send a formal plan via the **/register (assign)** flow in §8.1 to actually create the assignment.

So the member-request flow is an *interest signal + meeting arrangement*; the plan-based assign flow is what establishes the coaching relationship.

### 8.4 The "Require exact macros" setting

When you toggle **"Zahtevaj unos tačnih makrosa"** during assignment, the resulting `CoachAssignment.requireExactMacros` flag forces the member's meal-logging UI to require **exact protein / carbs / fats grams per meal** (calories auto-computed as P×4 + C×4 + F×9). This is surfaced to the member via their profile. It reuses the same "exact macro" logging path that Pro difficulty mode uses.

Your assigned targets also take precedence: **coach custom targets > member's own custom targets > auto-calculated**. While a member is assigned to a coach, **they cannot self-edit their nutrition targets**.

### 8.5 Listing unassigned members

The unassigned-members list (used by the assign/register flow) shows **active** gym members with **no coach** and **no staff-linked personal account**, and indicates whether a request is already pending and from whom. Only up to 20 are rendered; use the client search to narrow.

---

## 9. Session scheduling (coach side)

Session scheduling lets you and an assigned member negotiate one-on-one sessions turn-by-turn. It is **tier-gated**: your gym must be on **Pro or Elite** (the `sessionScheduling` feature). On Starter, the sessions endpoints return **403 TIER_REQUIRED** and an admin/owner must upgrade.

Open the coach sessions page (**`/coach-sessions`**). It shows your active requests, upcoming confirmed sessions, recent past sessions (last 30 days, up to 20), and your assignable members.

### 9.1 Session rules

| Field | Allowed values |
|-------|----------------|
| Type (`sessionType`) | training, consultation, checkin |
| Location | gym, virtual |
| Duration | 30, 45, 60, or 90 minutes (UI: "30 min", "45 min", "1 sat", "1.5 sat") |
| Timing | Proposed time must be **≥24 hours** in the future — applies to first proposals **and** every counter |
| Cancellation reason | Minimum **10 characters** |

Only **one active** (pending/countered) request may exist per coach–member pair at a time. It is **turn-based**: whoever performed the last action must wait for the other party — acting twice in a row is rejected ("Čeka se odgovor člana" — waiting on the member).

### 9.2 Propose a session to a member

1. On `/coach-sessions`, select one of your assigned members and open the create modal (defaults: type = training, tomorrow 10:00, duration 60, location gym).
2. Set type, date/time, duration, location, optional note.
3. Submit. The system verifies your coach role, tier access, the assignment, the 24h rule, and that no active request already exists, then creates a `SessionRequest` (initiatedBy = coach) plus an initial proposal. The member then sees it as needing their response.

### 9.3 Respond to a member's request

When a member proposes (or counters), it appears as needing your action.

1. Choose **Accept**, **New proposal** (counter), or **Decline**.
2. **Accept** → the request becomes `accepted`, the current proposal is marked accepted, and a confirmed **`ScheduledSession`** is created (copying type/time/duration/location/note).
3. **Counter** → validate a new time (≥24h)/duration/location/note; the request goes to `countered`, `counterCount` increments, the turn flips to you, the previous proposal is marked `countered`, and a new proposal row is appended.
4. **Decline** → the request becomes `declined` (no session is created).

The system blocks you if it is not your turn.

### 9.4 Complete a session

Only the **coach** can mark a confirmed session completed.

1. Open an upcoming confirmed session on `/coach-sessions`.
2. Choose **Complete** — the session status becomes `completed` and `completedAt` is stamped. (There is no member "complete" action.)

### 9.5 Cancel a session

Either party can cancel a **confirmed** session, with a mandatory reason.

1. Open the session and choose **Cancel**.
2. Enter a cancellation reason (**≥10 characters**) and confirm.
3. The session becomes `cancelled` with `cancelledBy='coach'`, `cancelledAt`, and your reason recorded. It moves to the past/cancelled list.

> Every proposal, counter, accept, and decline writes an audit row (`SessionProposal`), giving a full negotiation history.

---

## 10. Dual role: coach as their own member

A coach can also maintain a **personal member account** to track their own fitness — same PIN, free active subscription. This links your staff record to a member record (`linkedMemberId`).

### 10.1 Create or link a personal account

1. On the dashboard, the app checks whether you already have a linked member account (`GET /api/staff/member-account`).
2. If none, tap **"Moj nalog"** (My account) and choose to:
   - **Create** — enter a **goal**, **weight (1–300 kg)**, and **height (1–250 cm)**. A new Member is created reusing your hashed PIN, with `subscriptionStatus=active` (free) and `hasSeenOnboarding=true`, then linked to your staff record.
   - **Link** — provide an existing member's **memberId + PIN** (PIN-verified; the member must not already be linked to other staff).
3. On success you are taken to the member home (`/home`).

A member can be linked to **at most one** staff account.

### 10.2 Switching between coach and member views

- Once linked, opening `/home` shows the **member Home for your own account** (you are treated as your own member).
- A **"Trenerski režim"** (Coach mode) button on Home jumps you back to the coach dashboard (`/dashboard`).
- If you open `/home` **without** a linked member account, you are redirected to `/dashboard`.

Your linked member id is cached in your session at login, so switching does not require re-authentication.

### 10.3 Unlink

You can **unlink** your personal member account (`DELETE /api/staff/member-account`). The member record is **preserved**, not deleted — it is simply detached from your staff account.

When acting as your own member, all member features work exactly as in the [Member Guide](./member-guide.md): daily logging, meals, metrics, weekly check-in, challenges, AI chat, and so on.

---

## 11. Quick reference

### Key coach pages

| Page | Route | Purpose |
|------|-------|---------|
| Staff login | `/staff-login` | Log in with Staff ID + PIN |
| Dashboard | `/dashboard` | Roster, activity status, action queue |
| Member detail | `/members/{id}` | Snapshot, nudges, AI knowledge, meals, metrics |
| Assign / new client | `/register` | Send a plan to an unassigned member |
| Sessions | `/coach-sessions` | Propose/respond/complete/cancel sessions |
| My member home | `/home` | Your personal (dual-role) tracking |

### Role & access rules to remember

- You can only read/write members you are **assigned to** (403 otherwise). Admins bypass this.
- **Coach-created meals** are never shared and are member-deletable but not member-editable.
- **Coach-created metrics** are edited/deleted only by their creating coach; you **cannot add metric entries**.
- Accepting a **coach-initiated plan** wipes the member's daily logs and can overwrite their goal.
- Accepting a **member-initiated request** only arranges a meeting — send a plan to actually assign.
- **Session scheduling** requires the gym to be on **Pro/Elite**.
- All user-facing coach strings and errors are in **Serbian (ekavica)**; dates use `sr-RS` / `sr-Latn-RS` formats.
