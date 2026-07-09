"""CLI entry point for local dev: python seed.py

See app/seed_demo.py for the actual seeding logic — it's also called
automatically on API startup so the deployed demo never runs dry.
"""

from app.seed_demo import run_seed

if __name__ == "__main__":
    run_seed()
