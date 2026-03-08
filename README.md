# SubWise — Never Miss a Subscription Renewal Again

SubWise is a modern subscription management SaaS that helps users track recurring payments, forecast upcoming charges, and get automated renewal reminders — all in one clean dashboard.

If you’ve ever forgotten a renewal and got charged unexpectedly, SubWise is built for that exact problem.

Live: https://saas-app-huvu.onrender.com  
Repo: https://github.com/Satish363455/saas-app

---

## What SubWise Solves

Subscriptions are everywhere — Netflix, Spotify, SaaS tools, productivity apps — and they add up fast.

SubWise helps users:

- Stay aware of upcoming renewals  
- See monthly and annual subscription spend  
- Forecast upcoming charges  
- Receive reminder emails before renewal  
- Cancel/reactivate tracking without losing history  

---

## Key Features

### Subscription Tracking
- Add subscriptions with plan, billing cycle, renewal date, amount, and notes
- Track subscription status: Active / Due Soon / Cancelled
- Delete subscriptions anytime

### Spend Analytics Dashboard
- Total tracked subscriptions
- Monthly spend (normalized across billing cycles)
- Annual cost estimate
- Upcoming renewal list
- Next due date
- 30-day expected charges forecast
- Category-based spend breakdown

### Smart Email Reminders
- Automated reminder emails sent exactly 3 days before renewal
- Sends only once per renewal (no duplicate reminders)
- Secured cron endpoint for scheduled execution

### Renewal Engine
Supports:
- Weekly / Bi-weekly
- Monthly / Quarterly / Semi-annually
- Yearly
- Custom intervals (days / months / years)

---

## Tech Stack

- Next.js 15 (App Router)
- Supabase (Postgres + Auth)
- Resend (Email Delivery)
- Tailwind CSS
- Render (Deployment)
- UptimeRobot (Cron Scheduling)

---

## Reminder System

Secured endpoint:
