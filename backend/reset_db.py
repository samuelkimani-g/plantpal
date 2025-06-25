#!/usr/bin/env python
"""
Database reset script for Render deployment
This script drops all tables and recreates them with fresh migrations
"""
import os
import sys
import django
from django.core.management import execute_from_command_line
from django.db import connection

def reset_database():
    """Reset the database by dropping all tables and running fresh migrations"""
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()
    
    print("🔄 Starting database reset...")
    
    # Get database connection
    cursor = connection.cursor()
    
    try:
        # Drop all tables (be very careful!)
        print("🗑️  Dropping all tables...")
        
        # Get all table names
        cursor.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename NOT LIKE 'pg_%' 
            AND tablename != 'information_schema'
        """)
        
        tables = cursor.fetchall()
        
        if tables:
            # Disable foreign key checks temporarily
            cursor.execute("SET session_replication_role = replica;")
            
            # Drop each table
            for table in tables:
                table_name = table[0]
                print(f"  Dropping table: {table_name}")
                cursor.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE;")
            
            # Re-enable foreign key checks
            cursor.execute("SET session_replication_role = DEFAULT;")
            
            print("✅ All tables dropped successfully")
        else:
            print("ℹ️  No tables found to drop")
            
    except Exception as e:
        print(f"❌ Error during table drop: {e}")
        print("🔄 Continuing with migrations...")
    
    finally:
        cursor.close()
    
    # Run fresh migrations
    print("🚀 Running fresh migrations...")
    execute_from_command_line(['manage.py', 'migrate'])
    
    print("✅ Database reset completed successfully!")

if __name__ == '__main__':
    reset_database() 