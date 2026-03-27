# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

- Use comments only for complex or non-obvious code logic.

## Commands

```bash
# First-time setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (http://localhost:3000)
npm run dev

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Build for production
npm run build

# Reset database
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Run new migrations
npx prisma migrate dev
```

> **Windows note:** The `dev`/`build`/`start` scripts use `cross-env "NODE_OPTIONS=--require ./node-compat.cjs"` to work cross-platform. Do not revert to bare Unix-style `VAR='value'` syntax.

## Architecture

### Overview

UIGen is an AI-powered React component generator. Users describe a component in a chat interface; the AI writes files into a **virtual (in-memory) file system**; the browser compiles and previews those files live in an `<iframe>` — no files are ever written to disk on the server.

### Core data flow

```
User prompt
  → POST /api/chat (route.ts)
    → Vercel AI SDK streamText with Claude (claude-haiku-4-5)
      → AI calls tools: str_replace_editor / file_manager
        → VirtualFileSystem mutated server-side
  → AI stream response consumed by ChatContext (useChat hook)
    → tool call results forwarded to FileSystemContext.handleToolCall()
      → FileSystemContext triggers refreshTrigger
        → PreviewFrame re-runs createImportMap() + createPreviewHTML()
          → iframe srcdoc updated with new compiled HTML
```

### Key modules

**`src/lib/file-system.ts`** — `VirtualFileSystem` class: an in-memory tree of `FileNode` objects with a flat `Map<path, FileNode>` for O(1) lookups. It is instantiated both on the server (inside the API route, to execute tool calls) and on the client (via `FileSystemContext`, to drive the editor and preview). Serialize/deserialize round-trips through `Record<string, FileNode>` (JSON-safe, Maps are stripped).

**`src/lib/transform/jsx-transformer.ts`** — Client-side only. Transforms JSX/TSX to plain JS using `@babel/standalone`, builds an ES module import map (blob URLs for local files, `esm.sh` for third-party packages), and generates a full preview HTML document. Missing local imports get placeholder stub modules so the preview doesn't crash.

**`src/components/preview/PreviewFrame.tsx`** — Renders an `<iframe>` with `srcdoc` set to the output of `createPreviewHTML()`. Watches `refreshTrigger` from `FileSystemContext` to re-render on every file change. Entry point resolution order: `/App.jsx` → `/App.tsx` → `/index.jsx` → `/index.tsx` → `/src/App.jsx` → first `.jsx`/`.tsx` found.

**`src/lib/contexts/file-system-context.tsx`** — React context that owns the client-side `VirtualFileSystem` instance. `handleToolCall()` interprets `str_replace_editor` and `file_manager` tool calls arriving from the AI stream and applies them to the VFS.

**`src/lib/contexts/chat-context.tsx`** — Wraps Vercel AI SDK's `useChat`. Sends the current serialized VFS with every request (`files` field). On tool call parts, calls `handleToolCall` from `FileSystemContext`.

**`src/lib/provider.ts`** — `getLanguageModel()` returns the real Anthropic model (`claude-haiku-4-5`) if `ANTHROPIC_API_KEY` is set, otherwise a `MockLanguageModel` that streams static pre-written components. The mock uses fewer `maxSteps` (4 vs 40).

**`src/lib/tools/`** — AI tool definitions:
- `str-replace.ts`: `str_replace_editor` tool (view / create / str_replace / insert)
- `file-manager.ts`: `file_manager` tool (rename / delete)

**`src/lib/auth.ts`** — JWT-based session auth (HS256, 7-day cookies). Uses `jose`. Server-only (`import "server-only"`). `JWT_SECRET` defaults to `"development-secret-key"` if env var is absent.

**`src/lib/prisma.ts`** — Singleton Prisma client. Generated client output is `src/generated/prisma` (not the default location).

**`node-compat.cjs`** — Required via `NODE_OPTIONS` before Next.js starts. Deletes `globalThis.localStorage` and `globalThis.sessionStorage` on the server to fix Node 25+ Web Storage SSR breakage.

### Auth & persistence

- Anonymous users can generate components but projects are not saved.
- Registered users: chat messages and VFS state are persisted to the `Project` model after each AI response completes (`onFinish` in `route.ts`). `messages` and `data` columns are JSON strings.
- Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem` routes; `/api/chat` is **not** protected (anonymous use is intentional).

### Database

SQLite via Prisma (`prisma/dev.db`). The full database schema is defined in [`prisma/schema.prisma`](prisma/schema.prisma) — always reference it to understand data structure. Two models: `User` (email/password) and `Project` (stores serialized messages + VFS data as JSON strings). Prisma client is generated to `src/generated/prisma`.

### Testing

Vitest with jsdom environment and `@testing-library/react`. Tests live in `__tests__/` subdirectories next to the code they test. Run a specific file with `npx vitest run <path>`.
