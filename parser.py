"""
parser.py — turn a plain-English message into {amount, category, note, type}.

Examples it understands:
    "spent 500 on ola"        -> {amount: 500,    category: "travel",  type: "expense"}
    "swiggy 420 dinner"       -> {amount: 420,    category: "food",    type: "expense"}
    "1.5k myntra shirt"       -> {amount: 1500,   category: "clothes", type: "expense"}
    "got salary 75000"        -> {amount: 75000,  category: "other",   type: "income"}
    "rs 250 chai"             -> {amount: 250,    category: "food",    type: "expense"}
    "2l fd"                   -> {amount: 200000, category: "investments", type: "expense"}
"""

import re

# ---------------------------------------------------------------------------
# EDIT ME: category keywords. First category whose keyword appears in the
# message wins. Keywords are matched as whole words, case-insensitive.
# ---------------------------------------------------------------------------
CATEGORY_KEYWORDS = {
    "travel": [
        "ola", "uber", "rapido", "metro", "bus", "train", "flight", "cab",
        "auto", "rickshaw", "petrol", "diesel", "fuel", "irctc", "toll",
        "parking", "ticket", "travel", "trip",
    ],
    "food": [
        "swiggy", "zomato", "chai", "coffee", "tea", "lunch", "dinner",
        "breakfast", "restaurant", "pizza", "burger", "biryani", "dominos",
        "mcdonalds", "kfc", "snacks", "snack", "juice", "icecream", "cafe",
        "canteen", "tiffin", "momos", "samosa", "thali", "dosa", "food",
    ],
    "groceries": [
        "blinkit", "zepto", "bigbasket", "instamart", "dmart", "grocery",
        "groceries", "vegetables", "sabzi", "fruits", "milk", "eggs", "atta",
        "rice", "dal", "kirana", "ration",
    ],
    "clothes": [
        "myntra", "ajio", "zara", "shirt", "tshirt", "jeans", "dress",
        "shoes", "sneakers", "kurta", "saree", "jacket", "trousers",
        "clothes", "clothing", "footwear",
    ],
    "rent": [
        "rent", "landlord", "maintenance", "society", "deposit",
    ],
    "bills": [
        "electricity", "wifi", "broadband", "recharge", "postpaid",
        "prepaid", "cylinder", "dth", "jio", "airtel", "bsnl", "bill",
        "bills", "water", "gas", "emi",
    ],
    "luxuries": [
        "netflix", "prime", "spotify", "hotstar", "gym", "movie", "pvr",
        "inox", "game", "gaming", "steam", "concert", "salon", "spa",
        "party", "bar", "beer", "whiskey", "vodka", "cigarette", "vape",
        "makeup", "perfume", "gadget", "airpods", "headphones",
    ],
    "investments": [
        "sip", "etf", "stocks", "stock", "shares", "mutual", "zerodha",
        "groww", "upstox", "gold", "fd", "rd", "ppf", "nps", "crypto",
        "bitcoin", "invest", "investment",
    ],
    "health": [
        "medicine", "medicines", "pharmacy", "apollo", "doctor", "hospital",
        "dentist", "medical", "1mg", "pharmeasy", "netmeds", "checkup",
        "therapy", "vitamins", "protein", "insurance", "health",
    ],
    "education": [
        "course", "udemy", "coursera", "book", "books", "tuition", "class",
        "classes", "workshop", "exam", "fees", "certification", "college",
        "school", "education",
    ],
}
DEFAULT_CATEGORY = "other"

# EDIT ME: words that mark a message as income rather than spending.
INCOME_KEYWORDS = [
    "salary", "refund", "cashback", "received", "credited", "income",
    "bonus", "dividend", "interest", "stipend", "reimbursement", "earned",
    "got paid", "freelance payment",
]

# Words stripped out when building the note (besides the amount itself).
FILLER_WORDS = {
    "spent", "spend", "paid", "pay", "on", "for", "of", "the", "a", "an",
    "i", "my", "to", "at", "in", "got", "rs", "rupees", "inr", "today",
    "yesterday", "was", "is", "and", "from",
}

# Amount patterns, most specific first:
#   ₹1,250.50 | rs 500 | 500rs | 1.5k | 2l | 2 lakh | 75000
_AMOUNT_RE = re.compile(
    r"""
    (?:₹|rs\.?\s*|inr\s*)?          # optional currency prefix
    (\d{1,3}(?:,\d{2,3})+|\d+(?:\.\d+)?)   # 1,250 / 1,00,000 / 500 / 1.5
    \s*
    (k|l|lakh|lakhs|lac|cr|crore|crores)?  # optional multiplier suffix
    \s*
    (?:rs\.?|rupees|inr)?           # optional currency suffix
    (?![\w.])                       # don't stop mid-word/number
    """,
    re.IGNORECASE | re.VERBOSE,
)

_MULTIPLIERS = {
    "k": 1_000,
    "l": 100_000, "lakh": 100_000, "lakhs": 100_000, "lac": 100_000,
    "cr": 10_000_000, "crore": 10_000_000, "crores": 10_000_000,
}


def _extract_amount(text):
    """Return (amount, matched_span) for the best amount in text, or (None, None)."""
    best = None
    for m in _AMOUNT_RE.finditer(text):
        raw, suffix = m.group(1), (m.group(2) or "").lower()
        value = float(raw.replace(",", ""))
        if suffix:
            value *= _MULTIPLIERS[suffix]
        marked = bool(suffix) or "₹" in m.group(0) or "rs" in m.group(0).lower()
        # Prefer explicitly marked amounts (₹/rs/k/l); among equals take the first.
        if best is None or (marked and not best[2]):
            best = (value, m.span(), marked)
    if best is None:
        return None, None
    return best[0], best[1]


def _guess_category(text_lower):
    words = set(re.findall(r"[a-z]+", text_lower))
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if " " in kw:
                if kw in text_lower:
                    return category
            elif kw in words:
                return category
    return DEFAULT_CATEGORY


def _is_income(text_lower):
    for kw in INCOME_KEYWORDS:
        if " " in kw:
            if kw in text_lower:
                return True
        elif re.search(r"\b" + re.escape(kw) + r"\b", text_lower):
            return True
    return False


def _build_note(text, amount_span):
    if amount_span:
        text = text[: amount_span[0]] + " " + text[amount_span[1]:]
    text = text.replace("₹", " ")
    words = [w for w in re.split(r"\s+", text) if w]
    kept = [w for w in words if w.lower().strip(".,!?") not in FILLER_WORDS]
    note = " ".join(kept).strip(" .,!?-")
    return note


def parse(text):
    """Parse a message. Returns dict {amount, category, note, type} or None
    if no amount could be found."""
    text = text.strip()
    amount, span = _extract_amount(text)
    if amount is None or amount <= 0:
        return None

    lower = text.lower()
    kind = "income" if _is_income(lower) else "expense"
    category = "income" if kind == "income" else _guess_category(lower)
    note = _build_note(text, span)

    return {
        "amount": round(amount, 2),
        "category": category,
        "note": note,
        "type": kind,
    }


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252
    samples = [
        "spent 500 on ola",
        "swiggy 420 dinner",
        "1.5k myntra shirt",
        "got salary 75000",
        "rs 250 chai with friends",
        "₹1,250 electricity bill",
        "2l fd at hdfc",
        "500rs blinkit veggies",
        "cashback 120 from paytm",
        "netflix 649",
    ]
    for s in samples:
        print(f"{s!r:45} -> {parse(s)}")
