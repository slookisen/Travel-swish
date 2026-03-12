#!/bin/bash
# Build index.html from Travel-Swish.tsx
# Try current session path first, fall back to searching for build.js
BUILD_JS=$(ls /sessions/*/build.js 2>/dev/null | head -1)
if [ -z "$BUILD_JS" ]; then
  echo "Error: build.js not found in any session"
  exit 1
fi
node "$BUILD_JS" && echo "Build complete"
