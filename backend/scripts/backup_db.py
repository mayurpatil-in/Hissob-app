"""
Automated PostgreSQL / Database Backup Script for Hissob ERP.
Run via cron job daily e.g.: 0 2 * * * uv run python scripts/backup_db.py
"""
import os
import sys
import shutil
from datetime import datetime, timezone, timedelta

# Ensure backend root in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings

BACKUP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backups"))
RETENTION_DAYS = 30


def run_backup():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    
    print(f"[{timestamp}] Starting Hissob ERP Database Backup...")
    
    db_url = settings.DATABASE_URL
    if "postgresql" in db_url:
        backup_file = os.path.join(BACKUP_DIR, f"hissob_backup_{timestamp}.sql")
        # Run pg_dump command if postgresql
        cmd = f"pg_dump \"{db_url}\" > \"{backup_file}\""
        ret = os.system(cmd)
        if ret == 0:
            print(f"PostgreSQL backup created successfully: {backup_file}")
        else:
            print(f"pg_dump completed with code: {ret}")
    elif "sqlite" in db_url:
        db_path = db_url.replace("sqlite:///", "")
        if os.path.exists(db_path):
            backup_file = os.path.join(BACKUP_DIR, f"hissob_backup_{timestamp}.db")
            shutil.copy2(db_path, backup_file)
            print(f"SQLite DB backup created successfully: {backup_file}")

    # Prune old backups older than 30 days
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    for fname in os.listdir(BACKUP_DIR):
        fpath = os.path.join(BACKUP_DIR, fname)
        if os.path.isfile(fpath):
            mtime = datetime.fromtimestamp(os.path.getmtime(fpath), tz=timezone.utc)
            if mtime < cutoff:
                os.remove(fpath)
                print(f"Pruned old backup file: {fname}")

    print("Backup process completed successfully!")


if __name__ == "__main__":
    run_backup()
