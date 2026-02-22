#!/usr/bin/env python3
"""
Update travel pages with coordinates and clean up dates.
- Keep valid dates as-is
- Replace "Invalid date" with empty value
- Add empty date field if missing
- Look up coordinates from location name using Nominatim geocoder
"""

import os
import re
import time
import yaml
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable

TRAVEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'content', 'Travel and Photography')

geolocator = Nominatim(user_agent="quartz-travel-pages")

# Manual overrides for locations that might not geocode well
COORD_OVERRIDES = {
    "Bell Island": [47.633, -52.942],  # Bell Island, Newfoundland
    "Butter Pot Provincial Park": [47.367, -52.983],
    "Chintpuni": [31.52, 76.58],  # Himachal Pradesh
    "Cobbler Path, East Coast Trail": [47.52, -52.72],  # near St. John's, NL
    "Fort Amherst, St. John's": [47.563, -52.681],
    "Freshwater Bay": [47.59, -52.72],  # Newfoundland
    "ICTS, Bangalore": [13.0827, 77.5800],  # ICTS campus, Bangalore
    "La Manche Provincial Park": [47.10, -52.93],
    "Le Manche": [47.10, -52.93],  # same as La Manche
    "LSuC, Sardarshahar": [28.44, 74.49],  # Sardarshahar, Rajasthan
    "Madman's Farm, Madhya Pradesh": [23.25, 77.41],  # approx MP center
    "Matheran 2": [18.98, 73.27],  # Matheran, Maharashtra
    "Mickeleen's Path, East Coast Trail": [47.45, -52.75],
    "Motion Path, East Coast Trail": [47.48, -52.73],
    "Newfoundland Screech at Middle Cove": [47.64, -52.67],
    "Petty Harbour": [47.467, -52.717],
    "Poanta Sahib": [30.44, 77.62],
    "Sapna Ranch, Maharashtra": [19.0, 73.5],  # approx Maharashtra
    "Sehatvan, Madhya Pradesh": [23.25, 77.41],
    "Shimla + Kufri": [31.10, 77.17],  # Shimla area
    "Spout Path, East Coast Trail": [47.50, -52.73],
    "Swift Current": [47.27, -53.97],  # Swift Current, NL
    "Kanyakumari, Tamil Nadu": [8.0883, 77.5385],
    "Kanyakumari": [8.0883, 77.5385],
    "Madurai, Tamil Nadu": [9.9252, 78.1198],
    "Barog, Himachal Pradesh": [30.9, 77.07],
    "McLeod Ganj, Himachal Pradesh": [32.24, 76.32],
    "Palampur, Himachal Pradesh": [32.11, 76.53],
    "Udaipur, Rajasthan": [24.5854, 73.7125],
    "Terra Nova National Park, Canada": [48.55, -53.97],
    "Tirumala Tirupati": [13.6833, 79.3472],
    "Trivendrum": [8.5241, 76.9366],  # Trivandrum/Thiruvananthapuram
    "Kodikanal": [10.2381, 77.4892],  # Kodaikanal
}


def geocode_location(name):
    """Look up coordinates for a location name."""
    # Check overrides first
    if name in COORD_OVERRIDES:
        return COORD_OVERRIDES[name]

    # Clean up name for geocoding
    search_name = name
    # Remove suffixes like "2" (duplicates)
    search_name = re.sub(r'\s+\d+$', '', search_name)

    try:
        time.sleep(1.1)  # Nominatim rate limit: 1 req/sec
        location = geolocator.geocode(search_name, timeout=10)
        if location:
            return [round(location.latitude, 4), round(location.longitude, 4)]

        # Try with ", India" appended for Indian locations
        time.sleep(1.1)
        location = geolocator.geocode(search_name + ", India", timeout=10)
        if location:
            return [round(location.latitude, 4), round(location.longitude, 4)]

        # Try with ", Newfoundland, Canada" for NL locations
        time.sleep(1.1)
        location = geolocator.geocode(search_name + ", Newfoundland, Canada", timeout=10)
        if location:
            return [round(location.latitude, 4), round(location.longitude, 4)]

        print(f"  Could not geocode: {name}")
        return None
    except (GeocoderTimedOut, GeocoderUnavailable) as e:
        print(f"  Geocoder error for {name}: {e}")
        return None


def parse_frontmatter(content):
    """Parse frontmatter and body from markdown content."""
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            fm_text = parts[1].strip()
            body = parts[2]
            try:
                fm = yaml.safe_load(fm_text) or {}
            except yaml.YAMLError:
                fm = {}
            return fm, body
    return {}, content


def build_frontmatter(fm):
    """Build frontmatter string from dict."""
    lines = []
    for key, value in fm.items():
        if value is None or value == '':
            lines.append(f"{key}:")
        elif isinstance(value, list) and len(value) == 2 and all(isinstance(v, (int, float)) for v in value):
            # coordinates as inline list
            lines.append(f"{key}: [{value[0]}, {value[1]}]")
        elif isinstance(value, list):
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"  - {item}")
        elif isinstance(value, bool):
            lines.append(f"{key}: {'true' if value else 'false'}")
        else:
            lines.append(f"{key}: {value}")
    return '\n'.join(lines)


def process_file(filepath, filename):
    """Process a single travel page."""
    name = filename.replace('.md', '')
    print(f"Processing: {name}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    fm, body = parse_frontmatter(content)

    # Handle date
    if 'Date' in fm:
        date_val = fm['Date']
        if date_val == 'Invalid date' or date_val is None:
            fm['Date'] = None  # empty for user to fill in
        # else keep as-is (valid date)
    else:
        fm['Date'] = None  # empty for user to fill in

    # Add coordinates if not present
    if 'coordinates' not in fm:
        coords = geocode_location(name)
        if coords:
            fm['coordinates'] = coords
            print(f"  -> [{coords[0]}, {coords[1]}]")
        else:
            print(f"  -> No coordinates found")

    # Ensure title exists
    if 'title' not in fm:
        fm['title'] = name

    # Build new content - preserve field order
    ordered_fm = {}
    # title first, then date, then coordinates, then rest
    if 'title' in fm:
        ordered_fm['title'] = fm.pop('title')
    if 'Date' in fm:
        ordered_fm['Date'] = fm.pop('Date')
    if 'coordinates' in fm:
        ordered_fm['coordinates'] = fm.pop('coordinates')
    # remaining fields
    ordered_fm.update(fm)

    new_content = f"---\n{build_frontmatter(ordered_fm)}\n---{body}"

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)


def main():
    travel_dir = os.path.abspath(TRAVEL_DIR)
    files = sorted(os.listdir(travel_dir))

    processed = 0
    for filename in files:
        if not filename.endswith('.md') or filename == 'index.md':
            continue
        filepath = os.path.join(travel_dir, filename)
        process_file(filepath, filename)
        processed += 1

    print(f"\nDone! Processed {processed} travel pages.")


if __name__ == '__main__':
    main()
