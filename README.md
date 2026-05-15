# Lumina

A modern social media platform for sharing moments, connecting with friends, and discovering content.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Media Storage**: Cloudinary
- **Authentication**: JWT, OAuth (Google, GitHub)
- **AI Features**: OpenAI API
- **Email**: Resend
- **Deployment**: Docker, Docker Compose, GitHub Actions

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js Web App (:3000)               │
│  ┌───────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │   Pages   │  │  API Routes│  │   React Components │ │
│  └───────────┘  └────────────┘  └────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Express API Server (:4000)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │   Auth   │  │   Posts  │  │  Users   │  │ Media  │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└───────┬──────────────┬──────────────────────┬──────────┘
        │              │                      │
        ▼              ▼                      ▼
┌──────────────┐ ┌──────────┐        ┌──────────────┐
│  PostgreSQL  │ │  Redis   │        │  Cloudinary  │
│  (Users,     │ │ (Cache,  │        │  (Images,    │
│   Posts,     │ │  Sessions│        │   Videos)    │
│   Comments)  │ │  Queue)  │        │              │
└──────────────┘ └──────────┘        └──────────────┘
```

## Features

- **User Authentication**: Email/password, Google OAuth, GitHub OAuth
- **User Profiles**: Customizable profiles with avatars and bios
- **Posts**: Create, edit, delete text and media posts
- **Feed**: Personalized home feed with algorithmic sorting
- **Comments & Reactions**: Engage with posts through comments and likes
- **Follow System**: Follow/unfollow users, follower/following counts
- **Media Upload**: Image and video uploads via Cloudinary
- **Real-time Notifications**: WebSocket-based notifications
- **Direct Messaging**: Private messaging between users
- **AI Features**: AI-powered content suggestions and moderation
- **Search**: Full-text search for users and posts
- **Rate Limiting**: API protection against abuse

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose (optional)
- PostgreSQL 16 (if not using Docker)
- Redis 7 (if not using Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/lumina.git
cd lumina

# Install root dependencies
npm install

# Install workspace dependencies
npm install --workspaces
```

### Environment Setup

```bash
# Copy the example env file and update values
cp .env.example .env

# Edit .env with your configuration
# At minimum, update database credentials and secrets
```

### Running Locally (Without Docker)

```bash
# Start PostgreSQL and Redis locally
# Then run the API server
cd apps/api
npm run dev

# In another terminal, run the web app
cd apps/web
npm run dev
```

### Running with Docker

```bash
# Build and start all services
docker compose up --build

# Access the application
# Web app: http://localhost:3000
# API: http://localhost:4000
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

## Project Structure

```
lumina/
├── apps/
│   ├── api/                    # Express API server
│   │   ├── src/
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── middleware/     # Auth, validation, error handling
│   │   │   ├── routes/         # API route definitions
│   │   │   ├── services/       # Business logic
│   │   │   ├── utils/          # Helper functions
│   │   │   └── index.ts        # Entry point
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                    # Next.js web application
│       ├── src/
│       │   ├── app/            # App router pages
│       │   ├── components/     # React components
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # Utilities and API clients
│       │   └── types/          # TypeScript type definitions
│       ├── Dockerfile
│       ├── next.config.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/                   # Shared packages
│   ├── config/                 # Shared configuration
│   ├── types/                  # Shared TypeScript types
│   └── ui/                     # Shared UI components
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline
├── docker-compose.yml          # Docker orchestration
├── .env                        # Environment variables
├── package.json                # Root package (workspaces)
└── README.md
```

## API Documentation

### Base URL

```
http://localhost:4000/api
```

### Authentication

Most endpoints require authentication via JWT Bearer token:

```
Authorization: Bearer <token>
```

### Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/users/me` | Get current user profile |
| PUT | `/users/me` | Update current user profile |
| GET | `/users/:id` | Get user profile by ID |
| GET | `/posts` | Get feed posts |
| POST | `/posts` | Create a new post |
| GET | `/posts/:id` | Get a single post |
| PUT | `/posts/:id` | Update a post |
| DELETE | `/posts/:id` | Delete a post |
| POST | `/posts/:id/like` | Like a post |
| POST | `/posts/:id/comments` | Add a comment |
| GET | `/notifications` | Get user notifications |
| POST | `/media/upload` | Upload media file |

### Health Check

```
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-15T12:00:00.000Z"
}
```

## Deployment

### Docker Compose (Production)

```bash
# Set production environment variables
export NODE_ENV=production

# Build and deploy
docker compose -f docker-compose.yml up -d --build
```

### Manual Deployment

1. Build the API:
   ```bash
   cd apps/api
   npm ci
   npm run build
   ```

2. Build the Web app:
   ```bash
   cd apps/web
   npm ci
   npm run build
   ```

3. Start services with a process manager (PM2, systemd, etc.)

### CI/CD

Pushing to `main` or opening a PR triggers the GitHub Actions pipeline:

- Linting
- Type checking
- API build
- Web build
- Test suite (with PostgreSQL and Redis services)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style (ESLint + Prettier)
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages

## License

MIT License - see LICENSE file for details.
