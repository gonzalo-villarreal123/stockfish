"""
One-shot backfill: re-runs detect_category() over every product in the DB
and patches rows whose category has changed.

Usage:
    python recategorize.py [--dry-run]
"""
import asyncio
import argparse
import httpx
import os
from dotenv import load_dotenv
from scraper import detect_category

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_REST_URL") or os.getenv("SUPABASE_PROJECT_URL", "https://malbjvnmqhdalttcvroi.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

PAGE_SIZE = 1000


async def fetch_all_products(client: httpx.AsyncClient) -> list[dict]:
    """Pages through the products table and returns id, name, description, category."""
    products = []
    offset = 0
    while True:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=HEADERS,
            params={
                "select": "id,name,description,category",
                "limit": str(PAGE_SIZE),
                "offset": str(offset),
            },
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        products.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return products


async def patch_category(client: httpx.AsyncClient, product_id: str, new_category: str):
    r = await client.patch(
        f"{SUPABASE_URL}/rest/v1/products",
        headers=HEADERS,
        params={"id": f"eq.{product_id}"},
        json={"category": new_category},
    )
    r.raise_for_status()


async def main(dry_run: bool):
    async with httpx.AsyncClient(timeout=30) as client:
        print("Fetching all products...")
        products = await fetch_all_products(client)
        print(f"  {len(products)} products loaded.\n")

        changed: list[tuple[dict, str]] = []  # (product, new_category)
        for p in products:
            old = p.get("category") or "otro"
            new = detect_category(p.get("name", ""), p.get("description", "") or "")
            if old != new:
                changed.append((p, new))

        print(f"Products requiring re-categorization: {len(changed)}")

        # Summarize the changes by (old → new)
        from collections import Counter
        transitions: Counter = Counter()
        for p, new in changed:
            transitions[(p.get("category") or "otro", new)] += 1

        if transitions:
            print("\nTransition summary:")
            for (old, new), count in sorted(transitions.items(), key=lambda x: -x[1]):
                print(f"  {old:15s} → {new:15s}  ({count})")

        if dry_run:
            print("\n[dry-run] No changes written.")
            return

        print("\nPatching...")
        errors = 0
        for i, (p, new_category) in enumerate(changed, 1):
            try:
                await patch_category(client, p["id"], new_category)
                print(f"  [{i}/{len(changed)}] {p['name'][:50]} : {p.get('category')} → {new_category}")
            except Exception as e:
                print(f"  [{i}/{len(changed)}] ERROR on {p['id']}: {e}")
                errors += 1

        print(f"\nDone. {len(changed) - errors} patched, {errors} errors.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would change without writing to the DB")
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))
