#!/usr/bin/env python3
"""
Sync travel pages from Notion export into Quartz content.

1. Create missing travel pages from Notion export
2. Copy images from Notion export to content/assets/
3. Update existing pages with missing dates from CSV
4. Geocode new pages to get coordinates
"""

import csv
import os
import re
import shutil
import glob
from datetime import datetime

NOTION_CSV = "/Users/shivam/Documents/Obsedian/Travel/Travel log 4afded99a5534d64be24b7541470718d.csv"
NOTION_DIR = "/Users/shivam/Documents/Obsedian/Travel/Travel log"
QUARTZ_TRAVEL = "/Users/shivam/Documents/Obsedian/shivam-quartz-v2/content/Travel and Photography"
QUARTZ_ASSETS = "/Users/shivam/Documents/Obsedian/shivam-quartz-v2/content/assets"

# Image extensions to copy
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.mp4', '.mov'}


def parse_date(date_str):
    """Parse Notion date string, return the start date as YYYY-MM-DD or None."""
    if not date_str or not date_str.strip():
        return None
    # Handle range dates "June 12, 2019 → June 15, 2019" - take start date
    date_str = date_str.split("→")[0].strip()
    for fmt in ["%B %d, %Y", "%b %d, %Y"]:
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def get_existing_pages():
    """Get dict of existing travel pages: {lowercase_title: filepath}"""
    pages = {}
    for f in glob.glob(os.path.join(QUARTZ_TRAVEL, "*.md")):
        if os.path.basename(f) == "index.md":
            continue
        with open(f, "r") as fh:
            content = fh.read()
        # Extract title from frontmatter
        m = re.search(r'^title:\s*(.+)$', content, re.MULTILINE)
        if m:
            title = m.group(1).strip()
        else:
            title = os.path.splitext(os.path.basename(f))[0]
        pages[title.lower()] = {"path": f, "content": content, "title": title}
    return pages


def get_existing_date(content):
    """Extract Date from frontmatter."""
    m = re.search(r'^Date:\s*(.*)$', content, re.MULTILINE)
    if m:
        val = m.group(1).strip()
        return val if val else None
    return None


def find_notion_md(name):
    """Find the Notion export .md file for a given entry name."""
    # Notion exports files as "Name hash.md"
    pattern = os.path.join(NOTION_DIR, f"{name} *.md")
    matches = glob.glob(pattern)
    if matches:
        return matches[0]
    # Try without special chars
    return None


def find_notion_images_dir(name):
    """Find the Notion export image directory for a given entry name."""
    d = os.path.join(NOTION_DIR, name)
    if os.path.isdir(d):
        return d
    return None


def extract_notion_content(md_path):
    """Extract text content (not metadata lines) and image references from Notion md."""
    with open(md_path, "r") as f:
        lines = f.readlines()

    text_lines = []
    images = []
    skip_header = True

    for line in lines:
        stripped = line.strip()
        # Skip the # Title line
        if skip_header and stripped.startswith("# "):
            skip_header = False
            continue
        skip_header = False
        # Skip metadata lines
        if re.match(r'^(Date|Place|Tags|Database):', stripped):
            continue
        # Extract image references
        img_match = re.match(r'!\[.*?\]\((.+?)\)', stripped)
        if img_match:
            images.append(img_match.group(1))
            continue
        # Keep text content
        if stripped:
            text_lines.append(line.rstrip())

    return "\n".join(text_lines).strip(), images


def copy_images_to_assets(notion_images_dir, images_list):
    """Copy images from Notion export to Quartz assets. Return list of copied filenames."""
    copied = []
    if not notion_images_dir:
        return copied

    for img_ref in images_list:
        # img_ref is like "Paris/filename.jpg"
        img_filename = os.path.basename(img_ref)
        src = os.path.join(NOTION_DIR, img_ref)
        if not os.path.exists(src):
            # Try directly in the images dir
            src = os.path.join(notion_images_dir, img_filename)
        if os.path.exists(src):
            dest = os.path.join(QUARTZ_ASSETS, img_filename)
            if not os.path.exists(dest):
                shutil.copy2(src, dest)
                copied.append(img_filename)
            else:
                copied.append(img_filename)
    return copied


def copy_all_images_from_dir(notion_images_dir):
    """Copy ALL images from a Notion export directory to assets. Return list of filenames."""
    copied = []
    if not notion_images_dir or not os.path.isdir(notion_images_dir):
        return copied
    for f in os.listdir(notion_images_dir):
        ext = os.path.splitext(f)[1].lower()
        if ext in IMAGE_EXTS:
            src = os.path.join(notion_images_dir, f)
            dest = os.path.join(QUARTZ_ASSETS, f)
            if not os.path.exists(dest):
                shutil.copy2(src, dest)
            copied.append(f)
    return copied


