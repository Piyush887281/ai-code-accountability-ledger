# AI-Code Accountability Ledger

> Continuous visibility into which code was AI-generated, how deeply it was reviewed, and where unowned/unexplained business-critical code risk is concentrated.

## Overview

The AI-Code Accountability Ledger helps engineering teams understand and manage the risks introduced by AI-generated code. It provides:

- **AI-Authorship Detection** — Identifies which code changes were likely AI-generated
- **Review-Depth Scoring** — Measures how thoroughly each change was actually reviewed
- **Criticality Tagging** — Highlights changes in business-critical code paths (auth, payments, data access)
- **Progressive Disclosure** — Four-layer detail view from summary to full technical evidence
- **Accountability Reports** — PDF/CSV export for compliance and leadership visibility

## Tech Stack

- **Framework**: Next.js (App Router) with TypeScript
- **Database**: PostgreSQL (managed, with Row-Level Security)
- **Authentication**: GitHub OAuth
- **AI**: Structured-output classification with provider abstraction and fallback
- **Styling**: Vanilla CSS with design tokens

## Project Structure

```
src/
├── app/                        # Next.js App Router pages and API routes
├── modules/
│   ├── auth/                   # GitHub OAuth, sessions, user management
│   ├── ingestion/              # Repository connection, webhooks, backfill
│   ├── analysis-engine/        # Review-depth scoring, criticality tagging
│   ├── ai-orchestration/       # AI provider calls with safety controls
│   ├── reporting/              # PDF/CSV report generation
│   └── notification/           # In-app and external notifications
├── lib/
│   └── db/                     # Database connection and ORM config
└── types/                      # Shared TypeScript type definitions
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run type-check

# Lint
npm run lint

# Build for production
npm run build
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values.
**Never commit `.env` files.** See `.gitignore`.

## License

Proprietary. All rights reserved.
