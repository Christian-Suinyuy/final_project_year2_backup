# Relay — WhatsApp Commerce AI

Relay helps a shop turn its catalogue and business details into useful answers in customer WhatsApp conversations. The repository is a Next.js App Router application with TypeScript, Tailwind, Prisma/PostgreSQL, NextAuth credentials authentication, Gemini through LangChain, and an isolated messaging adapter.

## Local setup

1. Install Node.js 20 or newer and Docker Desktop.
2. Copy `.env.example` to `.env` and set a strong `NEXTAUTH_SECRET`. Add a Google AI Studio key to enable Gemini replies; without it, the assistant uses a small, clearly bounded rule-based fallback.
3. Start PostgreSQL with `docker compose up -d db`.
4. Install packages with `npm install`.
5. Create the database schema: `npm run db:generate` then `npm run db:migrate`.
6. Optionally run `npm run db:seed` for a ready-made Kora Living demo (`owner@koraliving.com` / `Password123`). This is local presentation data; change the password before exposing the instance to anyone else.
7. Start the web app with `npm run dev`, open `http://localhost:3000`, and sign in with the demo account or create your own shop.
8. Import `examples/catalogue.csv` if you want to rehearse the CSV flow, adjust shop settings, then connect WhatsApp in the dashboard.

The seed script creates or reuses a demo owner/shop and adds phone and footwear products, opening hours, and a Nkwen delivery zone: `npm run db:seed`.

## WhatsApp runtime

The `IMessagingAdapter` interface is the boundary for messaging transports. `WhatsAppWebAdapter` implements it with `whatsapp-web.js`; commerce, conversations and the dashboard use only the adapter boundary. The LocalAuth directory is configurable with `WHATSAPP_SESSION_PATH` and persists credentials on a persistent server disk.

The web and WhatsApp worker need to run in a persistent Node.js process with Chromium/Puppeteer available. Do not deploy this browser-based adapter to a short-lived serverless function. The current pairing is WhatsApp Web automation, not the official WhatsApp Business Platform; WhatsApp may expire or restrict sessions. A future official API adapter can implement the same interface.

## Data and tenant security

Authenticated API routes derive the business ID from the signed-in user record. Product reads, imports, conversations, replies, settings and WhatsApp sessions are scoped to that business. Product price, SKU and stock are structured PostgreSQL fields; customer messages and conversation context are persisted. The assistant supplies structured shop and catalogue context to Gemini and instructs it to avoid inventing authoritative facts. No vector extension is required in this MVP; semantic product embeddings and knowledge-document retrieval remain a follow-on.

## Useful commands

- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — lint source files
- `npm run db:generate` — generate Prisma client
- `npm run db:migrate` — apply checked-in PostgreSQL migrations
- `npm run db:push` — sync the Prisma schema to the configured development database
- `npm run db:seed` — seed the Kora Living presentation shop and catalogue

## Environment

See `.env.example`. Never commit real credentials or the WhatsApp `sessions/` directory. Configure persistent encrypted storage and restrict filesystem permissions in production. Use HTTPS for the application and database backups for shop data.
