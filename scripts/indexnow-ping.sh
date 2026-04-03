#!/bin/bash

# IndexNow Ping Script
# Pings IndexNow API to notify search engines of sitemap updates
# Usage: ./scripts/indexnow-ping.sh

set -e

SITE_URL="https://iamlyx.com/"
SITEMAP_URL="${SITE_URL}sitemap-index.xml"
PUBLIC_DIR="public"

# Find the IndexNow key file (hex string + .txt)
# IndexNow verifies the key at https://host/{key}.txt
API_KEY_FILE=$(find "$PUBLIC_DIR" -maxdepth 1 -name '[a-f0-9]*.txt' ! -name 'robots.txt' 2>/dev/null | head -n1)

# Check if API key file exists
if [ -z "$API_KEY_FILE" ]; then
  echo "Error: IndexNow API key file not found in $PUBLIC_DIR"
  echo "Expected file pattern: {hex-key}.txt"
  exit 1
fi

# Extract API key from filename (not content)
# IndexNow uses the filename itself as the key verification
API_KEY=$(basename "$API_KEY_FILE" .txt)

if [ -z "$API_KEY" ]; then
  echo "Error: API key is empty"
  exit 1
fi

echo "Pinging IndexNow API..."
echo "Site: $SITE_URL"
echo "Sitemap: $SITEMAP_URL"
echo "Key: ${API_KEY:0:8}..."

# Ping IndexNow API
# We submit the sitemap URL which notifies search engines to recrawl it
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{
    \"host\": \"iamlyx.com\",
    \"key\": \"$API_KEY\",
    \"urlList\": [\"$SITEMAP_URL\"]
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo ""
echo "Response Code: $HTTP_CODE"
echo "Response Body: $BODY"

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 202 ]; then
  echo "✓ IndexNow ping successful!"
else
  echo "✗ IndexNow ping failed with HTTP $HTTP_CODE"
  exit 1
fi
