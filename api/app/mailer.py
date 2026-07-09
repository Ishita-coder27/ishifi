"""Mock mailer — logs to the API console. In dev the link is also returned to
the client so the flow is fully testable without SMTP. Swap for a real sender
(resend / SES / nodemailer-equivalent) in production."""

import sys
from . import config

sys.stdout.reconfigure(encoding="utf-8")


def send_mail(to: str, subject: str, link: str) -> str | None:
    print("\n━━━ MOCK EMAIL ━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"  to:      {to}")
    print(f"  subject: {subject}")
    print(f"  link:    {link}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    return link if config.IS_DEV else None
