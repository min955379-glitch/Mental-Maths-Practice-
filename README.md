# ISCSP Mental Math AI Arena

> A complete, production-grade mental mathematics training platform for ISCSP-style exam preparation.

## Project Status: IN PROGRESS

**Last Updated:** 2026-09-09
**Build Phase:** Foundation & Architecture

---

## Live Progress Tracker

### Completed Milestones

- [x] **M1: Repository initialized** (2026-09-09)
  - Empty repo cloned and configured
  - Git identity set
  - Folder structure created
  - Comprehensive README created

### In Progress

- [ ] **M2: Project scaffolding & tech stack setup**
  - Backend: Node.js + Express + TypeScript
  - Frontend: React + Vite + TypeScript
  - Database: SQLite (file-based, zero-config, production-capable)
  - ORM: Prisma for type-safe DB access
  - Auth: JWT-based authentication
  - State: Zustand for client state
  - Styling: Tailwind CSS + custom design system
  - Icons: Lucide React (professional, no emojis)

### Planned Milestones

- [ ] **M3: Database schema & migrations** (Prisma models for User, Question, QuizSession, QuestionAttempt, Category, UserPerformance, DailyProgress)
- [ ] **M4: Seed the 50 initial ISCSP questions** (verified mathematically)
- [ ] **M5: Authentication system** (register, login, logout, JWT, password hashing)
- [ ] **M6: Backend API** (questions, quiz sessions, attempts, performance, AI generation, AI coach)
- [ ] **M7: Question engine** (answer normalization, validation, generation)
- [ ] **M8: Frontend design system** (colors, typography, layout, components, icons)
- [ ] **M9: Dashboard** (streak, accuracy, time, performance chart, recent activity)
- [ ] **M10: Quiz screen** (question card, large input, submit, no multiple choice)
- [ ] **M11: Feedback system** (correct/wrong state, shortcut, mental pattern, why it works)
- [ ] **M12: Practice modes** (Quick 10, Timed 20, Full Test 50, Category, Weak Area, Mistake Review)
- [ ] **M13: Test results screen** (score, accuracy, category breakdown, review)
- [ ] **M14: Adaptive learning engine** (track accuracy/time per category, recommend weak areas)
- [ ] **M15: AI question generation** (algorithmic generators per category/pattern)
- [ ] **M16: AI coach** (data-driven advice)
- [ ] **M17: Mental Math Patterns library** (searchable reference)
- [ ] **M18: Settings** (dark mode, sound, timer, hints, difficulty, daily goal, reduced motion)
- [ ] **M19: Accessibility & mobile polish** (semantic HTML, keyboard, ARIA, focus states, reduced motion)
- [ ] **M20: Error handling & security hardening**
- [ ] **M21: End-to-end testing & final commit**

---

## Architecture Overview

```
ISCSP Mental Math AI Arena
├── backend/                Node.js + Express + TypeScript API
│   ├── prisma/             Database schema & migrations
│   ├── src/
│   │   ├── routes/         API endpoints
│   │   ├── controllers/    Request handlers
│   │   ├── services/       Business logic (questions, scoring, AI gen)
│   │   ├── middleware/     Auth, error handling
│   │   ├── utils/          Answer normalization, validation
│   │   └── lib/            Prisma client, config
│   └── package.json
├── frontend/               React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── components/     Reusable UI (Button, Card, Icon, Input, etc.)
│   │   ├── pages/          Dashboard, Quiz, Results, Patterns, Settings
│   │   ├── features/       Quiz engine, auth, analytics
│   │   ├── store/          Zustand stores
│   │   ├── lib/            API client, utilities
│   │   ├── design/         Design tokens, theme
│   │   └── App.tsx
│   └── package.json
├── README.md
└── .gitignore
```

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | Node.js + Express + TypeScript | Fast, typed, easy to deploy |
| Database | SQLite via Prisma | Zero-config, file-based, production-grade for this scale |
| Frontend | React + Vite + TypeScript | Modern, fast HMR, type-safe |
| Styling | Tailwind CSS | Utility-first, easy design system |
| State | Zustand | Lightweight, no boilerplate |
| Icons | Lucide React | Professional, no emojis |
| Auth | JWT + bcrypt | Industry standard |
| Animations | Framer Motion | Smooth, professional, reduced-motion aware |

## Design System

- **Primary:** Deep navy (#0F172A)
- **Secondary:** Indigo (#4F46E5)
- **Success:** Professional green (#10B981)
- **Error:** Professional red (#EF4444)
- **Background:** Light neutral / Dark mode
- **No emojis. No neon. No childish elements.**

## Core Features (planned)

- Free-text answer entry (no multiple choice)
- Instant feedback with mental shortcut, mental pattern, and why-it-works explanation
- 5 practice modes: Quick, Timed, Full Test, Category, Weak Area, Mistake Review
- Algorithmic question generation per pattern
- Adaptive learning engine
- AI Coach (data-driven advice)
- Performance tracking (accuracy, time, streak, category breakdown)
- Mental Math Patterns library
- Full settings & accessibility
- Mobile-first responsive design

---

## Build Log (live updates)

<!-- Each commit appends a new entry below -->

- **2026-09-09 — M1 complete:** Repository initialized, README created, folder structure planned.
