#!/usr/bin/env python3
"""Sync books from Notion export: create new pages, fix dates, download covers."""

import csv
import os
import re
import subprocess
import urllib.request
import urllib.parse
import json
import time
from datetime import datetime

CONTENT_DIR = "/Users/shivam/Documents/Obsedian/shivam-quartz-v2/content/My Library/Books"
COVERS_DIR = os.path.join(CONTENT_DIR, "covers")
CSV_PATH = "/Users/shivam/Documents/Obsedian/ExportBlock-b42621f2-edb3-4a2d-a2f2-aab2f1067ff4-Part-1/Books/Books 6101836b49094f229a0ad4485340288b_all.csv"

def title_to_filename(title):
    """Convert book title to .md filename matching existing convention."""
    # Replace : with -
    name = title.replace(":", "-")
    # Strip trailing whitespace
    name = name.strip()
    return name + ".md"

def title_to_cover_filename(title):
    """Convert book title to cover image filename matching existing convention."""
    name = title.strip()
    # Replace spaces with _
    name = name.replace(" ", "_")
    # Replace : with -
    name = name.replace(":", "-")
    # Remove apostrophes
    name = name.replace("'", "")
    # Remove commas
    name = name.replace(",", "")
    # Replace @ with _
    name = name.replace("@", "_")
    # Replace & with __
    name = name.replace("&", "__")
    # Replace = with _
    name = name.replace("=", "_")
    # Remove parentheses content chars
    name = name.replace("(", "").replace(")", "")
    # Remove !
    name = name.replace("!", "")
    # Remove "
    name = name.replace('"', '')
    # Clean up multiple underscores
    name = re.sub(r'_+', '_', name)
    name = name.strip('_')
    return name + ".jpg"

