"""Receipt OCR — extract amount and date from receipt images."""

import re
from io import BytesIO

try:
    import pytesseract
    from PIL import Image
except ImportError:
    pytesseract = None
    Image = None


def extract_amount(text: str) -> float | None:
    """Extract amount from receipt text using regex."""
    # Look for currency followed by numbers
    patterns = [
        r'(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{2})?)',  # ₹1,000 or rs 500
        r'([0-9,]+(?:\.[0-9]{2})?)\s*(?:₹|rs\.?|inr)',  # 500 rs
        r'total[:\s]+₹?([0-9,]+(?:\.[0-9]{2})?)',  # total: 500
        r'(?:amount|price)[:\s]+₹?([0-9,]+(?:\.[0-9]{2})?)',  # amount: 500
    ]

    text_lower = text.lower()
    for pattern in patterns:
        matches = re.finditer(pattern, text_lower, re.IGNORECASE)
        for match in matches:
            amount_str = match.group(1).replace(",", "")
            try:
                return float(amount_str)
            except ValueError:
                continue

    # Fallback: find the largest number in the text
    numbers = re.findall(r'[0-9,]+(?:\.[0-9]{2})?', text)
    if numbers:
        try:
            return float(numbers[-1].replace(",", ""))
        except ValueError:
            pass

    return None


def extract_date(text: str) -> str | None:
    """Extract date from receipt text."""
    date_patterns = [
        r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',  # 12/31/2024 or 31-12-2024
        r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',  # 2024-12-31
    ]

    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)

    return None


def process_receipt(image_bytes: bytes) -> dict:
    """Process receipt image and extract details."""
    if not Image or not pytesseract:
        return {
            "error": "OCR not available (pytesseract/Tesseract not installed)",
            "amount": None,
            "date": None,
            "text": None,
        }

    try:
        # Open image
        image = Image.open(BytesIO(image_bytes))

        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Extract text using OCR
        text = pytesseract.image_to_string(image)

        # Parse text
        amount = extract_amount(text)
        date = extract_date(text)

        return {
            "success": True,
            "amount": amount,
            "date": date,
            "text": text[:500],  # First 500 chars
            "confidence": "medium",  # Would need tesseract confidence API for high accuracy
        }
    except Exception as e:
        return {
            "error": str(e),
            "amount": None,
            "date": None,
            "text": None,
        }
