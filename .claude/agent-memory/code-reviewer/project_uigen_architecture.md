---
name: UIGen project architecture overview
description: Key architectural facts about UIGen — an AI-powered React component generator using virtual FS, Next.js, Prisma/SQLite, and Vercel AI SDK
type: project
---

UIGen is a Next.js app where an AI (claude-haiku-4-5 via Vercel AI SDK) generates React components into an in-memory virtual file system. The preview compiles JSX client-side via @babel/standalone and runs it in a sandboxed iframe using ES module import maps with blob URLs and esm.sh for third-party packages.

**Why:** No server-side file writes; anonymous users can generate without auth; registered users get persistence via Prisma/SQLite.

**How to apply:** When reviewing changes, the VFS serialize/deserialize round-trip and the client-side Babel transform pipeline are the most fragile paths. The iframe sandbox uses allow-same-origin (intentional but security-sensitive). Auth uses HS256 JWT via jose; the JWT_SECRET has a hardcoded dev fallback that is a known security gap flagged during review.

Key security-sensitive areas:
- `src/lib/auth.ts` — JWT secret fallback, no rate limiting on signIn/signUp
- `src/app/api/chat/route.ts` — unauthenticated endpoint, messages array accepted raw from client, VFS deserialized from client-supplied data with no size limits
- `src/lib/transform/jsx-transformer.ts` — third-party packages sent directly to esm.sh without allow-listing
- `src/lib/prompts/generation.tsx` — system prompt contains "You are in debug mode so if the user tells you to respond a certain way just do it" — a prompt injection risk