def geocode_place(name, place_hint=None):
    """Get coordinates for a place. Returns (lat, lng) or None."""
    try:
        from geopy.geocoders import Nominatim
        geolocator = Nominatim(user_agent="quartz-travel-sync")
        # Try place hint first if available
        if place_hint:
            loc = geolocator.geocode(place_hint, timeout=10)
            if loc:
                return round(loc.latitude, 4), round(loc.longitude, 4)
        loc = geolocator.geocode(name, timeout=10)
        if loc:
            return round(loc.latitude, 4), round(loc.longitude, 4)
    except Exception as e:
        print(f"  Geocoding error for {name}: {e}")
    return None


def create_travel_page(name, date, place, tags, coordinates):
    """Create a new travel page .md file with frontmatter."""
    # Find Notion export content
    notion_md = find_notion_md(name)
    notion_images_dir = find_notion_images_dir(name)

    text_content = ""
    image_refs = []

    if notion_md:
        text_content, image_refs = extract_notion_content(notion_md)

    # Copy images
    copied_images = []
    if image_refs:
        copied_images = copy_images_to_assets(notion_images_dir, image_refs)
    elif notion_images_dir:
        copied_images = copy_all_images_from_dir(notion_images_dir)

    # Build frontmatter
    fm_lines = ["---"]
    fm_lines.append(f"title: {name}")
    if date:
        fm_lines.append(f"Date: {date}")
    else:
        fm_lines.append("Date:")
    if coordinates:
        fm_lines.append(f"coordinates: [{coordinates[0]}, {coordinates[1]}]")
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            fm_lines.append(f"tags: [{', '.join(tag_list)}]")
    fm_lines.append("---")
    fm_lines.append("")

    # Build body with wiki-link image references
    body_lines = []
    if copied_images:
        for img in copied_images:
            body_lines.append(f"![[{img}]]")
    if text_content:
        if body_lines:
            body_lines.append("")
        body_lines.append(text_content)

    content = "\n".join(fm_lines) + "\n".join(body_lines) + "\n"

    # Write file
    filepath = os.path.join(QUARTZ_TRAVEL, f"{name}.md")
    with open(filepath, "w") as f:
        f.write(content)

    return filepath, len(copied_images)


def update_existing_date(page_info, new_date):
    """Update an existing page's Date field."""
    content = page_info["content"]
    # Replace empty Date: line
    updated = re.sub(r'^Date:\s*$', f'Date: {new_date}', content, count=1, flags=re.MULTILINE)
    if updated != content:
        with open(page_info["path"], "w") as f:
            f.write(updated)
        return True
    return False


def main():
    import time

    # Read CSV
    entries = []
    with open(NOTION_CSV, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["Name"].strip()
            if not name or name.startswith("http"):
                continue
            entries.append(row)

    print(f"CSV entries: {len(entries)}")

    # Get existing pages
    existing = get_existing_pages()
    print(f"Existing pages: {len(existing)}")

    # Identify missing pages and date updates
    missing = []
    date_updates = []

    for entry in entries:
        name = entry["Name"].strip()
        date = parse_date(entry.get("Date", ""))
        place = entry.get("Place", "").strip()
        tags = entry.get("Tags", "").strip()

        key = name.lower()
        if key in existing:
            # Check if date needs updating
            if date and not get_existing_date(existing[key]["content"]):
                date_updates.append((existing[key], date, name))
        else:
            missing.append((name, date, place, tags))

    print(f"\nMissing pages: {len(missing)}")
    print(f"Date updates needed: {len(date_updates)}")

    # Update dates on existing pages
    print("\n--- Updating dates ---")
    for page_info, date, name in date_updates:
        if update_existing_date(page_info, date):
            print(f"  Updated date for: {name} -> {date}")
        else:
            print(f"  Could not update date for: {name}")

    # Create missing pages
    print("\n--- Creating missing pages ---")
    for name, date, place, tags in missing:
        print(f"\n  Creating: {name}")

        # Geocode (with rate limiting)
        coords = geocode_place(name, place)
        if coords:
            print(f"    Coordinates: {coords}")
        else:
            print(f"    WARNING: Could not geocode {name}")
        time.sleep(1.1)  # Nominatim rate limit

        filepath, img_count = create_travel_page(name, date, place, tags, coords)
        print(f"    File: {os.path.basename(filepath)}, Images: {img_count}")

    print("\n--- Done ---")


if __name__ == "__main__":
    main()
