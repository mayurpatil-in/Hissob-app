"""
Database seeder — creates super admin, system roles, and all permissions.
Run: uv run python scripts/seed.py
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.database import SessionLocal
from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.models.rbac import Role, Permission, PermissionAction

MODULES = [
    "dashboard", "organizations", "financial_year", "festivals",
    "users", "rbac", "donors", "areas", "receipts",
    "cash_settlement", "expenses", "inventory", "assets",
    "events", "reports", "audit", "notifications", "settings"
]

ACTIONS = [a.value for a in PermissionAction]

SYSTEM_ROLES = [
    {"name": "Super Admin",        "slug": "super_admin",  "is_system": True},
    {"name": "Organization Admin", "slug": "org_admin",    "is_system": True},
    {"name": "President",          "slug": "president",    "is_system": True},
    {"name": "Treasurer",          "slug": "treasurer",    "is_system": True},
    {"name": "Secretary",          "slug": "secretary",    "is_system": True},
    {"name": "Collector",          "slug": "collector",    "is_system": True},
    {"name": "Volunteer",          "slug": "volunteer",    "is_system": True},
    {"name": "Auditor",            "slug": "auditor",      "is_system": True},
]


def seed():
    db = SessionLocal()
    try:
        print("[SEED] Seeding database...")

        # 1. Create all permissions (18 modules x 8 actions = 144 permissions)
        permissions = []
        for module in MODULES:
            for action in ACTIONS:
                existing = db.query(Permission).filter_by(module=module, action=action).first()
                if not existing:
                    perm = Permission(module=module, action=action, description=f"{module}:{action}")
                    db.add(perm)
                    permissions.append(perm)
        db.commit()
        print(f"  [OK] Created permissions in database")

        all_perms = db.query(Permission).all()
        perm_map = {(p.module, p.action): p for p in all_perms}

        # 2. Create system roles
        roles_created = []
        for role_data in SYSTEM_ROLES:
            existing = db.query(Role).filter_by(slug=role_data["slug"], tenant_id=None).first()
            if not existing:
                role = Role(**role_data)
                db.add(role)
                roles_created.append(role)
        db.commit()
        print(f"  [OK] Processed system roles")

        # 3. Assign permissions to roles
        super_admin_role = db.query(Role).filter_by(slug="super_admin", tenant_id=None).first()
        if super_admin_role:
            super_admin_role.permissions = all_perms

        org_admin_role = db.query(Role).filter_by(slug="org_admin", tenant_id=None).first()
        if org_admin_role:
            org_admin_role.permissions = all_perms

        # Auditor role (read-only for all modules)
        auditor_role = db.query(Role).filter_by(slug="auditor", tenant_id=None).first()
        if auditor_role:
            auditor_perms = [p for p in all_perms if p.action in ["view", "export"]]
            auditor_role.permissions = auditor_perms

        # Collector role (receipts, cash_settlement, donors)
        collector_role = db.query(Role).filter_by(slug="collector", tenant_id=None).first()
        if collector_role:
            collector_perms = [
                p for p in all_perms
                if p.module in ["dashboard", "donors", "receipts", "cash_settlement"]
                and p.action in ["view", "create"]
            ]
            collector_role.permissions = collector_perms

        # Treasurer role
        treasurer_role = db.query(Role).filter_by(slug="treasurer", tenant_id=None).first()
        if treasurer_role:
            treasurer_perms = [
                p for p in all_perms
                if p.module in ["dashboard", "financial_year", "festivals", "receipts", "cash_settlement", "expenses", "reports"]
            ]
            treasurer_role.permissions = treasurer_perms

        db.commit()
        print("  [OK] Assigned role permission mappings")

        # 4. Create super admin user
        existing_admin = db.query(User).filter_by(email=settings.SUPER_ADMIN_EMAIL).first()
        if not existing_admin:
            admin = User(
                email=settings.SUPER_ADMIN_EMAIL,
                full_name="System Administrator",
                hashed_password=hash_password(settings.SUPER_ADMIN_PASSWORD),
                is_super_admin=True,
                is_active=True,
                email_verified=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            if super_admin_role:
                admin.roles.append(super_admin_role)
                db.commit()
            print(f"  [OK] Super Admin created: {settings.SUPER_ADMIN_EMAIL}")
        else:
            if super_admin_role and super_admin_role not in existing_admin.roles:
                existing_admin.roles.append(super_admin_role)
                db.commit()
            print(f"  [SKIP] Super Admin already exists: {settings.SUPER_ADMIN_EMAIL}")

        # 5. Fix permissions for any existing non-super-admin users without roles
        users_without_roles = db.query(User).filter(User.is_super_admin == False).all()
        for u in users_without_roles:
            if not u.roles and org_admin_role:
                u.roles.append(org_admin_role)
        db.commit()
        print(f"  [OK] Ensured all tenant users have Org Admin role assigned")

        print("\n[SEED] Completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"[SEED] Failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
