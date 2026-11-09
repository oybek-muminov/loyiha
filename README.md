# UniverAcademy

Umumiy fanlardan **milliy sertifikat** va **DTM** imtihonlariga tayyorgarlik
platformasi. Video darslar, chiziqli o'quv yo'li (roadmap) va imtihon muhitini
takrorlovchi testlar. Bitta baza, uchta kirish: **Telegram bot + Mini App**,
keyinchalik **web** va **Android**.

Pilot: **Fizika** — 5 bo'lim, ~22 dars, ~300 savol.

## Tuzilma

```
apps/
  api/        NestJS + Prisma (REST API, auth, bot webhook)
  web/        Next.js (Mini App /tg, admin /admin, landing /)
packages/
  contract/   zod sxemalar + API tiplar
  scoring/    javob tekshirish (single/multi/numeric/open)
  roadmap/    yo'l unlock logikasi
tools/
  content-cli kontent validatsiyasi
infra/        Docker Compose, Caddy, backup
content/      kontent (md, docx, images) — video R2'da
```

## Talablar

- Node.js >= 22
- pnpm >= 10
- PostgreSQL 16 (Docker tavsiya etiladi)
- ffmpeg (faqat video ingest uchun)

## Boshlash

```bash
# 1. O'rnatish
pnpm install

# 2. Muhit
cp .env.example .env                 # infra (docker compose) uchun
cp apps/api/.env.example apps/api/.env
# apps/web uchun: cp apps/web/.env.example apps/web/.env.local

# 3. Baza (Docker bo'lsa)
docker compose -f infra/docker-compose.dev.yml up -d
# Docker bo'lmasa — lokal PostgreSQL 16+ (univer/univer, univeracademy)

# 4. Prisma
pnpm db:generate
pnpm db:migrate
pnpm db:seed            # demo Fizika: 5 dars, 3 test, 11 savol

# 5. API
pnpm --filter @univer/api dev

# 6. Web (boshqa terminalda)
pnpm --filter @univer/web dev
```

- Web: http://localhost:3000
- Mini App: http://localhost:3000/tg
- Yo'l xaritasi: http://localhost:3000/tg/path/fizika
- API: http://localhost:4000/v1
- Health: http://localhost:4000/health

## Asosiy API endpointlari

| Metod | Yo'l | Vazifa |
|---|---|---|
| POST | `/v1/auth/telegram` | Telegram `initData` orqali kirish |
| POST | `/v1/auth/refresh` | Access tokenni yangilash |
| GET | `/v1/me` | Profil, XP, daraja, streak |
| GET | `/v1/subjects` | Fanlar va progress |
| GET | `/v1/subjects/:slug/path` | Yo'l xaritasi (unlock holatlari) |
| GET | `/v1/lessons/:id` | Dars matni va progress |
| GET | `/v1/lessons/:id/playback` | Video manzillari (HLS + mp4) |
| PUT | `/v1/lessons/:id/progress` | Ko'rish pozitsiyasini saqlash |
| POST | `/v1/lessons/:id/complete` | Darsni tugatish (+XP, streak) |
| GET | `/v1/catalog` | Erkin kutubxona |
| GET | `/v1/quizzes/:id` | Test savollari (javoblarsiz) |
| POST | `/v1/attempts` | Urinish boshlash |
| PATCH | `/v1/attempts/:id/responses/:itemId` | Javob saqlash |
| POST | `/v1/attempts/:id/submit` | Baholash va natija |
| GET | `/v1/attempts` | Urinishlar tarixi |

## Mini App ekranlari

- `/tg` — bosh ekran: XP, daraja, streak, fanlar
- `/tg/path/[subject]` — chiziqli yo'l, unlock holatlari
- `/tg/lesson/[id]` — konspekt (Markdown + KaTeX), video, tugatish
- `/tg/quiz/[id]` — 4 turdagi savollar, natija va tahlil

## Buyruqlar

