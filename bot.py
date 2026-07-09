"""
bot.py — Telegram front-end for the expense tracker.

Text the bot in plain English ("spent 500 on ola", "got salary 75000").
Every message is parsed, stored in SQLite, and data.js is regenerated so
dashboard.html is always current.

Requires: pip install python-telegram-bot
Run:      python bot.py
"""

from datetime import datetime

from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application, CommandHandler, ContextTypes, MessageHandler, filters,
)

import db
import export
import parser as msg_parser

CONFIG = export.load_config()
CURRENCY = CONFIG.get("currency", "₹")
MONTHLY_BUDGET = CONFIG.get("monthlyBudget", 0)
BUDGETS = CONFIG.get("budgets", {})


# --------------------------------------------------------------------------
# formatting helpers
# --------------------------------------------------------------------------

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


def month_status_line():
    total = db.month_total()
    if MONTHLY_BUDGET > 0:
        pct = total / MONTHLY_BUDGET * 100
        return (
            f"{progress_bar(total, MONTHLY_BUDGET)} {pct:.0f}%\n"
            f"This month: {fmt_money(total)} of {fmt_money(MONTHLY_BUDGET)}"
        )
    return f"This month: {fmt_money(total)}"


# --------------------------------------------------------------------------
# handlers
# --------------------------------------------------------------------------

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
    "  /undo — delete the last entry\n"
    "  /budget — per-category caps\n"
    "  /help — this message\n\n"
    "Open dashboard.html any time for the full picture."
)


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Expense tracker online. Everything stays on your machine.\n\n" + HELP_TEXT
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(HELP_TEXT)


async def cmd_total(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(month_status_line())


async def cmd_undo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    deleted = db.undo_last(update.effective_chat.id)
    if deleted is None:
        await update.message.reply_text("Nothing to undo.")
        return
    export.export()
    await update.message.reply_text(
        f"Deleted: {fmt_money(deleted['amount'])} "
        f"[{deleted['category']}] {deleted['note']}".strip()
    )


async def cmd_budget(update: Update, context: ContextTypes.DEFAULT_TYPE):
    month = datetime.now().strftime("%Y-%m")
    spent_by_cat = {}
    for row in db.all_rows():
        if row["type"] == "expense" and row["date"].startswith(month):
            spent_by_cat[row["category"]] = (
                spent_by_cat.get(row["category"], 0) + row["amount"]
            )
    lines = ["Category caps this month:"]
    for cat, cap in BUDGETS.items():
        spent = spent_by_cat.get(cat, 0)
        flag = " ⚠️" if cap and spent > cap else ""
        lines.append(f"  {cat}: {fmt_money(spent)} / {fmt_money(cap)}{flag}")
    lines.append("")
    lines.append(month_status_line())
    await update.message.reply_text("\n".join(lines))


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    parsed = msg_parser.parse(text)
    if parsed is None:
        await update.message.reply_text(
            "Couldn't find an amount in that. Try something like "
            "\"spent 500 on ola\" or /help."
        )
        return

    db.add(
        amount=parsed["amount"],
        category=parsed["category"],
        note=parsed["note"],
        type=parsed["type"],
        chat_id=update.effective_chat.id,
    )
    export.export()

    if parsed["type"] == "income":
        head = f"Income logged: {fmt_money(parsed['amount'])}"
    else:
        head = f"Logged: {fmt_money(parsed['amount'])} → {parsed['category']}"
    if parsed["note"]:
        head += f" ({parsed['note']})"

    await update.message.reply_text(head + "\n\n" + month_status_line())


def main():
    token = CONFIG.get("telegram_token", "")
    if not token or "PASTE" in token:
        raise SystemExit(
            "Set your bot token in config.json first (get one from @BotFather)."
        )

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("total", cmd_total))
    app.add_handler(CommandHandler("undo", cmd_undo))
    app.add_handler(CommandHandler("budget", cmd_budget))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))

    export.export()  # make sure the dashboard is current on startup
    print("Bot running. Press Ctrl+C to stop.")
    app.run_polling()


if __name__ == "__main__":
    main()
