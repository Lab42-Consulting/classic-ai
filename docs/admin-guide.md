# Gym Owner / Admin Guide

This guide covers the **Gym Portal** — the back-office, desktop-first surface used by gym **owners** and **admins** to run their gym on the Classic Method Gym Intelligence System. It is written in English, but the live UI is in **Serbian (ekavica)**; key Serbian labels are called out inline (e.g. *Magacin* = warehouse/inventory).

For member-facing and coach-facing workflows, see the companion guides:
- [Member Guide](./member-guide.md)
- [Coach / Staff Guide](./coach-guide.md)
- [User Guide Index](./README.md)
- Requirements reference: [SRS Summary](../SRS_SUMMARY.md)

---

## 1. Roles at a glance

Staff records carry a `role` of **owner**, **admin**, or **coach**. This guide is for owners and admins.

| Role | Serbian | Scope | Portal access |
| --- | --- | --- | --- |
| **Owner** (*vlasnik*) | Cross-gym super-admin | All locations sharing one owner email | Restricted in the UI to **Locations** and **Magacin** (inventory) |
| **Admin** (*administrator*) | Single-gym administrator | One gym | Full management of that gym |
| **Coach** (*trener*) | Client management only | Assigned members | **No** `/gym-portal/manage` access (uses the coach dashboard) |

> Note on the owner UI: after login, owners are redirected to **Locations** and only see **Locations** and **Magacin** in the sidebar. Day-to-day gym administration (members, branding, challenges, etc.) is performed by an **admin** account per location.

---

## 2. Gym signup & subscription

### 2.1 Two separate subscription systems

Do not confuse these:

1. **Gym subscription (B2B, Stripe-billed)** — the gym pays a monthly fee in **EUR** for one of three tiers. This gates features, member capacity, and AI limits. Covered here.
2. **Member subscription (B2C, €5/month)** — renewed **manually at the gym counter**; there is **no** Stripe integration for members. Covered in [Member management](#4-member-management).

Also note: the **tiers** (Starter / Pro / Elite) are unrelated to the member **difficulty modes** (*Simple / Standard / Pro*), which are a per-member training setting.

### 2.2 Tiers & pricing

| Tier | Price (EUR/mo) | Max active members | AI msgs / member / day | AI monthly budget | Features |
| --- | --- | --- | --- | --- | --- |
| **Starter** | €99 | 50 | 10 | $5 | (none of the gated features) |
| **Pro** | €199 | 150 | 25 | $15 | Challenges, Session scheduling, Coach features |
| **Elite** | €299 | Unlimited | 50 | $50 | All of the above **+ Custom branding** |

Feature gates:
- **Challenges** and **Goal voting/fundraising** require **Pro or Elite**.
- **Session scheduling** and **Coach features** require **Pro or Elite**.
- **Custom branding** is enabled from **Elite** only.

Gated features also require the gym's subscription status to be **active** or **grace**; otherwise access is denied with *"Pretplata nije aktivna"* (subscription not active).

### 2.3 Register a new gym (self-service)

1. Open the public signup page **/gym-portal/gym-signup**.
2. Enter **gym name**, **owner name**, **owner email**, and **phone** (required); optionally add address, brand color, and a logo (image, max 2 MB).
3. Submit. The system:
   - Validates the email and rejects a duplicate owner email.
   - Creates the **Gym** with `subscriptionStatus = pending` and default tier `starter`.
   - Creates the first **Staff** record with role **owner** and a generated **Staff ID** (`S-XXXX`) + 4-digit **PIN**.
4. **Save the Staff ID and PIN now** — the plaintext PIN is shown **only once** and can never be retrieved again.
5. You are redirected to a success page confirming the credentials and next steps.

### 2.4 Pay & activate via Stripe Checkout

1. From signup success (or later), go to **/gym-portal/checkout?gymId=…&tier=…**.
2. The portal calls Stripe and redirects you to **Stripe Checkout** (billing address required; promotion codes allowed).
3. On successful payment, Stripe returns to **/gym-portal/success** and fires a webhook that:
   - Sets `subscriptionStatus = active`, sets the tier, and stamps `subscribedAt`.
   - On the paid invoice, sets `subscribedUntil` to the Stripe billing-period end.
4. If you cancel checkout, Stripe returns to the checkout page with a *"Plaćanje otkazano"* (payment cancelled) message — the gym is registered but **not activated**. Click **"Pokušaj ponovo"** (try again) to retry.

### 2.5 Change tier (upgrade / downgrade)

- An **admin** staff member triggers a tier change; Stripe applies **immediate proration**, the DB tier updates at once, and a subscription-log entry (`upgraded`/`downgraded`) is written.
- Requirements: the gym has an active/grace subscription and a Stripe subscription, and the new tier differs from the current one.

### 2.6 Failed payment: grace & expiry

1. A failed invoice moves the gym to **grace** status (feature access continues during grace).
2. Grace lasts **7 days**.
3. If the subscription is ultimately deleted, the gym becomes **expired**. Once expired, members are locked out (redirected to */unavailable*).

---

## 3. Logging into the gym portal

1. Go to **/staff-login**.
2. Select your **gym** from the dropdown, enter your **Staff ID** (`S-XXXX`, auto-uppercased) and your **4-digit PIN**.
3. Routing by role:
   - **Owner** → **/gym-portal/manage/locations**
   - **Admin** → **/gym-portal/manage**
   - **Coach** → coach dashboard (`/dashboard`)

The manage layout re-checks your role: non-staff are sent to `/staff-login`, non-admin/owner to `/dashboard`, and owners are confined to the Locations (and Magacin) pages.

---

## 4. Admin dashboard / overview

Landing page: **/gym-portal/manage**.

It shows:
- **Subscription status** and **days remaining** (a warning banner appears when ≤7 days remain).
- **Total** and **active** member counts.
- **Total staff** and **coach** counts.
- Quick-action links and a preview of your public-site **logo / primary color**.

Data is served by `GET /api/gym/settings`.

---

## 5. Member management

Member management lives under **/gym-portal/manage/members**.

### 5.1 Create a member (generates ID + PIN + QR)

1. Open **/gym-portal/manage/members/new**.
2. Enter the member's **name** and pick a **goal** (*Gubitak masnoće* = fat_loss, *Rekompozicija* = recomposition, *Rast mišića* = muscle_gain). Optionally add height, weight, gender.
3. Submit. The system:
   - Checks **tier capacity** (blocks with `MEMBER_LIMIT_REACHED` when active members reach the tier cap: 50 Starter / 150 Pro / unlimited Elite).
   - Generates a unique **Member ID** (6 chars) and a **4-digit PIN** (bcrypt-hashed), plus a **login QR** encoding `{memberId, gym}`.
   - If the creator is a **coach**, auto-assigns the member to that coach.
4. The success screen shows the **Member ID**, **PIN**, and a **downloadable QR** — hand these to the member. Credentials are shown **once only**.

### 5.2 Member list with activity status

`GET /api/members` returns each member with their coach, log/check-in counts, and a computed **activity status**:

| Status | Serbian sense | Rule |
| --- | --- | --- |
| **active** | aktivan | ≥3 daily logs in the last 7 days |
| **slipping** | popušta | any logs in the last 30 days |
| **inactive** | neaktivan | no logs |

The UI adds search, filters (goal / activity / subscription), sorting, pagination, and stat cards.

### 5.3 Member detail

`GET /api/members/[id]` returns the profile, calculated daily targets, current streak, a 30-day activity summary (meal/training/water counts), the last 8 weekly check-ins, the last 5 AI summaries, and the last 10 staff notes.

- **Add a staff note:** `POST /api/members/[id]` appends a note attributed to you.
- **Update fields:** `PATCH /api/members/[id]` can change subscription status (**active** or **expired** only), `subscribedUntil`, goal, weight (>0), height (>0), and status (active/inactive). Activating defaults `subscribedUntil` to **+30 days**.

### 5.4 Extend / activate a membership (€5/month)

1. In the members table, click **"Produži"** (extend) on a member to open the subscription modal.
2. Choose a **1 / 3 / 6 / 12-month** preset or enter a **custom future date**; a preview shows the new end date.
3. Submit. The server:
   - Computes the new end date (extends from the current end if still active, else from today), sets status **active**.
   - Writes a **SubscriptionLog** (`activated`/`extended`) with the server-side amount.
   - Adds the paid amount as a **contribution to every fundraising-status Goal** in the gym (a transparency feature — see [Goal voting & fundraising](#12-goal-voting--fundraising)).

> **Pricing note:** the server's authoritative price table is **1=€5, 3=€15, 6=€30, 12=€60**. The modal may display discounted totals (€5/€12/€24/€48), but the **amount recorded and contributed follows the server table**.

- **Subscription history:** `GET /api/members/[id]/subscription/extend` returns the last 20 subscription-log entries.

### 5.5 Export members to CSV

- A client-side export produces a **UTF-8 (with BOM)** CSV of name, Member ID, goal, activity status, subscription status, expiry date, and coach, plus a summary block.
- Filename: `clanovi-YYYY-MM-DD.csv` (*clanovi* = members).

---

## 6. Staff management (add coaches & admins)

Admin-only, under **/gym-portal/manage/staff**.

1. Open the staff page — `GET /api/staff` lists all staff with **assigned-member** and **pending-request** counts.
2. Click **"Dodaj osoblje"** (add staff), enter a **name**, and pick a role: **Trener** (coach) or **Administrator** (admin).
3. Submit — the system generates a unique **Staff ID** (`S-XXXX`) and a **4-digit PIN**, and shows them **once** with a warning that the PIN cannot be retrieved again.

**Dual-role personal account:** a staff member can create or link a personal **Member** account (same PIN) via `/api/staff/member-account` to track their own progress. Created accounts get `subscriptionStatus = active` (free) and `hasSeenOnboarding = true`. One member can be linked to only one staff.

---

## 7. Coach performance analytics

Admin-only, under **/gym-portal/manage/staff** → **"Performanse trenera"** (coach performance) tab. Backed by `GET /api/admin/coach-performance`.

Per coach it aggregates:
- Assigned-member and pending-request counts.
- **Nudge send/view rates** over the last 30 days.
- **Member outcomes** (on_track / slipping / off_track) and average consistency score, computed from this week's logs vs. calculated targets.

Plus a gym summary of coached vs. uncoached members.

---

## 8. Branding & gym settings

### 8.1 Branding (logo, colors, URL slug)

Under **/gym-portal/manage/branding** (admin or owner). Backed by `GET/PUT /api/gym/branding`.

1. Upload a **logo** (client limit ~2 MB; validated and uploaded to Vercel Blob).
2. Set **primary** and **secondary** colors (hex, validated `#RRGGBB`).
3. Set a **URL slug** for your public marketing page: 3–50 chars, pattern `^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$`, must be unique, and cannot use reserved words (`manage`, `login`, `api`, `admin`, `staff`, `member`, `gym-signup`).

> Note: branding is technically an Elite-only feature by tier definition, but the branding endpoint in this build enforces only the admin/owner role, not the Elite flag.

### 8.2 Public site settings

Under **/gym-portal/manage/settings**. Backed by `GET/PATCH /api/admin/gym-settings` (PATCH is admin-only).

Editable public marketing profile:
- Name, logo, **about** text, address, phone.
- **Opening hours** (*radno vreme*).
- Primary / secondary colors.

The public marketing page is served by slug at `GET /api/public/locations/[slug]`, listing about text, hours, gallery, member count, and website-visible trainers.

### 8.3 What "difficulty tiers" and "competition config" actually mean

- **Difficulty modes** (*Simple / Standard / Pro*) are **per-member** settings (`Member.difficultyMode`) chosen by each member in their profile — there is **no gym-level toggle** to offer/restrict them, and all modes earn identical challenge points. They are not configured from the gym portal.
- **Competition / winner-cooldown config** is set **per challenge** (see [Challenges](#11-challenges)), not as a global gym setting. Each challenge stores its point values, `winnerCount`, `excludeTopN`, and `winnerCooldownMonths`.

---

## 9. Multi-location management (owners)

Owners manage locations at **/gym-portal/manage/locations**. Locations are linked by a shared **owner email**; owners reuse the **same Staff ID + PIN** across all their locations.

1. **List locations:** `GET /api/admin/locations` returns all gyms sharing your owner email.
2. **Create a location:** provide a **name** (required) plus optional address/logo/color/slug. The new gym **inherits** subscription and branding, and an owner Staff row is created reusing your credentials.
3. **Edit a location:** `PATCH /api/admin/locations/[gymId]` updates name / address / slug.
4. **Manage location staff:** `GET/POST /api/admin/locations/[gymId]/staff` lists and adds admin/coach staff to a specific owned location, returning one-time credentials.

Access is enforced by matching the target gym's owner email to your own.

---

## 10. Gallery, pending meal approvals & QR check-in

### 10.1 Gallery

Admin-only, `GET/PUT /api/admin/gallery`. Store up to **6** gallery images (`{id, imageUrl, caption}`) shown on the public site.

### 10.2 Pending shared-meal approval

Members can share a custom meal with the gym, but it needs admin approval before other members see it.

1. Open **/gym-portal/manage/pending-meals** — `GET /api/admin/pending-shares` lists meals with `isShared && !shareApproved` (member name, macros, photo, ingredients).
2. **Approve** (`shareApproved = true`) or **Reject** (clears the sharing flags; the meal stays private for the member).

> Ingredient sharing does **not** require approval — only meal sharing does.

### 10.3 Gym QR check-in setup

Admin-only, under **/gym-portal/manage/checkin**. The QR check-in proves physical presence and unlocks **challenge training points**.

1. `GET /api/admin/gym-checkin` shows whether check-in is enabled, today's **daily code**, time to the next rotation, and today/all-time check-in counts.
2. Click **"Aktiviraj QR Prijavu"** (activate QR check-in) → `POST` generates a UUID master secret and returns today's derived code.
3. The page renders the daily code as a **downloadable / copyable QR** to print for the gym entrance.
4. **Regenerate** (`POST`, new secret — invalidates old codes) or **Deactivate** (`DELETE`, clears the secret).

**How the code works:** the daily code = first 8 uppercase chars of `SHA-256(masterSecret + UTC date)`, rotating at **midnight UTC**. Yesterday's code is accepted only during the first UTC hour (grace window). Each member can check in **once per day** (`GymCheckin` is unique per member per day).

---

## 11. Challenges

Under **/gym-portal/manage/challenges** (gated behind the **challenges** feature — **Pro/Elite**; Starter is blocked with `TIER_REQUIRED`). Members earn points by logging meals, water, trainings, and weekly check-ins; a leaderboard ranks them.

### 11.1 Lifecycle

`draft → registration → active → ended` (only **one** non-ended challenge per gym at a time).

### 11.2 Create a challenge

1. Click new challenge and fill in: **name**, **description**, **reward description**, **start/end dates**, **join-deadline days**, **winner count**, and configurable **point values**.
2. Submit — `POST /api/admin/challenges` validates required fields and that end > start, and rejects creation if another draft/registration/active challenge still exists. It is created as **draft**.

**Default / configurable scoring:**

| Setting | Default |
| --- | --- |
| Points per meal | 5 |
| Points per training | 15 |
| Points per water | 1 |
| Points per weekly check-in | 25 |
| Daily streak bonus | 5 |
| Join deadline (days) | 7 |
| Winner count | 3 |
| Exclude top N (from next challenges) | 3 |
| Winner cooldown (months) | 3 |

### 11.3 Publish, edit, end, delete

- **Publish:** `PATCH … {action:'publish'}` moves draft → **registration** (members can now see it).
- **Edit:** allowed only while **draft** or **registration** (locked once active).
- **End:** `PATCH … {action:'end'}` sets status **ended** and, in a transaction, snapshots the top `winnerCount` participants into **ChallengeWinner** rows (rank + points; idempotent).
- **Delete:** only a **draft with zero participants** can be deleted.

### 11.4 Leaderboard, winners & cooldown

- The detail page (`GET /api/admin/challenges/[id]`) shows the full leaderboard, ordered by total points (ties broken by earliest join).
- **Anti-cheat:** training points are awarded only if the member has a **same-day gym check-in** (when QR check-in is enabled).
- **Winner cooldown:** a member who placed within `excludeTopN` of a win in the last `winnerCooldownMonths` is blocked from joining new challenges until the cooldown expires (with a Serbian explanation and end date). Coaches cannot join challenges at all.

---

## 12. Goal voting & fundraising

Under **/gym-portal/manage/goals** (also gated behind the **challenges** feature — **Pro/Elite**). This unified system lets members vote on gym improvements, then track fundraising toward the winning option. All amounts are stored in **cents** and displayed in **euros**.

### 12.1 Lifecycle

`draft → voting → fundraising → completed` (`cancelled` is reachable from any non-completed state). A **single-option** goal skips voting and goes straight to fundraising on publish.

### 12.2 Create & run a goal

1. Fill the form: **name**, **description**, and **1+ options** (each with a name, optional description/image, and a **euro target amount**). A **voting deadline** (`votingEndsAt`, must be in the future) is required when there is more than one option.
2. Submit — `POST /api/admin/goals` validates the admin role + tier, each option (name, targetAmount > 0), and creates the goal as **draft** with ordered options.
3. **Publish** — `PATCH … {action:'publish'}`: single-option → **fundraising** (winner pre-set); multi-option → **voting**.
4. **Members vote** — one vote per member per goal, changeable until the deadline. Only members with an **active/trial** subscription can vote.
5. **Close voting** — automatic when the deadline passes (lazy evaluation on access), or manually via `PATCH … {action:'close_voting'}`. The option with the most votes wins (ties broken by lower display order); status → **fundraising**.
6. **Fundraising** — contributions accrue toward the winning option's target. Add a **manual contribution** via `PATCH … {addAmount, addNote}`.
7. **Completion** — when `currentAmount ≥ target`, status → **completed**.

### 12.3 Where contributions come from

- **Automatic (subscription):** whenever staff extend/activate a member's membership, the paid amount is added as a **`subscription`** contribution to **every** fundraising-status goal in the gym.
- **Manual:** an admin adds a euro amount (default note *"Ručni unos"* = manual entry) to a goal in the fundraising phase.

### 12.4 Admin dashboard & deletion

- `GET /api/admin/goals` lists all goals with status, vote totals, contribution counts, and progress; `GET /api/admin/goals/[id]` shows the option breakdown and the **50 most recent contributions**.
- **Cancel** any non-completed goal, or **delete** a goal only if it is still a **draft with zero votes and zero contributions**.

### 12.5 Legacy fundraising goals

An older **FundraisingGoal / FundraisingContribution** model still exists and is **read-only-displayed** on the member home page (max 3). It is explicitly being replaced by the unified Goal system above and has no write API in this build.

---

## 13. Magacin — inventory & point of sale (owner-only)

**Magacin** = warehouse/inventory. This owner-only module lives at **/gym-portal/manage/shop** with two tabs: **Proizvodi** (products) and **Prodaja** (sales). Prices and sale amounts are in **whole RSD** (Serbian dinar) units. Every stock change writes an audit log.

> Access is strictly **owner** role only; admins and coaches have no access.

### 13.1 Product categories

Loaded from `/api/owner/categories`.

1. **Create** a category (`POST`) with a **name** plus optional color/icon. Names are **unique per gym** (duplicate → *"Kategorija sa tim nazivom već postoji"*).
2. **Edit** (`PUT`) — rename/recolor (duplicate-name check applies).
3. **Delete** (`DELETE`) — blocked if the category still has products (*"Kategorija ima N proizvoda. Premestite ih pre brisanja."* = it has N products; move them first).

### 13.2 Add a product

1. Proizvodi tab → **"Novi proizvod"** (new product).
2. Optionally upload an image (client-validated as `image/*`, **< 1 MB**, stored as a base64 data URL).
3. Enter **name** (required), description, category, SKU, **selling price in RSD** (required, ≥ 0), optional cost price, **initial stock**, and **low-stock alert** threshold; toggle **Aktivan** (active).
4. Save — `POST /api/admin/products` rounds prices to whole integers, creates the product, and (if initial stock > 0) writes an **initial** StockLog (*"Početni inventar"*) in a transaction.

### 13.3 Adjust stock (with audit log)

1. Click the stock (cube) icon on a product.
2. Pick a type: **Nabavka** (purchase, +), **Povraćaj** (return, +), or **Korekcija** (adjustment, +/–), enter a quantity and optional note.
3. Apply — `POST /api/admin/products/[id]/stock` computes `newStock`, **rejects negatives**, and writes a **StockLog** (type, quantity, previous/new stock, staff, note) atomically.

Stock-log types: `purchase`, `sale`, `adjustment`, `initial`, `return` (`sale` and `initial` are system-generated).

### 13.4 Record a sale (point of sale)

1. Prodaja tab → **"Nova prodaja"** (new sale). Only **active, in-stock** products are listed.
2. Select a product, **quantity** (≥ 1), an optional **buyer** (gym member), and a **payment method**: **Gotovina** (cash) / **Kartica** (card) / **Ostalo** (other). A live total preview shows price × quantity.
3. Record — `POST /api/admin/sales` re-checks ownership, that the product is active, and that stock ≥ quantity, then in one transaction creates the **Sale** (snapshotting `unitPrice`, `totalAmount`), writes a negative **`sale`** StockLog (note `Prodaja #<last6>`), and decrements stock.

### 13.5 Sales history & summary

- `GET /api/admin/sales` (default limit 100, capped at 1000; optional date/product filters) returns sales newest-first plus a **summary**: total sales count, **total revenue (RSD)**, total units. Note the summary reflects the fetched window, not necessarily all-time.

### 13.6 Low stock & inventory value

- Stock badge colors: **green** (ok), **yellow** (low: `0 < currentStock ≤ lowStockAlert`), **red** (out: `currentStock = 0`).
- Filter the products list to **"Niske zalihe"** (low stock) or **"Nema na stanju"** (out of stock).
- A running **total inventory value** = Σ(price × currentStock) is shown.

### 13.7 Deleting products

- **Hard delete** only if the product has **zero sales**; otherwise it is **soft-deleted** (`isActive = false`) so historical sales stay intact.

> The member-facing **/supplements** page is a **static educational guide** keyed to the member's goal — it is **not** connected to Magacin inventory. There is no member storefront for owner products in this build.

---

## 14. Quick reference — key admin routes

| Task | UI page | API |
| --- | --- | --- |
| Dashboard | `/gym-portal/manage` | `GET /api/gym/settings` |
| Members | `/gym-portal/manage/members` | `GET/POST /api/members` |
| New member | `/gym-portal/manage/members/new` | `POST /api/members` |
| Extend membership | members table modal | `POST /api/members/[id]/subscription/extend` |
| Staff | `/gym-portal/manage/staff` | `GET/POST /api/staff` |
| Coach performance | staff → Performanse trenera | `GET /api/admin/coach-performance` |
| Branding | `/gym-portal/manage/branding` | `GET/PUT /api/gym/branding` |
| Public settings | `/gym-portal/manage/settings` | `GET/PATCH /api/admin/gym-settings` |
| Gallery | (settings/gallery) | `GET/PUT /api/admin/gallery` |
| Locations (owner) | `/gym-portal/manage/locations` | `GET/POST /api/admin/locations` |
| Pending meals | `/gym-portal/manage/pending-meals` | `GET/POST /api/admin/pending-shares` |
| QR check-in | `/gym-portal/manage/checkin` | `GET/POST/DELETE /api/admin/gym-checkin` |
| Challenges | `/gym-portal/manage/challenges` | `GET/POST /api/admin/challenges` |
| Goals | `/gym-portal/manage/goals` | `GET/POST /api/admin/goals` |
| Magacin (owner) | `/gym-portal/manage/shop` | `/api/admin/products`, `/api/admin/sales`, `/api/owner/categories` |
| Change tier | — | `POST /api/stripe/change-tier` |
| Tier info | — | `GET /api/gym/tier-info` |

---

## 15. Serbian glossary

| Serbian | English |
| --- | --- |
| Magacin | Warehouse / inventory |
| Proizvodi | Products |
| Prodaja | Sales |
| Nova prodaja | New sale |
| Novi proizvod | New product |
| Nabavka / Povraćaj / Korekcija | Purchase / Return / Adjustment |
| Gotovina / Kartica / Ostalo | Cash / Card / Other |
| Niske zalihe / Nema na stanju | Low stock / Out of stock |
| Produži | Extend (subscription) |
| Dodaj osoblje | Add staff |
| Trener / Administrator / Vlasnik | Coach / Admin / Owner |
| Performanse trenera | Coach performance |
| Radno vreme | Opening hours |
| Aktiviraj QR Prijavu | Activate QR check-in |
| Pretplata nije aktivna | Subscription not active |
| Plaćanje otkazano | Payment cancelled |
| Nacrt / Glasanje / Prikupljanje / Završeno / Otkazano | Draft / Voting / Fundraising / Completed / Cancelled |
| Clanovi | Members |
