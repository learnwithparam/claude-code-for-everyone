#!/bin/bash
# Run the Monday report with nobody at the keyboard.
cd "$(dirname "$0")"
claude -p "Run the monday-report skill." --dangerously-skip-permissions \
  --allowedTools "Skill" "mcp__till" "Bash(date)" "Read" "Write"
