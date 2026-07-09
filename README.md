# IshiFi — premium finance SaaS app

A full-stack personal finance product: React SPA (Vite + React Router +
Framer Motion, custom design system, 6 switchable themes) over a FastAPI +
SQLite backend with JWT auth (access + rotating refresh cookie).

## Run it

```
# terminal 1 — API on :8000
cd api
pip install -r requirements.txt
python seed.py                      # optional demo data
python -m uvicorn app.main:app --port 8000

# terminal 2 — app on :5173
cd client
npm install
npm run dev
```

Open http://localhost:5173 — sign up, or use the demo account
**demo@aurum.app / demo1234** (after running `seed.py`).

Screens: Dashboard, Transactions, Budgets, Analytics, Savings Goals,
Categories, Subscriptions, Profile, Settings. Auth: login / signup /
forgot / reset / email-verify (mock mailer prints links to the API console
and surfaces them in the UI in dev). Themes persist per device; currency
and data export/import live in Settings.

---

# Expense // Terminal

A personal monthly expense tracker you control entirely from Telegram.
Text the bot in plain English, everything is stored in one local SQLite file,
and an offline HTML dashboard shows where the money goes. No paid apps, no
cloud, no web server — nothing leaves your machine.

## Setup — 5 steps

1. **Get a bot token.** In Telegram, message [@BotFather](https://t.me/BotFather),
   send `/newbot`, pick a name, and copy the token it gives you.

2. **Configure.** Open `config.json` and paste the token into
   `"telegram_token"`. Adjust `monthlyBudget` and the per-category `budgets`
   caps to taste (currency too, if you don't want ₹).

3. **Install the one dependency.**
   ```
   pip install python-telegram-bot
   ```

4. **Run the bot.**
   ```
   python bot.py
   ```
   Leave it running (a terminal window, or a startup task). It answers only
   your Telegram messages and writes only to local files.

5. **Open the dashboard.** Double-click `dashboard.html`. It reads `data.js`
   (regenerated after every message you send the bot), so it is always
   current — just refresh the browser tab. Works from `file://`, no server.

## Talking to the bot

Just describe the spend — the bot pulls out the amount, guesses the category,
and keeps the rest as a note:

| You send | Logged as |
|---|---|
| `spent 500 on ola` | ₹500 · travel |
| `swiggy 420 dinner` | ₹420 · food |
| `1.5k myntra shirt` | ₹1,500 · clothes |
| `rs 250 chai` | ₹250 · food |
| `₹1,250 electricity bill` | ₹1,250 · bills |
| `2l fd at hdfc` | ₹2,00,000 · investments |
| `got salary 75000` | ₹75,000 · income |
| `cashback 120 from paytm` | ₹120 · income |

Amounts understand `500`, `1,250`, `1.5k` (=1500), `2l` (=2 lakh), `rs 500`,
`₹500`, `500rs`.

### Commands

| Command | Does |
|---|---|
| `/total` | month spend vs budget, with a progress bar |
| `/undo` | delete your last entry |
| `/budget` | per-category caps and how full each is |
| `/help` | examples and syntax |

## Files

| File | Role |
|---|---|
| `bot.py` | Telegram bot — parse → store → re-export → confirm |
| `parser.py` | plain English → `{amount, category, note, type}` |
| `db.py` | SQLite storage (`expenses.db`, created automatically) |
| `export.py` | writes `data.js` for the dashboard (never the bot token) |
| `config.json` | token, currency, monthly budget, category caps |
| `dashboard.html` | self-contained offline dashboard (inline SVG, no CDN) |

## Customising

- **Categories / keywords** — edit `CATEGORY_KEYWORDS` at the top of
  `parser.py`. Add brands you use ("rapido", your grocery store, …).
- **Income words** — `INCOME_KEYWORDS` in the same file.
- **Budgets & currency** — `config.json`. The dashboard picks both up on the
  next export.
- **Backup** — copy `expenses.db`. That single file is all your data.

## Notes

- The dashboard shows sample data until the first real export, so you can
  preview it immediately.
- `data.js` never contains your bot token.
- Run `python export.py` by hand any time to force a dashboard refresh.
