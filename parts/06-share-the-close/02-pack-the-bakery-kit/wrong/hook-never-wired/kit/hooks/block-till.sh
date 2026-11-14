#!/bin/bash
# Stop any edit to a file inside till/, because the till is the record.
input=$(cat)
if echo "$input" | grep -q '"file_path"[^,}]*till/'; then
  echo "Blocked: till/ is the record. Write a copy in out/ instead." >&2
  exit 2
fi
exit 0
