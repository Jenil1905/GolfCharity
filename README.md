# GolfPulse Charity Draw Platform 🏌️‍♂️⛳️

A full-stack, transparent charity subscription platform where users play for prizes while supporting causes they care about.

## 🚀 Overview
GolfPulse is designed to maximize both user winnings and charitable impact. Every month, subscribers participate in a prize draw. A portion of every winner's prize is automatically donated to a charity of their choice, alongside a baseline platform-wide contribution.

---

## 🏗️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express.
- **Database**: Supabase (PostgreSQL) with Real-time Auth.
- **Deployment**: Vercel (Frontend) & Render (Backend).

---

## ⚙️ How It Works (The Core Logic)

### 1. The Draw & Prizes
- **Prize Pool**: Generated from active monthly subscriptions (£10/user).
- **Platform Baseline**: 10% of the total monthly pool (£1/user) is *immediately* ring-fenced for charity.
- **Matching Rules**:
    - **5/5 Match**: Wins the Jackpot (Current Pool - 10% Baseline).
    - **4/5 Match**: Wins a secondary prize (e.g., £50).
    - **3/5 Match**: Wins a small prize (e.g., £2.50).
- **Rollovers**: If no one hits 5/5, the Jackpot rolls over to the next month.

### 2. The Donation Impact Formula
Total Charity Impact is calculated as:
`Platform Baseline (10%) + User-selected Gift % + Direct Donations`

- **User Gift %**: During sign-up, users choose to donate between **10% and 100%** of any future winnings.
- **Calculation**: If a user wins £100 and has a 20% gift setting, they receive **£80** and the charity receives **£20**.

---

## ⚠️ Important: Payment Integration (MOCK)
> [!IMPORTANT]
> **Stripe Integration is currently FAKED/MOCKED.**
> - All "Successful Payment" screens are simulations to demonstrate the user flow.
> - No real money is currently processed. The `/stripe` routes in the backend are designed to return successful responses immediately for testing and demonstration purposes.

---

## 📊 Admin Dashboard
The `/admin` route provides a full management suite:
1.  **Users**: Manage profiles, adjust charity percentages, and track subscriptions.
2.  **Draws**: Create new draws, pick winning numbers, and publish results.
3.  **Winners**: Review and process payouts for both pending and paid winners.
4.  **Analytics**: Real-time tracking of:
    - **Direct Donations**: One-time gifts outside the game.
    - **Winning Contributed**: Impact generated specifically from winning shares.
    - **Total Payout**: Financial obligation (what is owed to users).
    - **Charity Impact**: The "Big Number" showing the platform's total footprint.

---

## 🛠️ Local Development

### Prerequisites
- Node.js (v18+)
- Supabase Project (URL & Anon Key)

### Steps
1. **Clone the Repo**
2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. **Backend Setup**:
   ```bash
   cd backend
   npm install
   npm start
   ```
4. **Environment Variables**: Use the provided `.env.example` templates in both folders to connect your Supabase instance.

---

## 🌐 Deployment Details
- **Frontend (Vercel)**: Ensure the "Root Directory" is set to `frontend` and the `vercel.json` file is present to handle SPA routing (preventing 404s on refresh).
- **Backend (Render)**: Set the "Root Directory" to `backend` and ensure all `.env` keys are added to the Render dashboard.

---

## ✨ Design Philosophy
The platform uses **Modern Rich Aesthetics**:
- Sleek dark modes and vibrant accent colors.
- Micro-animations for button hovers and list item entries.
- Transparent reporting to build trust between the platform and its supporters.
