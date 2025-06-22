#!/usr/bin/env python3
"""
PlantPal Setup Script
Helps configure and start the PlantPal application.
"""

import os
import subprocess
import sys
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def check_node_version():
    """Check if Node.js is installed."""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js {result.stdout.strip()} detected")
            return True
        else:
            print("❌ Node.js not found")
            return False
    except FileNotFoundError:
        print("❌ Node.js not installed")
        return False

def check_npm():
    """Check if npm is installed."""
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ npm {result.stdout.strip()} detected")
            return True
        else:
            print("❌ npm not found")
            return False
    except FileNotFoundError:
        print("❌ npm not installed")
        return False

def setup_backend():
    """Setup Django backend."""
    print("\n🐍 Setting up Django Backend...")
    
    backend_dir = Path("backend")
    if not backend_dir.exists():
        print("❌ Backend directory not found")
        return False
    
    os.chdir(backend_dir)
    
    # Check if virtual environment exists
    venv_dir = Path("my_env")
    if not venv_dir.exists():
        print("📦 Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "my_env"])
    
    # Activate virtual environment and install dependencies
    if os.name == 'nt':  # Windows
        activate_script = "my_env\\Scripts\\activate"
        pip_path = "my_env\\Scripts\\pip"
    else:  # Unix/Linux/Mac
        activate_script = "my_env/bin/activate"
        pip_path = "my_env/bin/pip"
    
    print("📦 Installing Python dependencies...")
    subprocess.run([pip_path, "install", "-r", "requirements.txt"])
    
    # Check if .env file exists
    if not Path(".env").exists():
        print("⚠️  .env file not found. Please create it with your API keys.")
        print("   See API_SETUP_GUIDE.md for instructions.")
    
    # Run migrations
    print("🗄️  Running database migrations...")
    subprocess.run([sys.executable, "manage.py", "migrate"])
    
    # Create superuser if needed
    print("👤 Creating superuser (optional)...")
    try:
        subprocess.run([sys.executable, "manage.py", "createsuperuser"], input=b'\n\n\n', timeout=30)
    except subprocess.TimeoutExpired:
        print("   Superuser creation skipped")
    
    os.chdir("..")
    print("✅ Backend setup complete!")
    return True

def setup_frontend():
    """Setup React frontend."""
    print("\n⚛️  Setting up React Frontend...")
    
    frontend_dir = Path("frontend")
    if not frontend_dir.exists():
        print("❌ Frontend directory not found")
        return False
    
    os.chdir(frontend_dir)
    
    # Install dependencies
    print("📦 Installing Node.js dependencies...")
    subprocess.run(["npm", "install"])
    
    # Check if .env file exists
    if not Path(".env").exists():
        print("⚠️  .env file not found. Please create it with your API keys.")
        print("   See API_SETUP_GUIDE.md for instructions.")
    
    os.chdir("..")
    print("✅ Frontend setup complete!")
    return True

def start_services():
    """Start both backend and frontend services."""
    print("\n🚀 Starting PlantPal Services...")
    
    # Start backend
    print("🐍 Starting Django server...")
    backend_process = subprocess.Popen(
        ["python", "manage.py", "runserver"],
        cwd="backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Start frontend
    print("⚛️  Starting React development server...")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd="frontend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    print("\n🎉 PlantPal is starting up!")
    print("📱 Frontend: http://localhost:3000")
    print("🔧 Backend API: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/swagger/")
    print("\nPress Ctrl+C to stop both services")
    
    try:
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Stopping services...")
        backend_process.terminate()
        frontend_process.terminate()
        print("✅ Services stopped")

def main():
    """Main setup function."""
    print("🌱 PlantPal Setup Script")
    print("=" * 40)
    
    # Check prerequisites
    if not check_python_version():
        return
    if not check_node_version():
        return
    if not check_npm():
        return
    
    # Setup services
    if not setup_backend():
        print("❌ Backend setup failed")
        return
    
    if not setup_frontend():
        print("❌ Frontend setup failed")
        return
    
    # Ask if user wants to start services
    print("\n" + "=" * 40)
    response = input("🚀 Would you like to start PlantPal now? (y/n): ").lower()
    
    if response in ['y', 'yes']:
        start_services()
    else:
        print("\n📋 Manual startup commands:")
        print("Backend:  cd backend && python manage.py runserver")
        print("Frontend: cd frontend && npm run dev")
        print("\n🎯 Don't forget to:")
        print("1. Set up your .env files with API keys")
        print("2. Run the API test script: python test_apis.py")

if __name__ == "__main__":
    main() 