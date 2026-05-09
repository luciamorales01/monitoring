# Monitoring TFG - Agent Rules

## Stack
- Frontend: React + TypeScript + Vite
- Backend: NestJS + Prisma
- Mobile: Flutter
- Database: PostgreSQL
- Queue: BullMQ + Redis

## Rules
- Never use any
- Keep strict TypeScript
- Prefer reusable hooks/services
- Avoid duplicated logic
- Keep current UI unless requested
- Preserve multi-tenant architecture
- Use production-ready patterns
- Avoid huge refactors
- Explain plan before coding
- Modify only related files

## Frontend
- Prefer TanStack Query
- Prefer modular hooks
- Avoid large inline styles
- Keep responsive layouts

## Backend
- Use DTO validation
- Use Prisma transactions when needed
- Keep services thin
- Prefer queues for async work

## Testing
- Use Jest
- AAA pattern
- Mock external services
- Cover edge cases

## Security
- Validate all inputs
- Never expose internal errors
- Use rate limiting in auth
- Sanitize user content