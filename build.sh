#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "===> 1. Installing Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "===> 2. Installing Frontend dependencies and building production bundle..."
cd frontend
npm install
npm run build
cd ..

echo "===> Build complete! Frontend assets ready in frontend/dist."

