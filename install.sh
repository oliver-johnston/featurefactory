#!/bin/bash
set -e

echo "[install] Installing dependencies..."
npm install

echo "[install] Building..."
npm run build

echo "[install] Linking globally..."
npm link

echo ""
echo "Feature Factory installed successfully!"
echo ""
echo "  Run:   feature-factory"
echo "  Dev:   npm run dev"
echo ""
