#!/usr/bin/env bash

# Apply migrations
python manage.py migrate

# Start the server
gunicorn core.wsgi:application 