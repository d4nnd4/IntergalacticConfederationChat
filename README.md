# I.C. Comms

I created the frontend of this application using LLMS, the backend was mine.

This implements a chat relay for the delegates of the Intergalactic Confederation, built on Java, RabbitMQ and React.

- **Transmissions**: real-time channels where each user speaks as one of the Assembly's delegates, and the delegates nobody is playing answer back in character.
- **The Archive**: a chatbot that answers questions from [Ikwipedia](https://en.ikwipedia.org/) using a small local model.
- **Ringfall**: an original side-scrolling arcade shooter.

## Run it

```bash
cp .env.example .env
docker compose up -d --build
```

Open <http://localhost:8080>. The RabbitMQ management UI is at <http://localhost:15672> (bound to localhost only).

## Architecture

```
browser ──STOMP/WebSocket──▶ nginx ──▶ Spring Boot ──STOMP relay──▶ RabbitMQ
                                            │  ▲                        │
                                            │  └──── AMQP (consumers) ◀─┘
                                            └────── HTTPS ──▶ Ikwipedia API
```

| Concern | How it flows |
| --- | --- |
| Chat send | Client `SEND /app/chat.send` → `ChatService` validates, sanitises and rate-limits → AMQP publish to topic exchange `ic.chat` with key `channel.<id>` |
| Chat receive | Client subscribes to `/exchange/ic.chat/channel.<id>`; Spring relays the subscription to RabbitMQ's STOMP plugin, so fan-out happens in the broker |
| History | Each backend instance binds an exclusive queue to `channel.*` and keeps a bounded ring buffer per channel, served at `GET /api/channels/{id}/messages` |
| Chatbot | Client `SEND /app/bot.ask` → durable queue `ic.bot.requests` (TTL 30 s, capped length) → `BotWorker` pool → reply published to `ic.chat` with key `bot.<session>` |
| Delegate replies | Durable queue `ic.delegates.inbox` bound to `channel.*` (one consumer per message across all instances) → `DelegateResponder` picks a speaker, publishes `typing.<channel>`, then the reply to `channel.<channel>` |

Because fan-out lives in RabbitMQ, the backend can be scaled horizontally (`docker compose up --scale backend=3` behind a load balancer) without sticky sessions.

### The Archivist (local model)

No external AI service is involved. The bot runs entirely inside the backend:

1. **Intent classification**: a multinomial Naive Bayes model trained at startup on `bot/intents.tsv` (greeting, help, delegate lookup, random article, arcade, search…).
2. **Query extraction**: strips conversational phrasing ("can you tell me about…") to get the subject.
3. **Retrieval**: MediaWiki API search plus plain-text extracts, cached with Caffeine (30 min TTL).
4. **Extractive summarisation**: ranks sentences by query overlap, term salience and position, then returns the best few in their original order.

Add training phrases to `intents.tsv` to teach it new ways of asking.

### Delegates

Profiles live in `backend/src/main/resources/profiles.json`. Earth is represented by **Flavia Dos Santos**. Pixel-art portraits are defined as palette strings in `frontend/src/pixel/portraits.ts` and rasterised once to cached data URLs.

### Interactive delegates

Whichever delegate you board as, the rest of the Assembly talks back. The relay only voices delegates that no person has spoken as in that channel in the last 10 minutes; those are marked *relay* in the roster, and people are marked *live*.

- **Who answers**: anyone you call by name or race ("Odun, …", "what do the Ahel think?"), up to two at once. Otherwise one delegate is picked, favouring those who frequent the channel (`haunts` in `profiles.json`) and rotating away from whoever spoke last. When other people have spoken in the last two minutes, the relay only steps in for questions or direct mentions.
- **What they say**: the same intent classifier and Ikwipedia lookup the Archivist uses, delivered in each delegate's own voice (`voice` in `profiles.json`) with a link to the article. Greetings, thanks, farewells and small talk come from the voice lines, and a delegate asked only by name introduces themselves.
- **Feel**: a *composing…* indicator appears while the reply is prepared, with a typing delay scaled to its length.

Relay replies are flagged `automated`, so they never trigger further replies.

## Performance notes

- Java 21 virtual threads for request handling; Spring Boot layered jar for small image rebuilds.
- Broker-side fan-out via the STOMP relay; inbound destinations are whitelisted so clients cannot publish to the broker directly.
- Per-session token-bucket rate limiting; bounded history and bot queues.
- Frontend: code-split arcade chunk, memoised message rows, `content-visibility` on long lists, one shared STOMP subscription per destination, HUD updated via direct DOM writes instead of React renders.
- Game: fixed-timestep loop, preallocated object pools, sprites pre-baked to offscreen canvases, auto-pause when the tab is hidden.
- nginx serves hashed assets with immutable caching and gzip.

## Development

Backend (needs RabbitMQ with the STOMP plugin on `localhost`):

```bash
cd backend && mvn spring-boot:run
```

Frontend (proxies `/api` and `/ws` to `localhost:8080`):

```bash
cd frontend && npm install && npm run dev
```

Tests:

```bash
cd backend && mvn test
```

## Ringfall controls

| Key | Action |
| --- | --- |
| Arrows / WASD | Fly |
| Space / J | Fire (watch the heat gauge) |
| X / K | Ring pulse: clears bullets and damages everything nearby |
| P / Esc | Pause |
| Touch | Drag to fly; auto-fire while touching |