def parse_timeline_to_iso(timeline_str):
    """Parse Notion timeline string to ISO date(s)."""
    if not timeline_str or not timeline_str.strip():
        return None

    timeline_str = timeline_str.strip()

    # Handle range: "July 7, 2020 → August 1, 2020" or "September 1, 2025 → September 20, 2025"
    if "→" in timeline_str:
        parts = timeline_str.split("→")
        start = parts[0].strip()
        end = parts[1].strip()
        try:
            start_dt = datetime.strptime(start, "%B %d, %Y")
            end_dt = datetime.strptime(end, "%B %d, %Y")
            return f"{start_dt.strftime('%Y-%m-%d')} → {end_dt.strftime('%Y-%m-%d')}"
        except ValueError:
            pass

    # Handle single date: "June 19, 2021"
    try:
        dt = datetime.strptime(timeline_str.strip(), "%B %d, %Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        pass

    return None

def parse_entry_date_to_iso(date_str):
    """Parse entry date to ISO format."""
    if not date_str or not date_str.strip():
        return None
    date_str = date_str.strip()
    # Handle range in entry date (e.g. "May 3, 2023 → May 29, 2023")
    if "→" in date_str:
        parts = date_str.split("→")
        date_str = parts[0].strip()
    try:
        dt = datetime.strptime(date_str, "%B %d, %Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None

def download_cover(title, cover_filename):
    """Download book cover from Open Library API."""
    search_query = urllib.parse.quote(title.strip())
    search_url = f"https://openlibrary.org/search.json?title={search_query}&limit=3"

    try:
        req = urllib.request.Request(search_url, headers={"User-Agent": "BookSync/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())

        if not data.get("docs"):
            print(f"  No results found on Open Library for: {title}")
            return False

        # Find first doc with a cover
        cover_id = None
        for doc in data["docs"][:3]:
            if doc.get("cover_i"):
                cover_id = doc["cover_i"]
                break

        if not cover_id:
            print(f"  No cover image found on Open Library for: {title}")
            return False

        # Download medium-size cover
        cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
        dest = os.path.join(COVERS_DIR, cover_filename)

        req = urllib.request.Request(cover_url, headers={"User-Agent": "BookSync/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            img_data = resp.read()

        # Check if we got a real image (not a 1x1 placeholder)
        if len(img_data) < 1000:
            print(f"  Cover image too small (placeholder?) for: {title}")
            return False

        with open(dest, "wb") as f:
            f.write(img_data)

        print(f"  Downloaded cover: {cover_filename} ({len(img_data)} bytes)")
        return True

    except Exception as e:
        print(f"  Error downloading cover for {title}: {e}")
        return False

def create_book_page(title, author, status, favorite, timeline, entry_date, cover_filename):
    """Create a new book .md page."""
    filename = title_to_filename(title)
    filepath = os.path.join(CONTENT_DIR, filename)

    # Build frontmatter
    lines = ["---"]
    lines.append(f"image: covers/{cover_filename}")

    if entry_date:
        iso_date = parse_entry_date_to_iso(entry_date)
        if iso_date:
            lines.append(f"Entry Date: {iso_date}")

    if author:
        lines.append(f"Primary Author: {author}")

    # Status
    status_val = status.strip() if status else "Finished"
    if "," in status_val:
        lines.append("Status:")
        for s in status_val.split(","):
            lines.append(f"  - {s.strip()}")
    else:
        lines.append("Status:")
        lines.append(f"  - {status_val}")

    # Timeline
    if timeline:
        iso_timeline = parse_timeline_to_iso(timeline)
        if iso_timeline:
            lines.append(f"Timeline: {iso_timeline}")

    # Favorite
    fav = "true" if favorite.strip().lower() == "yes" else "false"
    lines.append(f"Favorite: {fav}")

    lines.append("---")
    lines.append("")
    lines.append(f"![cover](My%20Library/Books/covers/{urllib.parse.quote(cover_filename)})")
    lines.append("")

    with open(filepath, "w") as f:
        f.write("\n".join(lines))

    print(f"  Created: {filename}")
    return filepath

def fix_timeline(filepath, new_timeline_iso):
    """Fix Invalid date or missing Timeline in existing book page."""
    with open(filepath, "r") as f:
        content = f.read()

    # Replace "Timeline: Invalid date" with correct value
    if "Timeline: Invalid date" in content:
        content = content.replace("Timeline: Invalid date", f"Timeline: {new_timeline_iso}")
        with open(filepath, "w") as f:
            f.write(content)
        print(f"  Fixed Timeline in: {os.path.basename(filepath)}")
        return True

    # If Timeline field is missing entirely, add it before Favorite
    if "Timeline:" not in content:
        content = content.replace("Favorite:", f"Timeline: {new_timeline_iso}\nFavorite:")
        with open(filepath, "w") as f:
            f.write(content)
        print(f"  Added Timeline to: {os.path.basename(filepath)}")
        return True

    return False

def main():
    # Read CSV
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Get existing files
    existing_files = set()
    for fname in os.listdir(CONTENT_DIR):
        if fname.endswith(".md") and fname != "index.md":
            existing_files.add(fname)

    # Normalize for matching
    def normalize(s):
        return re.sub(r'[^a-z0-9]', '', s.lower())

    existing_normalized = {}
    for fname in existing_files:
        title = fname[:-3]  # remove .md
        existing_normalized[normalize(title)] = fname

    # Process CSV
    new_books = []
    date_fixes = []

    for row in rows:
        title = row.get("Title", "").strip()
        if not title:
            continue

        filename = title_to_filename(title)
        norm_title = normalize(title.replace(":", "-"))

        # Check if exists
        matched_file = None
        if filename in existing_files:
            matched_file = filename
        elif norm_title in existing_normalized:
            matched_file = existing_normalized[norm_title]
        else:
            # Try without subtitle cleaning
            for norm, fname in existing_normalized.items():
                if norm_title == norm or (len(norm_title) > 10 and norm.startswith(norm_title[:10]) and norm_title.startswith(norm[:10])):
                    matched_file = fname
                    break

        if matched_file:
            # Check if date needs fixing
            timeline = row.get("Timeline", "").strip()
            if timeline:
                filepath = os.path.join(CONTENT_DIR, matched_file)
                with open(filepath, "r") as f:
                    content = f.read()

                if "Timeline: Invalid date" in content or "Timeline:" not in content:
                    iso_tl = parse_timeline_to_iso(timeline)
                    if iso_tl:
                        date_fixes.append((filepath, iso_tl, title))
        else:
            new_books.append(row)

    # --- Create new books ---
    print(f"\n=== Creating {len(new_books)} new books ===\n")
    for row in new_books:
        title = row["Title"].strip()
        author = row.get("Primary Author", "").strip()
        status = row.get("Status", "Finished").strip()
        favorite = row.get("Favorite", "No").strip()
        timeline = row.get("Timeline", "").strip()
        entry_date = row.get("Entry Date", "").strip()

        cover_filename = title_to_cover_filename(title)

        print(f"\nProcessing: {title}")

        # Download cover
        has_cover = download_cover(title, cover_filename)
        if not has_cover:
            # Try simpler search query (just main title words)
            simple_title = title.split(":")[0].split("(")[0].strip()
            if simple_title != title:
                print(f"  Retrying with simplified title: {simple_title}")
                has_cover = download_cover(simple_title, cover_filename)

        # Create page
        create_book_page(title, author, status, favorite, timeline, entry_date, cover_filename)

        # Rate limit for API
        time.sleep(1)

    # --- Fix dates ---
    print(f"\n=== Fixing {len(date_fixes)} book dates ===\n")
    for filepath, iso_timeline, title in date_fixes:
        fix_timeline(filepath, iso_timeline)

    print(f"\n=== Done! ===")
    print(f"  New books created: {len(new_books)}")
    print(f"  Dates fixed: {len(date_fixes)}")

if __name__ == "__main__":
    main()
