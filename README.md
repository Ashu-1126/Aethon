<div align="center">

# ⬡ AETHON

### Unified Asset & Operations Brain

**Industrial Knowledge Intelligence** — every drawing, manual, permit, inspection and incident report, fused into one cited, queryable knowledge graph.

*Preserving what would otherwise be lost.*

[![Next.js](https://img.shields.io/badge/Next.js-14.2-000?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-ff0080?logo=framer&logoColor=white)](https://www.framer.com/motion/)

</div>

---

## 🌍 The Problem

In asset-intensive industries, professionals spend **~35% of their working hours** searching for information, clarifying instructions, or recreating documents that already exist somewhere. A typical large plant runs across **7–12 disconnected document systems** — P&IDs in one place, work orders in another, procedures in a third, regulations scattered across email.

This fragmentation contributes to **18–22% of unplanned downtime** in heavy industry. And with **~25% of senior engineers retiring this decade**, decades of undocumented operational knowledge walk out the door with them — once gone, it cannot be recovered.

> **The data exists. The intelligence layer to act on it does not.**

## 💡 The Solution

**AETHON** ingests heterogeneous industrial documents — engineering drawings, maintenance records, safety procedures, inspection reports, regulations — and makes their *collective intelligence* queryable, actionable, and continuously updated at the point of need.

Not a search box. A **reasoning layer** that connects every document a plant has ever produced, and acts on what it finds — with answers you can prove.

---

## ✨ Features

| | Module | What it does |
|---|---|---|
| 📚 | **Universal Ingestion** | PDFs, scanned forms, P&ID drawings, spreadsheets and email archives — parsed, OCR'd and embedded automatically. |
| 🕸️ | **Knowledge Graph** | Equipment ↔ procedure ↔ regulation ↔ incident, linked into one traversable structure — the relationships no single team can hold. |
| 💬 | **Expert Copilot (RAG)** | Ask anything across the corpus. Every answer carries **inline citations, a confidence score, and a source link**. |
| 🔧 | **Maintenance & RCA** | Fuses work orders, failure records and OEM manuals to surface root causes and predictive maintenance triggers. |
| 🛡️ | **Compliance Agent** | Maps Factory Act, OISD, DGMS & PESO clauses against live procedures — flags gaps, builds audit-ready evidence packages. |
| ⚠️ | **Conflict Detector** | Finds contradictions across documents (a manual says 40 Nm, the SOP says 55 Nm) *before* they cause an incident. |

---

## 🎨 Design

AETHON wears a **"premium industrial" aesthetic** — a deep-teal abyss base lit by gold and bright-teal glow accents, generous spacing, and cinematic motion throughout. The interface is built to feel *trustworthy and heavenly*, not busy.

**Animation highlights** (all respecting `prefers-reduced-motion`):
- Living **aurora background** with drifting conic-gradient blobs
- **Scroll-reveal** system (directional fade / slide / blur-in) + staggered grids
- **3D magnetic tilt cards** with a cursor-following glare
- **Magnetic buttons** and a gold shimmer sweep
- **Count-up** stat counters and animated SVG compliance rings
- An animated **knowledge-graph** with edge draw-in and travelling pulse particles
- Cinematic **route transitions** and a gold scroll-progress beam

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 3.4 (custom teal + gold design system) |
| **Animation** | Framer Motion 11 |
| **Icons** | Lucide React |
| **Utilities** | clsx + tailwind-merge |

> This repository is the **frontend / experience layer**. The intelligence backend (document ingestion pipeline, vector store, knowledge graph, RAG + agents) is a separate service — see *Roadmap*.

---

### 🚀 One-Command Boot (Full Stack)

To run the entire AETHON intelligence platform (Next.js Frontend + FastAPI Backend + Ollama + ChromaDB) on your machine:

```bash
# Clone the repository
git clone https://github.com/Ashu-1126/Aethon.git
cd Aethon

# Run the boot script
bash start.sh
```

This will automatically create your environment variables, pull the local `llama3.1:8b` models, and orchestrate all containers. 
Open **[http://localhost:3000](http://localhost:3000)** in your browser when done!

---

### 💻 Manual Frontend Development (Mock Mode)

If you only want to work on the UI without running the AI models:

```bash
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

---

## 📁 Project Structure

```
AETHON/
├── app/
│   ├── layout.tsx              # Root layout (aurora bg, scroll progress, fonts)
│   ├── page.tsx                # Landing page
│   ├── dashboard/page.tsx      # Operations console — KPIs, feed, compliance ring
│   ├── copilot/page.tsx        # RAG chat with cited answers
│   └── knowledge-graph/page.tsx# Animated knowledge-graph explorer
│
├── components/
│   ├── landing/                # Hero · Stats · Features · Showcase · CTA
│   ├── layout/                 # Navbar · AppSidebar
│   └── motion/                 # Reusable animation primitives
│       ├── Aurora.tsx          # Living background
│       ├── Reveal.tsx          # Scroll-reveal + stagger
│       ├── TiltCard.tsx        # 3D magnetic tilt card
│       ├── MagneticButton.tsx  # Cursor-magnetic button
│       ├── ScrollProgress.tsx  # Top progress beam
│       └── PageTransition.tsx  # Route curtain transition
│
├── lib/utils.ts                # cn() class-merge helper
├── tailwind.config.ts          # Design tokens (teal + gold palette)
└── app/globals.css             # Base styles + component classes
```

---

## 🗺️ Roadmap

- [x] Cinematic frontend shell (landing, dashboard, copilot, knowledge graph)
- [ ] Document ingestion & upload pipeline (PDF / OCR / drawings)
- [ ] Vector store + embeddings for semantic retrieval
- [ ] Knowledge-graph database (entity & relationship extraction)
- [ ] Hybrid Graph-RAG retrieval with reranking
- [ ] Live agents — Compliance, Maintenance/RCA, Conflict Detector
- [ ] Accuracy scoreboard (answer quality vs. keyword-search baseline)

---

## 📊 Built For

**ET AI Hackathon 2026 — Problem Statement #8:** *AI for Industrial Knowledge Intelligence — Unified Asset & Operations Brain.*

<div align="center">

---

**AETHON** · *The operations brain your plant forgot it had.*

</div>