| Buyruq | Vazifa |
|---|---|
| `pnpm build` | hammasini build qilish |
| `pnpm typecheck` | tip tekshiruvi |
| `pnpm test` | testlar |
| `pnpm db:generate` | Prisma client |
| `pnpm db:migrate` | migratsiya |
| `pnpm db:seed` | demo Fizika kontenti |
| `pnpm content:validate ./content/fizika` | kontent tekshiruvi |

## Telegram bot

Bot grammY'da yozilgan va ikki rejimda ishlaydi:

| Rejim | Qachon | Env |
|---|---|---|
| Long polling | Lokal test | `TELEGRAM_BOT_POLLING=true` |
| Webhook | Production | `TELEGRAM_BOT_POLLING=false` |

Kerakli env (`apps/api/.env`):

```bash
TELEGRAM_BOT_TOKEN=123456789:AA...      # @BotFather
TELEGRAM_WEBHOOK_SECRET=random-32-chars # ixtiyoriy, webhook uchun
TELEGRAM_MINIAPP_URL=https://.../tg     # HTTPS bo'lishi shart
TELEGRAM_BOT_POLLING=true               # lokal test uchun
```

### Lokal test (polling)

Mini App HTTPS talab qiladi, lekin **bitta tunnel yetarli**: web `/api/v1`
so'rovlarini Next.js same-origin proxy orqali API'ga uzatadi
(`apps/web/next.config.ts`), shuning uchun telefon `localhost`ga murojaat qilmaydi.

```bash
# 1. API va web'ni ishga tushiring
pnpm --filter @univer/api dev
pnpm --filter @univer/web dev

# 2. Boshqa terminalda HTTPS tunnel (3000-port)
cloudflared tunnel --url http://localhost:3000
#   -> https://random-words.trycloudflare.com

# 3. apps/api/.env ichida tunnel manzilini yozing
#    TELEGRAM_MINIAPP_URL=https://random-words.trycloudflare.com/tg
#    TELEGRAM_BOT_POLLING=true

# 4. API'ni qayta ishga tushiring
pnpm --filter @univer/api dev
```

Botda `/start` yuboring — Mini App tugmasi paydo bo'ladi.

> Quick tunnel manzili har safar o'zgaradi. Doimiy manzil uchun Cloudflare'dagi
> named tunnel + o'z domeningizni (`univeracademy.uz`) ishlating yoki loyihani
> serverga deploy qiling.

### Webhook (production)

```bash
# apps/api/.env
TELEGRAM_BOT_POLLING=false
TELEGRAM_WEBHOOK_URL=https://api.univeracademy.uz/webhooks/telegram

# webhook o'rnatish
pnpm --filter @univer/api bot:set-webhook
pnpm --filter @univer/api bot:set-webhook -- --info
pnpm --filter @univer/api bot:set-webhook -- --delete
```

Webhook endpoint: `POST /webhooks/telegram` (global `/v1` prefiksidan tashqarida).
Telegram `X-Telegram-Bot-Api-Secret-Token` sarlavhasi `TELEGRAM_WEBHOOK_SECRET`
bilan solishtiriladi; mos kelmasa `401`.

### Bot buyruqlari

- `/start` — salomlashish + Mini App tugmalari
- `/menu` — asosiy menyu
- `/lesson <id>` — darsga to'g'ridan-to'g'ri o'tish
- `/help` — yordam

## Hujjatlar

To'liq reja va spetsifikatsiya: `C:\Users\Oybek\.opencode\plan`

- `00-README.md` — indeks
- `01-mahsulot-spetsifikatsiyasi.md`
- `02-arxitektura.md`
- `03-malumotlar-modeli.md`
- `04-api-kontrakti.md`
- `05-mini-app-ekranlari.md`
- `06-video-ingest-r2.md`
- `07-kontent-import.md`
- `08-infratuzilma.md`
- `09-yol-xaritasi.md`

## Texnik eslatmalar

- **Prisma 6.19** ishlatilmoqda. Prisma 7 ESM + driver adapter talab qiladi va
  NestJS (CommonJS) bilan qo'shimcha ish talab qiladi — alohida vazifa sifatida
  keyinroq ko'chiriladi.
- Video R2'da, repoda emas (`.gitignore`).
- `initData` imzosi serverda HMAC-SHA256 bilan tekshiriladi.
