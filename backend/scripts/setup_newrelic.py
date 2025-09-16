#!/usr/bin/env python3
"""
Script to set up New Relic configuration for the Room Booking System.
Run this script to generate a newrelic.ini configuration file.
"""

import os
import sys
import subprocess
from pathlib import Path


def generate_newrelic_config():
    """Generate New Relic configuration file."""
    
    backend_dir = Path(__file__).parent.parent
    config_path = backend_dir / "newrelic.ini"
    
    if config_path.exists():
        response = input(f"newrelic.ini already exists. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("Configuration file generation cancelled.")
            return
    
    print("Generating New Relic configuration file...")
    
    try:
        # Generate config using New Relic command
        result = subprocess.run(
            ["newrelic-admin", "generate-config", "YOUR_LICENSE_KEY_HERE", str(config_path)],
            capture_output=True,
            text=True,
            cwd=backend_dir
        )
        
        if result.returncode != 0:
            print(f"Error generating config: {result.stderr}")
            return
        
        print(f"✓ Configuration file generated at: {config_path}")
        
        # Update the config with our custom settings
        update_config_file(config_path)
        
    except FileNotFoundError:
        print("Error: newrelic-admin not found. Make sure New Relic is installed:")
        print("  pip install newrelic")
    except Exception as e:
        print(f"Error: {e}")


def update_config_file(config_path):
    """Update the generated config file with custom settings."""
    
    print("Updating configuration with custom settings...")
    
    try:
        with open(config_path, 'r') as f:
            lines = f.readlines()
        
        # Custom settings to apply
        custom_settings = {
            'app_name': 'Room Booking System',
            'monitor_mode': 'true',
            'log_level': 'info',
            'ssl': 'true',
            'high_security': 'false',
            'transaction_tracer.enabled': 'true',
            'transaction_tracer.transaction_threshold': '0.5',
            'transaction_tracer.record_sql': 'obfuscated',
            'transaction_tracer.stack_trace_threshold': '0.5',
            'error_collector.enabled': 'true',
            'error_collector.ignore_status_codes': '404',
            'browser_monitoring.auto_instrument': 'false',
            'thread_profiler.enabled': 'true',
            'distributed_tracing.enabled': 'true',
            'slow_sql.enabled': 'true',
            'custom_insights_events.enabled': 'true',
            'custom_insights_events.max_samples_stored': '3000'
        }
        
        # Update settings in the file
        updated_lines = []
        for line in lines:
            updated = False
            for key, value in custom_settings.items():
                if line.strip().startswith(f'# {key} =') or line.strip().startswith(f'{key} ='):
                    updated_lines.append(f'{key} = {value}\n')
                    updated = True
                    break
            
            if not updated:
                updated_lines.append(line)
        
        # Write back the updated configuration
        with open(config_path, 'w') as f:
            f.writelines(updated_lines)
        
        print("✓ Configuration updated with custom settings")
        
    except Exception as e:
        print(f"Error updating config: {e}")


def create_startup_script():
    """Create a startup script that includes New Relic."""
    
    backend_dir = Path(__file__).parent.parent
    script_path = backend_dir / "start_with_newrelic.sh"
    
    script_content = """#!/bin/bash
# Start the application with New Relic monitoring

# Check if New Relic is configured
if [ -z "$NEW_RELIC_LICENSE_KEY" ]; then
    echo "Warning: NEW_RELIC_LICENSE_KEY not set. Starting without monitoring..."
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "Starting with New Relic monitoring..."
    
    # Option 1: Use environment variables (recommended)
    NEW_RELIC_APP_NAME="Room Booking System" \\
    NEW_RELIC_LOG_LEVEL=info \\
    NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true \\
    newrelic-admin run-program uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    
    # Option 2: Use config file (uncomment if you prefer)
    # newrelic-admin run-program --config-file=newrelic.ini uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi
"""
    
    with open(script_path, 'w') as f:
        f.write(script_content)
    
    # Make the script executable
    os.chmod(script_path, 0o755)
    
    print(f"✓ Startup script created at: {script_path}")


def print_instructions():
    """Print setup instructions."""
    
    print("\n" + "="*60)
    print("New Relic Setup Complete!")
    print("="*60)
    print("\nNext steps:")
    print("\n1. Get your New Relic license key:")
    print("   - Sign up at: https://newrelic.com/signup")
    print("   - Or login at: https://one.newrelic.com")
    print("   - Go to: Admin > API Keys > License keys")
    
    print("\n2. Set environment variables:")
    print("   export NEW_RELIC_LICENSE_KEY='your_license_key_here'")
    print("   export NEW_RELIC_APP_NAME='Room Booking System'")
    print("   export NEW_RELIC_ENVIRONMENT='development'")
    
    print("\n3. Start your application with monitoring:")
    print("\n   Option A: Using the startup script (recommended):")
    print("   ./start_with_newrelic.sh")
    
    print("\n   Option B: Using newrelic-admin directly:")
    print("   newrelic-admin run-program uvicorn app.main:app --host 0.0.0.0 --port 8000")
    
    print("\n   Option C: Using config file:")
    print("   1. Update newrelic.ini with your license key")
    print("   2. Run: newrelic-admin run-program --config-file=newrelic.ini uvicorn app.main:app --host 0.0.0.0 --port 8000")
    
    print("\n4. View your metrics:")
    print("   - Go to: https://one.newrelic.com")
    print("   - Navigate to: APM & Services > Room Booking System")
    
    print("\n5. For production deployment:")
    print("   - Set NEW_RELIC_ENVIRONMENT='production'")
    print("   - Consider using New Relic's deployment markers")
    print("   - Configure alerting policies")
    
    print("\nNote: If NEW_RELIC_LICENSE_KEY is not set, the application will run normally without monitoring.")
    print("="*60 + "\n")


def main():
    """Main function."""
    
    print("New Relic Setup for Room Booking System")
    print("-" * 40)
    
    # Check if New Relic is installed
    try:
        import newrelic
        print(f"✓ New Relic package installed (version {newrelic.version.version})")
    except ImportError:
        print("✗ New Relic package not installed")
        print("  Run: pip install newrelic")
        sys.exit(1)
    
    # Generate configuration
    generate_newrelic_config()
    
    # Create startup script
    create_startup_script()
    
    # Print instructions
    print_instructions()


if __name__ == "__main__":
    main()