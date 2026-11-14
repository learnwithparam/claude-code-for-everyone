#!/bin/bash
# Stop gate. Claude Code runs this each time Claude tries to stop.
# Exit 2 blocks the stop, and the words on stderr go back to Claude.
cat > /dev/null
missing=0
count=$(ls out/labels/*.md 2>/dev/null | wc -l)
if [ "$count" -ne 12 ]; then
  echo "Expected 12 labels in out/labels/, found $count." >&2
  missing=1
fi
for label in out/labels/*.md; do
  [ -e "$label" ] || continue
  if ! grep -q '^Price:' "$label" || ! grep -q '^Contains:' "$label"; then
    echo "$label is missing a Price: or Contains: line." >&2
    missing=1
  fi
done
if [ "$missing" -eq 1 ]; then
  exit 2
fi
exit 0
