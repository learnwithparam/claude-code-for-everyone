#!/bin/bash
# Run the Monday report with nobody at the keyboard.
cd "$(dirname "$0")"
claude "Run the monday-report skill." --permission-mode acceptEdits \
  --allowedTools "Skill" "mcp__till" "Bash(date)" "Read" "Write"
