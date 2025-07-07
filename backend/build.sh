#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --no-input

# Apply database migrations
python manage.py migrate 

# Create default packages and store items
python manage.py create_packages
python manage.py create_default_items
python manage.py setup_premium_packages 