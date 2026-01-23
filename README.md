# Classic Method - Gym Intelligence System

A digital accountability and guidance platform for gym members and staff. Built with Next.js 14, TypeScript, and AI-powered coaching.

## Overview

Classic Method is a comprehensive gym management system that provides:

- **Member Experience**: Daily logging (meals, training, water), goal tracking, AI coaching
- **Coach Tools**: Member management, nudges, custom meal creation, session scheduling
- **Admin Portal**: Full gym management, staff administration, branding customization
- **Gamification**: Challenges, leaderboards, streaks, and rewards

## Key Features

### For Members
- Daily meal, training, and water logging
- Three difficulty modes: Simple, Standard, Pro
- AI-powered nutrition, supplements, and training agents
- Weekly check-ins with progress photos
- Custom metrics tracking with graphs
- QR code gym check-ins
- Challenge participation with leaderboards

### For Coaches
- Assigned member dashboard
- Accountability nudges
- Custom meal creation for members
- Session scheduling with proposals
- AI knowledge customization per member

### For Admins
- Desktop-first gym portal
- Member and staff management
- Subscription tracking and extension
- Gym branding (logo, colors)
- Challenge creation and management
- Fundraising goals with progress tracking

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL (Neon Serverless) |
| ORM | Prisma 6 |
| AI | Anthropic Claude API |
| Auth | Custom JWT with HTTP-only cookies |
| Payments | Stripe |
| Testing | Vitest + Testing Library |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- PostgreSQL database (or [Neon](https://neon.tech) account)
- Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/classic-ai.git
cd classic-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with required values (see [Environment Variables](#environment-variables))

5. Push the database schema:
```bash
npm run db:push
```

6. (Optional) Seed the database:
```bash
npm run db:seed
```

7. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Production PostgreSQL connection string | Yes |
| `DEV_DATABASE_URL` | Development database (local dev) | No |
| `STAGING_DATABASE_URL` | Staging database (Vercel Preview) | No |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | Yes |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | Yes |
| `NEXT_PUBLIC_APP_URL` | Application URL | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | No |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | No |

See [.env.example](.env.example) for detailed configuration.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
classic-ai/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages (login)
│   ├── (member)/          # Member pages (home, log, chat, etc.)
│   ├── (staff)/           # Coach dashboard
│   ├── gym-portal/        # Admin portal
│   └── api/               # API routes
├── components/            # React components
│   └── ui/               # Reusable UI components
├── lib/                   # Shared utilities
│   ├── db/               # Database client
│   ├── auth/             # Authentication helpers
│   └── ai/               # AI agent utilities
├── prisma/               # Prisma schema and migrations
└── public/               # Static assets
```

## Database

The application uses Prisma with the Neon serverless adapter. Database selection is automatic:

- **Local development**: Uses `DEV_DATABASE_URL` (falls back to `DATABASE_URL`)
- **Vercel Preview**: Uses `STAGING_DATABASE_URL` (falls back to `DATABASE_URL`)
- **Vercel Production**: Uses `DATABASE_URL`

## Deployment

The application is designed for deployment on Vercel. See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Quick Deploy

1. Push to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Branch Strategy

- `main` branch → Production deployment
- `development` branch → Preview/Staging deployment

## Documentation

- [Software Requirements Specification](SRS.md) - Detailed functional requirements
- [Technical Documentation](DOCUMENTATION.md) - Architecture and implementation details
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Vercel deployment instructions

## Localization

The application is localized for Serbian (ekavica dialect). All AI agents respond in Serbian, and the UI is designed for Serbian-speaking users.

## License

Private - All rights reserved.
