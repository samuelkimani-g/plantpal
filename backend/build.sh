#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Create migrations for all apps
python manage.py makemigrations
python manage.py makemigrations accounts
python manage.py makemigrations plants
python manage.py makemigrations journal
python manage.py makemigrations moods
python manage.py makemigrations reminders

# Apply migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input 