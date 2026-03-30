#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Installing dependencies..."
npm install

echo "Building shared packages..."
(cd ../packages/ai-runner && npm run build)

echo "Building..."
npm run build

echo "Installing globally..."
npm install -g .

echo "Done. Run: feature-factory"
