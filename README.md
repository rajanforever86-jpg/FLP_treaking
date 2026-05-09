# TRAKZY AI Ecosystem

TRAKZY AI is a production-ready sales performance and lead management platform built for modern high-growth teams. It provides an intelligent layer of tracking and automation to ensure no sales opportunity is missed.

## 🚀 Key Features

### 🎯 Lead Management (PART 3)
- **Omni-channel Status Tracking**: Track leads through All, Plan Share, Not Interested, No Receive, and Signup phases.
- **Intelligent Status Flows**: Dedicated UIs for different lead states (e.g., specific radio buttons for rejection reasons).
- **One-Tap Actions**: Direct integration with `tel:` and `wa.me` for instant communication.
- **Smart Imports**: CSV import functionality with parsing for name, age, city, and phone.

### 👥 Team Hierarchy
- **3-Generation Tracking**: View team performance across GEN 1, GEN 2, and GEN 3.
- **Wave Card Style**: Visual performance cards showing Leads, Signups, Deals, and Pending metrics at a glance.
- **Referral System**: Simple referral-based team building.

### 📊 Advanced Analytics
- **Conversion Ratios**: Lead-to-Signup and Signup-to-Deal percentage tracking.
- **Growth Charts**: Weekly business growth visualization.
- **Dead Lead Analysis**: Understand why leads are dropping with reason-based pie charts.
- **Performance Leaderboards**: Reward and track top team contributors.

### 🎓 Training & Growth
- **Multi-step Training Tracker**: Sequential training requirements (Signup vs Deal Done).
- **Rich Media Integration**: Support for video links, document previews, and easy sharing.

## 🛠 Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide icons, Recharts, Framer Motion.
- **Backend**: Firebase Auth, Firestore.
- **Security**: Firebase Security Rules, Auth Persistence.

## 📦 Installation & Setup

1. **Firebase Configuration**:
   Ensure `firebase-applet-config.json` is present in the project root. This is automatically managed by the build system.

2. **Environment Variables**:
   Create a `.env` file for any additional secret keys if needed.

3. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Development**:
   ```bash
   npm run dev
   ```

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

## 🏗 Project Structure
- `/src/pages`: Feature-specific React views.
- `/src/components`: Shared UI components (Navbar, Sidebar, BottomNav, etc.).
- `/src/context`: Authentication and global state management.
- `/src/lib/firebase.ts`: Firebase configuration and helpers.

---
© 2024 TRAKZY AI Ecosystem. Developed with focus on conversion and tracking.
