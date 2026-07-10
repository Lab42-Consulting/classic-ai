# Member Guide

This guide walks you through everything you can do as a **member** of a gym running on the Classic Method Gym Intelligence System. The app is mobile-first and its interface is in **Serbian (ekavica)**; key Serbian terms are shown in parentheses so you can match what you see on screen.

**Related guides:** [Coach guide](./coach-guide.md) · [Admin guide](./admin-guide.md) · [Getting started](./getting-started.md) · [Docs index](./README.md) · [SRS summary](../SRS_SUMMARY.md)

---

## Table of contents

1. [Logging in and onboarding](#1-logging-in-and-onboarding)
2. [Difficulty modes: Simple / Standard / Pro](#2-difficulty-modes-simple--standard--pro)
3. [Home dashboard and daily targets](#3-home-dashboard-and-daily-targets)
4. [Daily logging: meals, training, water](#4-daily-logging-meals-training-water)
5. [Photo-based meal logging](#5-photo-based-meal-logging)
6. [Meals and custom ingredients](#6-meals-and-custom-ingredients)
7. [Custom metrics and progress graphs](#7-custom-metrics-and-progress-graphs)
8. [Weekly check-in](#8-weekly-check-in)
9. [Progress and history](#9-progress-and-history)
10. [Personal goal and community goal voting](#10-personal-goal-and-community-goal-voting)
11. [Fundraising goals](#11-fundraising-goals)
12. [Challenges, leaderboards, and gym QR check-in](#12-challenges-leaderboards-and-gym-qr-check-in)
13. [AI agents (nutrition / supplements / training)](#13-ai-agents-nutrition--supplements--training)
14. [Working with a coach](#14-working-with-a-coach)
15. [Scheduling sessions with your coach](#15-scheduling-sessions-with-your-coach)
16. [Supplements guide](#16-supplements-guide)
17. [Membership and subscription](#17-membership-and-subscription)
18. [Profile settings](#18-profile-settings)

---

## 1. Logging in and onboarding

Your gym gives you a **Member ID** (6 characters) and a **4-digit PIN** when your account is created. These are shown to gym staff only once, so keep them safe.

### Log in

1. Open the app; you land on the login page (`/login`).
2. Select your gym from the dropdown (**Teretana**). The list is loaded for you.
3. Type your **Member ID**. It is automatically converted to uppercase; you must enter at least 4 characters before continuing to the PIN step.
4. Enter your **4-digit PIN**.
5. Tap to sign in. Your session is stored for **30 days**, so you usually stay logged in.

If the ID or PIN is wrong you'll see a generic "Invalid Member ID or PIN" message (the app deliberately doesn't reveal which field was wrong). If your membership is not `active`, login is refused with a status error.

### First-time onboarding ("Zašto ovo funkcioniše")

The first time you reach the Home screen, you're redirected to a short onboarding explainer titled **"Zašto ovo funkcioniše"** (Why this works):

1. Read through the 5 sections explaining how the daily loop and targets work.
2. Finish to mark onboarding complete. You won't be redirected there again and land on Home from then on.

---

## 2. Difficulty modes: Simple / Standard / Pro

You choose how much detail the app asks of you. The mode is set in your **Profile** and changes the logging screen and dashboard instantly. All three modes are **free** and **earn identical challenge points** ("Svi režimi zarađuju iste poene u izazovima") — the mode is not tied to any paid tier.

| Mode | Serbian | Meal logging | Dashboard | Best for |
|------|---------|--------------|-----------|----------|
| **Simple** | Jednostavan | One tap ("Jeo/la sam") — no calories or macros counted | Activity tiles (Training / Meals / Water), no calorie ring, no advice cards, no Metrics | People who just want to build habits |
| **Standard** | Standardni | Pick a size (small/medium/large), a saved/coach meal, custom calories, or a photo | Calorie ring + macro ring, status badge, advice cards | Most members |
| **Pro** | Napredni | Requires exact protein/carbs/fats per meal (calories auto-computed) | Full detail, purple Pro layout | Members tracking precise macros |

Notes:
- In **Simple** mode, a meal is logged as a medium "Obrok" with no nutrition tracked, and the Metrics feature is blocked (you'll get an info toast steering you to Standard/Pro).
- In **Pro** mode, meal logging always uses the exact-macro path (calories = protein x4 + carbs x4 + fats x9).
- If a coach sets **"require exact macros"** on your plan, exact-macro logging is enforced regardless of your mode.

### Switch mode

1. Open **Profile**.
2. Tap **Simple / Standard / Pro**.
3. The change saves immediately and Home/Log re-render right away.

---

## 3. Home dashboard and daily targets

Home (`/home`) is your daily control center. It loads today's activity, your last 7 days, and computes everything server-side.

### Daily targets

Your daily calorie and macro targets follow a **priority chain**:

1. **Coach targets** — if a coach is assigned and set custom targets, these win.
2. **Your custom targets** — targets you set yourself in Profile.
3. **Auto-calculated** — from your body weight and goal when nothing custom is set.

Auto targets use your weight and goal band (fat loss, recomposition, or muscle gain), with macro splits per goal (e.g. fat loss 40% protein / 30% carbs / 30% fat).

### What Home shows (Standard/Pro)

- **Calorie ring** — remaining calories vs. today's target (or how far over). Tap it to open today's meal list.
- **Macro ring** — toggle to see protein/carbs/fats distribution.
- **Status badge** — `on_track` / `needs_attention` / `off_track`, computed from time-of-day-adjusted calorie and protein progress plus whether you trained or drank water.
- **Today's activity** — trained (✓/—), water glasses (x/8), and number of meals logged.
- **Advice cards** — context nudges, e.g. low water after 2 PM if under 4 glasses, low protein after 6 PM if under 50% of target, or a no-training reminder in the afternoon. Each links to the relevant AI agent. (Hidden in Simple mode.)
- **Calorie-surplus recovery advice** — if you go over target, a suggested deficit and plan.
- **Quick actions** and any **coach nudges, session banners, challenge, goal, or fundraising cards**.

Water target/aspiration is **8 glasses**; 4+ counts as "consistent."

### Log from Home

- Tap **"Unesi podatke"** (Enter data) to open the logging screen.
- Tap the **calorie ring** to review today's meals in a bottom sheet, with a shortcut to add another.

---

## 4. Daily logging: meals, training, water

The logging screen (`/log`) adapts to your difficulty mode. In Standard mode you see a 2x2 grid: **I trained (💪) / I drank water (💧) / Photograph meal / I ate (🍽️)**.

### Log a meal (Standard)

1. On Home tap **"Unesi podatke"**, then on the log screen tap **I ate** (🍽️).
2. In the meal sheet, choose one of:
   - a **size** — small/medium/large (**Mali / Srednji / Veliki**), which auto-estimates calories and macros for your goal;
   - a **saved or coach meal**, using its stored macros; or
   - **custom calories**.
3. Optionally type a **meal name** (**Obrok**).
4. Tap **"Loguj obrok"**. The app shows a checkmark and returns to Home refreshed.

### Log a meal (Pro / exact macros)

1. Open the log screen (purple Pro layout) and tap **"Unesi obrok — Tačan unos P/U/M"**.
2. Pick a coach/saved meal, or enter **protein, carbs, and fats** in grams. A live calorie preview updates as you type.
3. Save. All three macros are required for an exact entry.

### Quick training log

1. On the log screen tap **I trained** (💪).
2. A single tap records a completed training session — no extra data needed. You'll see a success check and return to Home.

> Training earns challenge points only if you have a valid **gym QR check-in** for that day (when your gym uses QR check-in). See [section 12](#12-challenges-leaderboards-and-gym-qr-check-in).

### Quick water log

1. On the log screen tap **I drank water** (💧).
2. Each tap adds **one glass**. Repeat per glass; the daily aim is 8.

### Simple mode

- Meals are a single tap: **"Jeo/la sam"** (I ate). No size, calories, or macros are recorded.

---

## 5. Photo-based meal logging

Standard mode offers **"Slikaj obrok"** (Photograph meal), which can estimate nutrition from a picture using AI.

1. On the log screen tap **"Slikaj obrok"** and pick or capture a photo. The image must be an image file **≤ 1 MB**.
2. The photo modal opens and shows your remaining AI photo credits (e.g. **x/3**).
3. Type a **meal name** (it autocompletes against your saved meals) and select a **size** (required).
4. Optionally tap **"AI Analiza"** to run AI analysis. The AI (Claude Haiku Vision) returns estimated calories, protein, carbs, fats, and a confidence level, adjusted to your goal.
5. Tap **"Upiši obrok"**. Which macros are used:
   - If your typed name **exactly matches a saved meal**, that meal's stored macros are used (free).
   - Otherwise, the **AI estimate** if you ran it.
   - Otherwise, the **size-based estimate**.
6. The meal is logged (with the photo attached) and you return to Home.

**AI photo limit:** **3 analyses per day** for active members. If you exceed it you'll get a message suggesting you fall back to size-based estimation. Trial/expired members get 0 photo analyses. The size-based estimate always works without AI.

---

## 6. Meals and custom ingredients

Build a personal library of reusable meals and ingredients on the **Meals** (`/meals`) and **Ingredients** (`/ingredients`) pages. All amounts and macros are per-ingredient; a meal's totals are summed automatically.

### Create a custom meal

1. Open **Meals** and tap **"Novi obrok"** (+).
2. Enter a **meal name** (e.g. "Piletina sa rizom").
3. For each ingredient row, enter **name, portion amount, and unit** (g/kg/ml/L/kom/parče/kašika/kašičica/šolja). Optionally expand to add protein/carbs/fats.
4. To auto-fill an ingredient's macros, tap the nutrition avatar — it looks up a free built-in database first, then AI if needed (see below).
5. Add rows with **"Dodaj sastojak"** or pull a saved ingredient via **"Iz biblioteke"** (From library).
6. Optionally toggle **"Ručno podesi"** (Manual adjust) to override the summed totals directly instead of auto-summing.
7. Optionally add a **4:3 photo** via the image cropper.
8. Optionally toggle **"Podeli sa teretanom"** (Share with gym) — this requires a photo.
9. Tap **"Sačuvaj obrok"** (Save meal).

### Save and reuse an ingredient

1. Open **Ingredients** (defaults to **"Moji sastojci"** / My ingredients).
2. Tap **"Novi sastojak"** and enter a **name** and **default portion** (e.g. "100g").
3. Optionally tap the AI deduce button to fill calories/macros from name + portion.
4. **Calories are required** (> 0); protein/carbs/fats are optional.
5. Optionally tick **"Podeli sa teretanom"** to add it to the gym's shared ingredient library — **no admin approval needed** for ingredients.
6. Save. Later, in any meal, tap **"Iz biblioteke"** to search and add it.

Search is case-insensitive and covers your own plus gym-shared ingredients (type at least 2 characters).

### Automatic vs. manual meal totals

- By default, meal totals are the **sum of the ingredient rows**.
- Tick **"Ručno podesi"** to enter totals yourself.

### Where meals come from (tabs)

- **Moji obroci** — your own meals (editable and deletable).
- **Od trenera** — meals your coach made for you. **Read-only** — you can use and delete them but not edit them.
- **Biblioteka** — approved gym-shared meals from other members. You can **copy** these into your own library.

### Share a meal with the gym (needs approval)

1. Create/edit a meal and attach a **photo** (required to share).
2. Tick **"Podeli sa teretanom"** and save. The card shows **"Čeka odobrenje admina"** (Awaiting admin approval).
3. Once a gym admin approves it, it appears in other members' **Biblioteka** tab.

> If you later remove the photo from a shared meal, it is automatically un-shared.

### Copy a shared meal

1. Open **Meals** → **Biblioteka** tab.
2. Tap the copy (save) icon on a meal.
3. A private copy — including ingredients and photo — is created under **Moji obroci**.

### Log a saved meal directly

From a meal card tap **log** to jump to the log screen with that meal pre-selected, so its stored macros are logged as a food entry.

### Built-in ingredient database and AI deduction

- A **free static database** of ~90 Serbian/English ingredients provides instant macro estimates (per-100g/ml values, diacritic-insensitive, fuzzy matching). No rate limit.
- **AI deduction** (**"AI popuni"**) tries the free database first; if it misses, it falls back to **Claude Haiku**. AI text deduction is rate-limited for members (about 20/day for active members; 0 for expired). Static database lookups are always free.

---

## 7. Custom metrics and progress graphs

Custom metrics (`/metrics`) let you track any numeric measurement — bench press, body-fat %, waist, etc. **Metrics are not available in Simple mode** (you'll be redirected to Home).

### Create a metric

1. Open **Metrics** and tap the **+** button.
2. Enter a **name** and **unit** (both required).
3. Optionally set a **target value**.
4. Pick the direction: **↑ Veća** (higher is better) or **↓ Manja** (lower is better).
5. Save. The metric appears in a swipeable carousel.

### Log an entry

1. Select the metric in the carousel and tap **"+ Dodaj unos"** (Add entry).
2. Pick a **date** (today or earlier), enter a **value**, and optionally a note.
3. Save. There is **one entry per metric per day** — re-submitting the same date overwrites (upserts) it.

You can log entries for both your own metrics and coach-created ones.

### Review progress

1. Open a metric and choose a range: **7 / 30 / 90 / 365** days.
2. Toggle **Table** or **Graph**:
   - **Table** — date, value, change from start ("Od starta"), and a colored status dot.
   - **Graph** — a line chart with dashed **target** (green) and **reference** (purple) lines.

**Status colors** compare each value to your target: **Na cilju** (on target, green), **Blizu cilja** (close, yellow), **Ispod cilja** (below, red), or neutral (no target). **Change from start** is a percentage for normal units, or percentage points for "%" units.

### Delete

- Delete a single entry, or delete a whole metric you created. **Coach-created metrics** carry a coach badge and can't be edited or deleted by you.

---

## 8. Weekly check-in

The weekly check-in (`/checkin`) records your body weight and mood once a week; it drives your Progress dashboard.

**Rules:**
- Available **only on Sundays** (nedelja).
- **Once per week**, with a minimum of **7 days** since your last check-in.
- Weight must be **30–300 kg**; feeling is **1–4**.

### Complete a check-in

1. Open the Check-in page. It shows whether you can check in, and if not, why (before Sunday, already done, or wait N days). If you missed weeks, an accountability warning is shown.
2. On an eligible Sunday, enter your **weight** and pick a **feeling**: 😞 (1) / 😐 (2) / 🙂 (3) / 😄 (4).
3. Submit. Your check-in is saved, your stored weight is updated, and you're redirected to Home after a moment.

Completing a check-in awards points to any active **points-type challenge** you're in.

> **Note on photos:** although the data model has a progress-photo field, **progress-photo capture is not available** in this version of the app — the check-in records weight and feeling only.

---

## 9. Progress and history

### Progress dashboard (`/progress`)

Shows your longer-term trends from your check-ins and recent daily logs:

- Current vs. start weight, total and weekly-average change (colored to your goal — e.g. losing weight is "positive" for fat loss).
- Average feeling and total number of check-ins.
- A **weight-over-time chart**.
- A **weekly consistency score (0–100)** with a breakdown, computed from your last 7 days of training, logging, calories, protein, and water. In Simple mode, calories and protein are dropped and the remaining components are re-weighted.
- Your last few check-ins and a motivational message.

If you haven't checked in this week, a **"Nedeljni pregled"** button links you to the check-in.

### History (`/history`)

A **30-day activity calendar** colored by how active each day was:

1. Open **History**. Each day is shaded **empty / partial / good / excellent** based on that day's calories, protein, training, meals, and water.
2. Tap any day to see its details.
3. A 30-day summary shows total trainings, days logged, and average calories.

---

## 10. Personal goal and community goal voting

### Your personal nutrition goal (`/goal`)

Your goal drives your calorie direction and macro split. Choose one of three:

| Goal | Serbian | Direction |
|------|---------|-----------|
| Fat loss | Gubitak masnoće | Calorie deficit, 40/30/30 P/C/F |
| Recomposition | Rekompozicija | Maintenance, 35/40/25 |
| Muscle gain | Rast mišića | Calorie surplus, 30/45/25 |

1. Open **Tvoj cilj** (Your goal).
2. Select a goal card. A note explains that targets update but your history is preserved.
3. Tap **"Sačuvaj promene"** (Save changes). If unchanged, it just navigates back.

> If a coach is assigned, they may override your goal and targets, and you won't be able to edit your own targets while assigned.

### Community goal voting

Your gym admin can publish gym-improvement goals (e.g. new equipment) with several options. Members with an **active or trial** subscription vote:

1. On Home or the goals feed, expand a voting goal card (**VotingGoalCard**).
2. Tap the option you prefer. Live vote counts and percentages update, and your choice is marked **"Tvoj glas"** (Your vote).
3. You can **change your vote** any time until the deadline (a countdown shows days/hours remaining).

The most-voted option wins when the deadline passes; the goal then moves into a fundraising phase.

---

## 11. Fundraising goals

Once a community goal's winner is chosen, it enters **fundraising** (Prikupljanje) toward the winning option's target amount.

- On Home you can see active fundraising goals with **current amount, target, and progress %**.
- Contributions accrue **automatically** when members renew/extend their membership at the counter — the paid amount is added to every fundraising goal for transparency. Admins can also add manual contributions.
- A goal auto-completes when it reaches its target.

There is no member action required to fund a goal beyond renewing your membership; this view is informational. (An older, read-only legacy fundraising display may also appear on Home; it's being replaced by the goal system above.)

---

## 12. Challenges, leaderboards, and gym QR check-in

If your gym is on the **Pro or Elite** tier, it can run **challenges** (izazovi) where you earn points and climb a leaderboard.

### Join and compete (`/challenge`)

1. Open **Challenge**. You'll see the active challenge, the leaderboard, your rank, whether gym check-in is required, and whether you've checked in today.
2. During the **registration window**, tap **Join**. (Coaches acting on their own linked member accounts cannot join.)
3. Earn points by logging activity:

| Action | Default points |
|--------|----------------|
| Meal logged | 5 |
| Training logged | 15 (requires same-day gym check-in) |
| Water glass | 1 |
| Weekly check-in | 25 |
| Daily streak bonus | 5 (once per day) |

Your gym sets the exact values per challenge. Consecutive active days build a **streak**; missing a day resets it.

4. Watch the **leaderboard** (ranked by total points, ties broken by who joined first) and your own rank, category breakdown, streak, and days remaining.

**Winner cooldown:** if you finish in the top places, you may be temporarily excluded from joining new challenges for a cooldown period (the app explains this with an end date).

### Gym QR check-in

Training points require proof you were physically at the gym that day (when your gym enables QR check-in).

1. At the gym, open the check-in modal from the challenge screen.
2. **Scan or enter** the gym's daily QR code (displayed at the entrance). The code rotates daily.
3. One check-in per day is recorded. Re-scanning the same day is harmless (idempotent).
4. Now any training you log that day unlocks its challenge points.

> This **gym QR check-in** (physical presence, daily) is different from the **weekly check-in** (Sunday weight/feeling). Both exist and are separate.

---

## 13. AI agents (nutrition / supplements / training)

The app has three specialized Serbian-speaking AI assistants plus a general coach assistant. They explain your own logged numbers and give focused, general (not medical) advice. All are powered by Claude Haiku.

| Agent | Serbian | Scope |
|-------|---------|-------|
| **Nutrition** | Ishrana / Nutricionista AI | Calories, macros, meal size/timing, high-protein foods, hydration |
| **Supplements** | Suplementi / Stručnjak za suplemente | Protein, creatine, pre-workout, vitamins, omega-3, amino acids (never recommends brands; advises consulting a doctor) |
| **Training** | Trening / Trener AI | Training types, technique, frequency/splits, progressive overload, recovery (refers injuries to a professional) |

Each agent stays in its lane and refers out-of-scope questions to the right agent.

### Chat with an agent

1. On Home, tap an agent card (Ishrana / Suplementi / Trening) or an advice card that deep-links into a chat.
2. The chat (`/chat/[agent]`) shows the agent avatar, a description, and 4 suggested Serbian prompts.
3. Type a question (up to 500 characters) or tap a suggestion.
4. The reply references your actual numbers (goal, today's calories/macros vs. targets, training, water, consistency, streak) and appears with a typing animation.

**Usage limits (per member per day)** scale with your gym's tier: Starter 10, Pro 25, Elite 50 messages. Trial members are capped at min(5, tier limit); expired/cancelled members get 0. If you hit the limit you'll see a localized daily-limit message. Your gym also has a monthly AI budget that can pause AI if exhausted.

> If your coach has set per-agent guidance for you, the agent's answers incorporate that coach guidance automatically.

**Safety:** the AI gives general information, not medical advice — the UI shows a disclaimer, and the agents won't prescribe diets, dosages, or brands.

---

## 14. Working with a coach

A coach can be assigned to you either by accepting a coach's request or by requesting a coach yourself.

### Accepting a coach's plan

1. If a coach sends you a plan, you'll get a pending coach request. Open it to review the goal, targets, and notes.
2. **Accept** or **decline**.
3. **Accepting is destructive:** it **resets all of your daily logs** (a fresh start), switches your targets to the coach's plan, and overwrites your goal if the coach set one. You're double-warned before confirming.

Once assigned:

- **Custom targets are locked** — you can't edit your own calorie/macro targets while a coach is assigned (the coach's plan drives your Home targets).
- **Exact macros** — if the coach enabled "require exact macros," your meal logging requires exact protein/carbs/fats per meal.
- **Coach meals** appear under the **"Od trenera"** tab in Meals (read-only, but you can delete them).
- **Coach metrics** appear in your Metrics carousel with a coach badge (read-only).
- **Nudges** — your coach can send you one-way accountability messages that show up on Home and in your notifications.

### Finding a coach

Use the **Find coach** page (`/find-coach`) to express interest; a coach then follows up and sends a formal plan for you to accept.

---

## 15. Scheduling sessions with your coach

If your gym is on **Pro or Elite**, you and your assigned coach can negotiate one-on-one sessions (`/sessions`, **Termini**). You must have an assigned coach to schedule.

**Session options:** type (training / consultation / checkin), location (gym / virtual), duration (30 / 45 / 60 / 90 min). Proposed times must be **at least 24 hours** in the future.

### Request a session

1. Open **Termini**. It shows your coach, active requests, and upcoming/past sessions. (If you have no coach, you'll see a "Nemaš trenera" warning and a link to find one.)
2. Tap **"Zakaži termin"** (Schedule session). The modal defaults to training, tomorrow 10:00, 60 min, gym.
3. Choose type, date/time, duration, location, and an optional note. Submit.
4. The request waits for your coach's response ("Čeka se odgovor trenera").

### Respond to your coach's proposal

The negotiation is **turn-based** — only the party who didn't act last can respond:

1. When it's your turn, open the request and choose **Accept**, **New proposal** (counter), or **Decline**.
2. **Accept** creates a confirmed session under **"Predstojeći termini"** (Upcoming).
3. **Counter** re-opens the modal pre-filled with the current proposal; adjust and send.
4. **Decline** ends the request.

### Cancel an upcoming session

1. Tap cancel on an upcoming session.
2. Enter a **cancellation reason** of at least **10 characters** and confirm. The session moves to your past/cancelled list.

Only the coach can mark a session **completed**.

---

## 16. Supplements guide

The **Supplements** page (`/supplements`) is a static, educational guide tailored to your training goal — it is **not** a store and is separate from any gym inventory.

1. Open **Supplements**. The guide is picked automatically for your current goal (fat loss / muscle gain / recomposition).
2. Browse **Recommended (⭐)** and **Optional (💡)** supplements.
3. Tap a supplement to expand its timing, dosage, and benefits.
4. A disclaimer is shown; you can jump to **Tvoj cilj** to change your goal.

> Members do not browse or buy the gym owner's product inventory in the app — the supplements page is educational only.

---

## 17. Membership and subscription

Your gym membership costs **€5 / month** and is renewed **manually at the gym counter** — there is no in-app payment for member membership.

### View your subscription (`/subscription`)

- See your status (active / trial / expired), days remaining, and an expiring-soon warning within 7 days.
- Messaging highlights the €5/month price and a 10% supplement discount.
- To renew, visit the gym counter ("Obnovi na pultu teretane").

### What happens on expiry

The app checks your access on every member screen:

- **Your membership expired** → you're redirected to **`/subscription-expired`**. Renew at the counter to restore access.
- **Your gym's subscription expired** → you're redirected to **`/unavailable`** — the whole member app is paused until the gym renews.

While expired, AI features are unavailable to you (0 daily messages and 0 photo analyses).

---

## 18. Profile settings

The **Profile** page is where you manage your personal settings.

You can:

1. **Switch difficulty mode** — Simple / Standard / Pro (see [section 2](#2-difficulty-modes-simple--standard--pro)).
2. **Set your goal, weight, and height** — these feed your auto-calculated targets. (Weight also updates via the weekly check-in.)
3. **Set custom calorie/macro targets** — calories 800–10000, protein 0–500 g, carbs 0–1000 g, fats 0–500 g. *(Not available while a coach is assigned.)*
4. **Change your language** — Serbian (sr) or English (en).
5. **Reset your week** — tap **"Resetuj nedelju"** (Reset week) and confirm. This restarts your consistency scoring from today instead of your account creation date. Useful after a break or a fresh start.

---

*Serbian is the primary interface language throughout the app. If a term here doesn't match your screen exactly, check the parenthetical Serbian equivalents above.*
