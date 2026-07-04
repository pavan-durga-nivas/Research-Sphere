# Research-Sphere

> An AI-assisted research workspace — discover papers, write and collaborate on drafts in a rich document editor, validate originality, and manage your reference library, all in one place.

Research-Sphere is a full-stack [Next.js](https://nextjs.org) application that brings the research writing workflow together: a Word-like collaborative editor (powered by TipTap/ProseMirror), an AI writing assistant, document validation, and a personal library.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-optional-47a248?logo=mongodb" />
</p>

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Data & persistence](#data--persistence)
- [Local development login](#local-development-login)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Rich document editor** — a TipTap (ProseMirror) editor with headings, lists,
  tables, blockquotes, code blocks, links, highlighting, sub/superscript,
  text alignment, resizable images, and multi-column layouts.
- **Real-time-ish collaboration** — share documents by account ID or email with
  view/edit permissions, autosave, and a sync guard that prevents collaborators
  from silently overwriting each other's in-flight edits.
- **AI writing assistant** — ask for outlines, section summaries, and citation
  help, powered by Google Gemini.
- **Discovery** — search and explore research papers.
- **Validation** — check a draft's originality and AI-probability, with
  strengths, risks, and action items.
- **Library** — save and manage papers and references.
- **Export** — download drafts as Word (`.doc`) or PDF, and preview a LaTeX
  conversion of the document.
- **Authentication** — email/password auth with signed session cookies and
  route protection via middleware.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, Radix Slot, `lucide-react` icons |
| Editor | TipTap 3 / ProseMirror |
| Language | TypeScript 5 |
| Persistence | Local JSON store (default) or MongoDB |
| AI | Google Gemini (Flash) |
| Email | Resend (collaborator invites) |
| Exports | `jspdf`, `html2canvas`, `mammoth`, `pdf-parse` |

## Project structure

```
src/
├── app/                      # App Router routes
│   ├── (auth)/               # login / register
│   ├── api/                  # route handlers (auth, documents, ai, collaborators, …)
│   ├── editor/               # collaborative document editor
│   ├── discovery/            # paper discovery
│   ├── validation/           # originality / AI validation
│   ├── library/              # reference library
│   ├── dashboard/ profile/   # account surfaces
│   ├── globals.css           # design tokens + editor content styles
│   └── layout.tsx
├── components/
│   ├── editor/extensions/    # custom TipTap extensions (resizable image, columns)
│   ├── providers/            # Auth + Theme context
│   └── ui/                   # Button, Card, Input primitives
├── lib/                      # auth, data store, mongo, ai, session tokens, utils
├── middleware.ts             # route protection
└── types/
scripts/
└── migrate-json-to-mongo.mjs # one-off JSON → MongoDB migration
```

## Getting started

### Prerequisites

- **Node.js 20+** and npm
- (Optional) a **MongoDB** connection string for persistent, multi-user storage
- (Optional) a **Google Gemini** API key to enable the AI assistant
- (Optional) a **Resend** API key to send collaborator invite emails

### Installation

```bash
# 1. Clone
git clone https://github.com/pavan-durga-nivas/Research-Sphere.git
cd Research-Sphere

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# then edit .env.local (see the table below)

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The app runs without any external services configured — it falls back to a
> local JSON store, and AI/email features degrade gracefully when their keys are
> absent.

## Environment variables

Create `.env.local` (for development) or `.env` and set the values you need. All
are optional for a basic local run; configure them to enable the corresponding
feature.

| Variable | Required | Description |
| --- | --- | --- |
| `AUTH_SECRET` | Recommended | Secret used to sign session cookies. Set a strong random value in any shared/production environment. |
| `GEMINI_FLASH_API_KEY` | For AI | Google Gemini API key that powers the AI assistant. |
| `GEMINI_FLASH_MODEL` | Optional | Gemini model id (default: `gemini-2.5-flash`). |
| `RESEND_API_KEY` | For invites | Resend API key for sending collaborator invite emails. |
| `RESEND_FROM_EMAIL` | For invites | Verified "from" address for invite emails. |
| `MONGODB_URI` | For MongoDB | MongoDB connection string. When unset, the app uses the local JSON store. |
| `MONGODB_DB` | For MongoDB | Database name (default: `research-sphere`). |
| `MONGODB_HOSTS` | Optional | Comma-separated hosts (alternative to a full URI). |
| `MONGODB_REPLICA_SET` | Optional | Replica set name, if applicable. |

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the development server (Turbopack). |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run migrate:json-to-mongo` | Migrate the local JSON store into MongoDB (reads `.env`). |

## Data & persistence

Research-Sphere supports two storage backends:

- **Local JSON store (default).** Data is written to `data/users.json` and
  `data/appData.json`. This requires no setup and is ideal for local
  development, but it is single-node and not suitable for production.
- **MongoDB.** Set `MONGODB_URI` (and related vars) to persist data in MongoDB.
  To move existing local data into MongoDB, run:

  ```bash
  npm run migrate:json-to-mongo
  ```

## Local development login

In development mode only, the login page accepts a built-in demo account so you
can explore the app without registering:

```text
Email:    demo@research-sphere.local
Password: research-demo
```

This account is served from memory and is **disabled when `NODE_ENV=production`**.

## Deployment

The app is a standard Next.js application and deploys to any platform that
supports Next.js (e.g. [Vercel](https://vercel.com/new)):

1. Set the environment variables from the table above in your hosting provider.
2. Provide a `MONGODB_URI` for persistent, multi-user storage.
3. Set a strong `AUTH_SECRET`.
4. Build and start:

   ```bash
   npm run build
   npm run start
   ```

## Roadmap

The editor is being evolved into a "mini MS Word" experience. Progress and
decisions are tracked in [`development_tracking.md`](./development_tracking.md).
Highlights of upcoming work:

- Export fidelity (true `.docx` generation, structured PDF).
- Real-time collaboration with presence/cursors (Yjs).
- Floating/dockable AI assistant refinements.

## Contributing

1. Create a feature branch (`feat/…`, `fix/…`, or `spike/…`).
2. Make your changes and keep `development_tracking.md` up to date for notable work.
3. Ensure the checks pass:

   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```

4. Open a pull request that references the relevant issue.

## License

No license file is currently included. Add a `LICENSE` to define usage terms
before distributing.
