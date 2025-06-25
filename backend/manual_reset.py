#!/usr/bin/env python
"""
Manual database reset for Render shell
Run this via: python manual_reset.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection

def manual_reset():
    print("🔧 Manual database reset starting...")
    
    # First, try to fake the initial migrations to current state
    print("📝 Faking initial migrations...")
    
    try:
        # Mark all migrations as applied without actually running them
        execute_from_command_line(['manage.py', 'migrate', '--fake'])
        print("✅ Migrations marked as applied")
    except Exception as e:
        print(f"❌ Fake migration failed: {e}")
        
        # If fake fails, we need to drop and recreate
        print("🗑️ Dropping all tables...")
        
        cursor = connection.cursor()
        
        # Drop all tables
        cursor.execute("""
            DO $$ DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        """)
        
        cursor.close()
        
        print("🚀 Running fresh migrations...")
        execute_from_command_line(['manage.py', 'migrate'])
    
    print("✅ Manual reset completed!")

if __name__ == '__main__':
    manual_reset() 