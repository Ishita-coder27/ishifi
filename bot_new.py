"""
bot.py — Telegram interface for IshiFi.

Text the bot in plain English ("spent 500 on ola", "got salary 75000").
Messages are parsed and sent to the FastAPI backend for storage.

Requires: pip install python-telegram-bot requests
Run:      python bot_new.py
"""

import json
import os
import sys
from datetime import datetime

import requests
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application, CommandHandler, ContextTypes, MessageHandler, filters,
)

import parser as msg_parser

sys.stdout.reconfigure(encoding="utf-8")

# Load config (get API URL and bot token)
with open("config.json") as f:
    CONFIG = json.load(f)

API_BASE = CONFIG.get("api_url", "http://localhost:8000")
TELEGRAM_TOKEN = CONFIG.get("telegram_token", "")
CURRENCY = CONFIG.get("currency", "₹")
MONTHLY_BUDGET = CONFIG.get("monthlyBudget", 0)

# Mapping of Telegram chat_id to API auth token (in production, store in a database)
user_sessions = {}


def fmt_money(amount):
    """Indian-style grouping: 1234567 -> ₹12,34,567."""
    amount = round(amount)
    s = str(abs(amount))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ",".join(parts) + "," + tail
    sign = "-" if amount < 0 else ""
    return f"{sign}{CURRENCY}{s}"


def progress_bar(spent, budget, width=12):
    if budget <= 0:
        return "─" * width
    frac = min(spent / budget, 1.0)
    filled = round(frac * width)
    bar = "█" * filled + "░" * (width - filled)
    return bar


async def ensure_user(chat_id: int, user_name: str, user_email: str = None):
    """Create or get a user via the API (simplified for Telegram)."""
    # In production, you'd have a proper user/auth system linked to Telegram
    # For now, we store sessions in memory
    if chat_id not in user_sessions:
        # Register a new user with a generated email
        email = user_email or f"tg_{chat_id}@aurum.local"
        password = "temp_pass"  # In production, use a real auth flow
        try:
            resp = requests.post(
                f"{API_BASE}/api/auth/signup",
                json={"name": user_name, "email": email, "password": password},
            )
            if resp.status_code == 200:
                user_sessions[chat_id] = resp.json().get("access_token")
        except Exception as e:
            print(f"[bot] Failed to create user: {e}")
    return user_sessions.get(chat_id)


def get_api_headers(chat_id: int):
    """Get Authorization header for API calls."""
    token = user_sessions.get(chat_id, "")
    return {"Authorization": f"Bearer {token}"} if token else {}


HELP_TEXT = (
    "Just text me what you spent, in plain English:\n"
    "  • spent 500 on ola\n"
    "  • swiggy 420 dinner\n"
    "  • 1.5k myntra shirt\n"
    "  • rs 250 chai\n"
    "  • got salary 75000\n\n"
    "Amounts understand 500, 1,250, 1.5k (=1500), 2l (=2 lakh), ₹500, 500rs.\n\n"
    "Commands:\n"
    "  /total — month spend vs budget\n"
    "  /help — this message\n\n"
    "Open http://localhost:5173 for the full dashboard."
)


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user_name = update.effective_user.first_name or "User"
    await ensure_user(chat_id, user_name)
    await update.message.reply_text(
        "🌸 IshiFi Telegram bot online.\n"
        "Everything syncs with your account.\n\n" + HELP_TEXT
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(HELP_TEXT)


async def cmd_total(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    headers = get_api_headers(chat_id)

    if not headers.get("Authorization"):
        await update.message.reply_text("Not logged in. Send /start first.")
        return

    try:
        resp = requests.get(f"{API_BASE}/api/users/me/stats", headers=headers)
        if resp.status_code == 200:
            stats = resp.json()
            msg = f"💰 Total income: {fmt_money(stats.get('totalIncome', 0))}\n"
            msg += f"💸 Total spending: {fmt_money(stats.get('totalSpent', 0))}\n"
            msg += f"💡 Transactions: {stats.get('txCount', 0)}"
            await update.message.reply_text(msg)
        else:
            await update.message.reply_text("Couldn't fetch stats.")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    text = update.message.text
    user_name = update.effective_user.first_name or "User"

    # Ensure user is registered
    token = await ensure_user(chat_id, user_name)
    if not token:
        await update.message.reply_text(
            "Authentication failed. Try /start again."
        )
        return

    headers = get_api_headers(chat_id)

    # Parse the message
    parsed = msg_parser.parse(text)
    if parsed is None:
        await update.message.reply_text(
            "Couldn't find an amount in that. Try something like "
            '"spent 500 on ola" or /help.'
        )
        return

    # Send to API
    try:
        payload = {
            "type": parsed["type"],
            "amount": parsed["amount"],
            "category": parsed["category"],
            "note": parsed["note"],
            "date": datetime.now().isoformat(),
        }
        resp = requests.post(
            f"{API_BASE}/api/transactions",
            json=payload,
            headers=headers,
        )
        if resp.status_code == 201:
            if parsed["type"] == "income":
                msg = f"✅ Income logged: {fmt_money(parsed['amount'])}"
            else:
                msg = f"✅ Logged: {fmt_money(parsed['amount'])} → {parsed['category']}"
            if parsed["note"]:
                msg += f" ({parsed['note']})"
            msg += "\n\n📊 View details at http://localhost:5173"
            await update.message.reply_text(msg)
        else:
            await update.message.reply_text(
                f"Failed to save. Status {resp.status_code}."
            )
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


def main():
    if not TELEGRAM_TOKEN or "PASTE" in TELEGRAM_TOKEN:
        raise SystemExit(
            "Set your bot token in config.json first (get one from @BotFather)."
        )

    app = Application.builder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("total", cmd_total))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))

    print("[bot] 🌸 IshiFi Telegram bot starting...")
    print(f"[bot] API: {API_BASE}")
    app.run_polling()


if __name__ == "__main__":
    main()
