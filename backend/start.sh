#!/usr/bin/env bash

# Fix migration state first
echo "🔧 Fixing migration state..."
python fix_migrations.py

# Start the server
echo "🚀 Starting server..."
gunicorn core.wsgi:application 