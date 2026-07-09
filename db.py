"""
db.py — SQLite storage for the expense tracker.

One table "txns": id, date, category, amount, note, type, chat_id, created_at.
All data lives in expenses.db next to this file.
"""

import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "expenses.db")


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS txns (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            date       TEXT NOT NULL,              -- YYYY-MM-DD
            category   TEXT NOT NULL,
            amount     REAL NOT NULL,
            note       TEXT DEFAULT '',
            type       TEXT NOT NULL DEFAULT 'expense',  -- expense | income
            chat_id    INTEGER,
            created_at TEXT NOT NULL
        )
        """
    )
    return conn


def add(amount, category, note="", type="expense", chat_id=None, date=None):
    """Insert a transaction. Returns the new row id."""
    now = datetime.now()
    date = date or now.strftime("%Y-%m-%d")
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO txns (date, category, amount, note, type, chat_id, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (date, category, amount, note, type, chat_id,
             now.strftime("%Y-%m-%d %H:%M:%S")),
        )
        return cur.lastrowid


def undo_last(chat_id):
    """Delete the most recent entry for this chat. Returns the deleted row
    as a dict, or None if there was nothing to delete."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM txns WHERE chat_id IS ? ORDER BY id DESC LIMIT 1",
            (chat_id,),
        ).fetchone()
        if row is None:
            return None
        conn.execute("DELETE FROM txns WHERE id = ?", (row["id"],))
        return dict(row)


def all_rows():
    """All transactions, oldest first, as a list of dicts."""
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM txns ORDER BY date, id").fetchall()
        return [dict(r) for r in rows]


def month_total(month=None):
    """Total expenses (not income) for a month given as 'YYYY-MM'.
    Defaults to the current month."""
    month = month or datetime.now().strftime("%Y-%m")
    with _connect() as conn:
        row = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM txns"
            " WHERE type = 'expense' AND date LIKE ?",
            (month + "-%",),
        ).fetchone()
        return row["total"]


if __name__ == "__main__":
    print(f"DB at {DB_PATH}")
    print(f"{len(all_rows())} rows, this month total: {month_total()}")
