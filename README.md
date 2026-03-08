# SubWise — Never Miss a Subscription Renewal Again

SubWise is a modern full-stack subscription management SaaS that helps users track recurring payments, forecast upcoming charges, and receive automated renewal reminders — all in one clean dashboard.

If you’ve ever forgotten a renewal and been charged unexpectedly, SubWise is built for that exact problem.

---

## 🌐 Live Demo

**Live App:**  
https://saas-app-huvu.onrender.com  

**GitHub Repo:**  
https://github.com/Satish363455/saas-app  

---

## 🚀 What SubWise Solves

Subscriptions are everywhere — Netflix, Spotify, SaaS tools, productivity apps — and they add up fast.

SubWise helps users:

- ✅ Track active subscriptions  
- ✅ See monthly + annual spend  
- ✅ Forecast upcoming charges (30-day forecast)  
- ✅ Get automated reminder emails before renewal  
- ✅ Cancel/reactivate subscriptions without losing history  
- ✅ Prevent duplicate reminders  

---

## 🧠 Smart Renewal Engine

SubWise includes a dynamic renewal engine that calculates the next billing date intelligently.

Supports:

- Weekly / Bi-weekly  
- Monthly / Quarterly / Semi-annual  
- Yearly  
- Custom intervals (days / months / years)  

The engine auto-adjusts past renewals and always calculates the next valid upcoming renewal date.

---

## 🔔 Reminder System

SubWise includes a secure cron-based reminder system.

### How it works:

- A protected API endpoint: `/api/reminders/run`
- Secured using `CRON_SECRET`
- Triggered via UptimeRobot (cron scheduler)
- Sends **exactly one reminder** per renewal cycle
- Automatically locks reminders to prevent duplicates

Reminders are sent **3 days before renewal**.

---

## 🏗 Architecture Overview

### Frontend
- Next.js 15 (App Router)
- Server + Client components
- Tailwind CSS

### Backend
- Next.js API Routes
- Supabase (Postgres + Auth)
- Row Level Security (RLS)

### Email Service
- Resend API

### Cron Scheduling
- UptimeRobot → Secure endpoint

### Deployment
- Render (Production)

---

## 📊 Dashboard Features

- KPI Grid (Total / Monthly / Annual / Next Due)
- Subscription breakdown with donut chart
- 30-Day Payment Forecast
- Category-based spending analysis
- Upcoming renewals view (next 7 days)
- Interactive subscription list
- Smart status badges (Active / Renews Soon / Expired / Cancelled)
- Dynamic “Days left” calculation

---

## 🔒 Security

- Supabase Row Level Security enabled
- User-scoped data isolation
- Cron endpoint protected via secret key
- Reminder locking mechanism prevents duplicate emails

---

## ⚙️ Local Development Setup

Clone the repository:

```bash
git clone https://github.com/Satish363455/saas-app
cd saas-app
npm install
npm run dev
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=your_verified_sender
CRON_SECRET=your_secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🧩 Engineering Highlights

- Designed a production-ready SaaS architecture
- Implemented a smart recurring billing engine
- Built a secure cron-based reminder system
- Implemented duplicate reminder locking logic
- Created analytics dashboard with financial forecasting
- Deployed live production app

---

## 📌 Why This Project Matters

SubWise demonstrates:

- Full-stack system design
- Authentication + database integration
- Secure backend automation (cron)
- Real-world SaaS architecture
- Production deployment
- Advanced date/time handling logic

This is not just a UI project — it is a fully deployed SaaS product.

---

## 📬 Future Improvements

- Stripe billing integration
- Team/family shared subscriptions
- In-app notifications
- Mobile app version
- Advanced analytics export

---

## 👨‍💻 Author

Satish Kumar Reddy  
Full Stack Developer  

GitHub: https://github.com/Satish363455
