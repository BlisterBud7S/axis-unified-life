# AXIS Life OS (45)

Build a complete web application called AXIS — a personal life operating system unifying tasks, finance, health, school applications, and AI assistance in one dashboard.

===========================================

TECH STACK

===========================================

- React with TypeScript

- Tailwind CSS for styling

- Supabase for auth, database, and file storage (I'll provide URL + anon key)

- Anthropic API for AI features (I'll provide key), model: claude-sonnet-4-6

- Stripe for payments (test mode initially)

- Recharts for data visualizations

===========================================

DESIGN SYSTEM — apply globally

===========================================

- Background: #0A0F1E (deep navy)

- Accent: #3B82F6 (electric blue)

- Text primary: #F1F5F9, secondary: #94A3B8

- Cards: #111827 at 60% opacity, border #1E293B, 16px rounded, glass-morphism

- Dark mode only

- Reusable components: Button, Card, Header, ProgressBar, StatCard

- Every screen imports these — never redefine styles

===========================================

APP STRUCTURE

===========================================

Left sidebar navigation, 7 sections:

1. Home (dashboard)

2. Life (tasks, habits, calendar)

3. Finance

4. Health

5. School

6. AI Hub

7. Settings

Floating AXIS AI button bottom-right on every page, opens a modal chat.

===========================================

SUPABASE SCHEMA

===========================================

Create all tables with Row Level Security enabled (policy: user_id = auth.uid()):

- users (id, email, full_name, created_at, subscription_tier default 'free', subscription_active_until, dream_body_goal, daily_calorie_target, daily_protein_target, primary_goal, country_code)

- tasks (id, user_id, title, description, due_date, category, is_priority, is_complete, created_at)

- habit_logs (id, user_id, habit_name, log_date, is_complete)

- finance_records (id, user_id, amount, category, type, note, date, source default 'manual', created_at)

- income_records (id, user_id, estimated_monthly_income, detected_from, confidence_score, updated_at)

- bank_connections (id, user_id, provider, bank_name, account_masked_number, connected_at)

- health_logs (id, user_id, sleep_hours, workout_type, workout_duration, log_type, source, position_played, minutes_played, match_rating, notes, log_date)

- mood_logs (id, user_id, mood_rating 1-5, log_date)

- nutrition_logs (id, user_id, items_json, calories, protein_g, carbs_g, fat_g, plan_conflict, logged_at)

- diet_plans (id, user_id, calorie_target, protein_target, carbs_target, fat_target, guidelines_json, explanation, is_active, created_at)

- fitness_plans (id, user_id, weekly_plan_json, is_active, created_at)

- meal_photos (id, user_id, nutrition_log_id, photo_url)

- school_profiles (id, user_id, gpa, test_scores, extracurriculars, intended_major)

- target_schools (id, user_id, school_name, deadline, status, notes, created_at)

- school_checklist (id, school_id, item_name, is_complete)

- ai_chat_logs (id, user_id, model_used, prompt, response, context_enabled, source, created_at)

- personal_intel_data (id, user_id, reflection_answers_json, week_date)

Storage bucket: "meal-photos" (public) for meal photo uploads.

Give me the full SQL as a single script to run in Supabase's SQL Editor.

===========================================

AUTHENTICATION FLOW

===========================================

- Email/password signup and login via Supabase Auth

- Signup form captures: email, password, country dropdown (India, Australia, US, UK, Canada, Other)

- 2-step onboarding after signup: (1) full name, (2) primary goal (Get Fit / Save Money / Get Organized / Ace School Applications)

- Route guarding: unauthenticated → /auth/login; authenticated but missing name/goal → /onboarding; else main app

===========================================

HOME DASHBOARD

===========================================

Cross-pillar dashboard pulling live data:

- Greeting with user's name and today's date

- Grid of stat cards: Today's Top Task, Net Income This Month, Today's Mood, Last Workout, Nearest School Deadline

- One plain-language insight computed from real data: "Your mood is higher on days you work out" — calculated by comparing average mood_rating on days with vs without a workout log in the last 30 days. No AI call, pure calculation.

- Quick action buttons: Add Task, Log Meal, Log Finance, Chat with AXIS

- Refresh button reloads everything

===========================================

LIFE SECTION

===========================================

Three tabs: Tasks, Habits, Calendar.

Tasks:

- Add: title (required), description, due date, category dropdown (Personal/Work/School/Health/Finance, custom allowed)

- Star to pin as top 3 priorities — pinned tasks highlighted at top, separate from main list

- Sorted by due date (nearest first)

- Complete via checkbox → collapses into "Done Today" expandable section

- Delete via trash icon with confirmation

Habits:

- Add habit name → creates a card with 7-day tappable circle row

- Tap today's circle to toggle completion

- Streak counter: consecutive complete days ending today, computed from habit_logs

Calendar:

- In-app calendar showing scheduled AXIS tasks and workouts

- Monthly view default, toggle to weekly/daily

- Color-coded by category (Work blue, Personal purple, School green, Health orange, Finance yellow)

- Note in UI: "For syncing with Google Calendar or Outlook, use the AXIS mobile app" — do not attempt Google/Microsoft OAuth in this build

===========================================

FINANCE SECTION

===========================================

Manual entry:

- Amount, category (Food/Transport/Rent/Entertainment/Subscriptions/Income/Other, custom allowed)

- Income/Expense toggle

- Date (default today), optional note

- Saves to finance_records with source='manual'

Overview:

- Month picker at top

- Summary cards: Total Income (green), Total Expenses (red), Net (green if positive, red if negative)

- Category breakdown chart using Recharts (pie or horizontal bars)

- Transaction list, most recent first, click-to-delete

Bank linking:

- "Connect Bank Account" button

- Route by user's country_code: Plaid (US/UK/CA), Setu (India), Basiq (Australia)

- I don't have provider credentials yet — build the UI and routing, but display: "Bank linking for [provider] requires setup — waiting on API credentials." Do NOT fake API calls or generate mock data. Stub the actual connection cleanly, ready to wire up later.

- When credentials are added later, the flow will: open provider's hosted OAuth → capture token → API route exchanges server-side → normalize to {date, amount, description, category} → insert into finance_records (source='bank_sync') and bank_connections

- Include recurring-transaction income detection logic (identify same-amount monthly credits ±5%), inserting into income_records

- Display "Estimated Monthly Income: [X]" on Finance Overview once detected, with edit-to-override

===========================================

HEALTH SECTION

===========================================

Manual entries:

- Mood: 5-emoji daily check-in (1-5), 30-day heatmap grid visualization, saves to mood_logs

- Sleep: log hours, weekly bar chart, saves to health_logs

- Optional soccer match log: date, position dropdown (Left Back/Right Wing/Striker/Other), minutes played, personal rating 1-10, notes, log_type='match'

Log Meal (core feature):

- File upload (drag-drop and file picker) for a meal photo

- Send image (base64) to Anthropic API with vision capability

- System prompt: "Identify food items visible, estimate portions, return strict JSON only in this exact shape: {\"items\": [\"item1\"], \"estimated_calories\": number, \"protein_g\": number, \"carbs_g\": number, \"fat_g\": number, \"confidence\": \"low\"|\"medium\"|\"high\", \"plan_conflict\": string or null}. If diet restrictions are provided, flag any conflicts."

- Display result: items, macro breakdown, confidence badge

- Compare estimated calories against user's daily_calorie_target minus what they've already eaten today (sum nutrition_logs for today) — show clear status:

  - "✅ Fits your plan — X calories left today"

  - "⚠️ Tight fit — X calories left after this"

  - "❌ Over daily target by X calories"

- Low-confidence results get a portion adjustment slider (0.5x/1x/1.5x/2x) that recalculates proportionally without another API call

- On "Log this meal": upload photo to Supabase Storage → save nutrition_logs → save meal_photos with photo URL

Create My Plan (AI-generated diet + fitness):

- Questionnaire: weight, height, age, dream body goal (free text), activity level (Sedentary/Moderate/Active/Athlete), dietary restrictions (None/Vegetarian/Vegan/Custom), timeline

- Call Anthropic API as a nutrition/fitness planning assistant, return strict JSON:

  {"daily_calorie_target": number, "daily_protein_target": number, "daily_carbs_target": number, "daily_fat_target": number, "diet_guidelines": ["g1"], "weekly_workout_plan": [{"day": "Monday", "focus": "Strength - Lower Body", "duration_minutes": 45, "exercises": ["e1"]}], "explanation": "short paragraph"}

- Save to diet_plans and fitness_plans (mark previous is_active=false, don't delete history)

- Update users.daily_calorie_target and daily_protein_target

- Display: macro target cards, day-by-day workout cards, explanation card

- "Regenerate Plan" button re-runs the flow

Running daily total bar at top of Health section: calories consumed vs target, protein consumed vs target.

===========================================

SCHOOL SECTION

===========================================

My Profile:

- GPA, test scores (SAT/ACT/IB/CBSE), extracurriculars (multi-line), intended major

- Save button → school_profiles (upsert on user_id)

Target Schools:

- Add school: name, deadline (date picker), status dropdown (researching/applying/submitted/accepted/rejected), color-coded by status

- Each school expands to show a checklist (add/complete/delete items) → school_checklist

- Countdown widget at top: nearest deadline across all schools, days remaining

- Sort by deadline (nearest first)

===========================================

AI HUB

===========================================

- Chat interface calling Anthropic API (claude-sonnet-4-6, max_tokens 1000)

- All messages saved to ai_chat_logs (model_used='claude-sonnet-4-6', source='ai_hub')

- Message bubbles: user (accent blue, right-aligned), Claude (dark card, left-aligned)

- API key stored as environment variable ANTHROPIC_API_KEY, called from a backend route (Supabase Edge Function or server function) — never expose the key to the browser

"Share My Context" toggle:

- When ON, prepend a system message summarizing user's real data:

  - Today's top 3 priority tasks (from tasks)

  - This month's net finance (from finance_records)

  - Today's calories consumed vs daily_calorie_target

  - Latest mood rating

  - Nearest school deadline

  - This week's workout plan status (from fitness_plans)

- When OFF, plain chat with no personal context injected

Compare Mode toggle:

- When ON, show a second column labeled "GPT-4o"

- Call OpenAI API only if OPENAI_API_KEY environment variable is set

- If not set, show: "Set OPENAI_API_KEY environment variable to enable this column"

- Do not fake responses

===========================================

FLOATING AXIS AI BUTTON

===========================================

- Bottom-right on every page

- Opens modal chat covering ~60% of screen

- Same Claude integration as AI Hub, but "Share My Context" is always ON

- Tag conversations source='floating_button' in ai_chat_logs

- Reuse the existing Claude API function — do not duplicate

===========================================

PAYMENTS (STRIPE)

===========================================

Pricing page (/pricing) with 4 tier cards:

- Student: ₹299/month (full School, unlimited AI Hub with Claude, basic Finance)

- Pro: ₹599/month (everything Student + Bank sync + full Health + Cross-pillar insights + Compare Mode)

- Family: ₹1,499/month (up to 5 members, shared Finance view)

- Business: ₹1,999/month (Pro + GST/invoicing + team members)

Annual toggle: shows 20% discount, "2 months free" badge on Pro (highlighted with electric blue glow border).

Stripe integration:

- Stripe Checkout (redirect flow)

- On tier selection: backend route creates a Checkout Session with client_reference_id = user's Supabase id

- Success redirects to /success page

- Webhook route (/api/webhooks/stripe): on checkout.session.completed, verify signature, update users.subscription_tier and subscription_active_until

- Environment variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY

- I'll provide test-mode keys — build assuming test mode

Feature gating:

- Free tier: no bank sync, AI Hub limited to 10 messages/day (count from ai_chat_logs today), no Compare Mode

- Check subscription_tier and subscription_active_until on every gated feature

- Show clear upgrade prompt when a gated feature is accessed

===========================================

SETTINGS PAGE

===========================================

- Full name (editable), email (read-only), country (editable), primary goal (editable)

- Current subscription tier badge + "Manage Subscription" link to Stripe Customer Portal

- API keys status: Anthropic set/not set, OpenAI set/not set (don't display actual keys)

- Sign out button

- Delete account button (calls a backend function that deletes auth user and cascades data via RLS)

===========================================

ENVIRONMENT VARIABLES

===========================================

Create a clearly documented list of required environment variables:

- SUPABASE_URL, SUPABASE_ANON_KEY

- SUPABASE_SERVICE_ROLE_KEY (server-only, for webhooks)

- ANTHROPIC_API_KEY (server-only)

- OPENAI_API_KEY (server-only, optional)

- STRIPE_SECRET_KEY (server-only)

- STRIPE_WEBHOOK_SECRET (server-only)

- STRIPE_PUBLISHABLE_KEY

===========================================

BUILD APPROACH

===========================================

1. Scaffold the project and install dependencies

2. Build in this order: Auth → Layout/nav → Home dashboard → Life → Finance → Health (including Log Meal and Create Plan) → School → AI Hub → Floating AI button → Payments → Settings

3. After each section, tell me what to test before continuing

4. If anything requires credentials I haven't provided (Anthropic, Stripe, bank providers), stop and ask by name for exactly what you need — do not fake API calls

5. Every AI call goes through a backend route with the key server-side — never expose keys to the browser

6. Do not attempt Google Calendar, Outlook, Apple Calendar, or any OAuth provider integration

7. Do not attempt HealthKit or Apple Fitness — mobile-only feature

8. Deliver clean, deployable code

===========================================

DELIVERABLES

===========================================

- Complete working codebase, downloadable

- Full SQL setup script as a single file

- Documentation of every environment variable and where to get it (Anthropic at console.anthropic.com, Stripe at dashboard.stripe.com, Supabase at supabase.com)

- Reminder to create "meal-photos" storage bucket (public) in Supabase dashboard

- Testing checklist covering every feature

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://axis-unified-life.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e0ffbe21-e1fc-4d1a-afd6-5b303308da0f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
