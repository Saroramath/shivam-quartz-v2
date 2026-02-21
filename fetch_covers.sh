#!/bin/bash
# Fetch book cover images from Open Library and add to frontmatter

BOOKS_DIR="/Users/shivam/Documents/shivam-quartz/content/Collection/Books"
SUCCESS=0
FAIL=0
SKIP=0

for file in "$BOOKS_DIR"/*.md; do
  filename=$(basename "$file")

  # Skip index.md
  if [ "$filename" = "index.md" ]; then
    continue
  fi

  # Skip if already has an image field
  if grep -q "^image:" "$file" 2>/dev/null; then
    echo "SKIP (already has image): $filename"
    SKIP=$((SKIP + 1))
    continue
  fi

  # Extract title from filename (remove .md extension)
  title="${filename%.md}"

  # URL-encode the title for the API query
  encoded_title=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$title'))" 2>/dev/null)
  if [ -z "$encoded_title" ]; then
    encoded_title=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$title" 2>/dev/null)
  fi

  # Query Open Library search API
  response=$(curl -s --max-time 10 "https://openlibrary.org/search.json?q=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$title")&limit=1&fields=cover_i,title")

  # Extract cover_i from response
  cover_id=$(echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    docs = data.get('docs', [])
    if docs and docs[0].get('cover_i'):
        print(docs[0]['cover_i'])
except:
    pass
" 2>/dev/null)

  if [ -n "$cover_id" ] && [ "$cover_id" != "None" ]; then
    cover_url="https://covers.openlibrary.org/b/id/${cover_id}-M.jpg"

    # Add image field to frontmatter (after the first ---)
    # Use sed to insert after the first ---
    if head -1 "$file" | grep -q "^---"; then
      sed -i '' "1 a\\
image: $cover_url
" "$file"
      echo "OK: $filename -> cover_id=$cover_id"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "FAIL (no frontmatter): $filename"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "FAIL (no cover found): $filename"
    FAIL=$((FAIL + 1))
  fi

  # Small delay to be nice to the API
  sleep 0.3
done

echo ""
echo "=== DONE ==="
echo "Success: $SUCCESS"
echo "Failed: $FAIL"
echo "Skipped: $SKIP"
echo "Total: $((SUCCESS + FAIL + SKIP))"
