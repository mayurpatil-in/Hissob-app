"""
RBAC permission engine — dynamic permission checking.
"""
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status

from app.models.rbac import PermissionAction
from app.models.user import User


class PermissionChecker:
    """
    Dependency to check if the current user has a specific module+action permission.
    Usage:
        @router.get("/receipts", dependencies=[Depends(require("receipts", "view"))])
    """

    def __init__(self, module: str, action: PermissionAction):
        self.module = module
        self.action = action

    def __call__(self, current_user: User = Depends()):
        if current_user.is_super_admin:
            return True  # Super Admin bypasses all checks

        allowed = self._user_has_permission(current_user, self.module, self.action)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.module}:{self.action}",
            )
        return True

    @staticmethod
    def _user_has_permission(user: User, module: str, action: str) -> bool:
        for role in user.roles:
            if not role.is_active:
                continue
            for perm in role.permissions:
                if perm.module == module and perm.action == action:
                    return True
        return False


def require(module: str, action: str):
    """
    Shorthand factory — use in route dependencies.
    Example: Depends(require("receipts", "view"))
    """
    from app.auth.deps import get_current_active_user

    def _checker(current_user: User = Depends(get_current_active_user)):
        if current_user.is_super_admin:
            return current_user
        allowed = PermissionChecker._user_has_permission(current_user, module, action)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {module}:{action}",
            )
        return current_user

    return _checker


def get_user_permissions(user: User) -> dict[str, list[str]]:
    """Return a dict of module → list of allowed actions for the user."""
    perms: dict[str, list[str]] = {}
    for role in user.roles:
        if not role.is_active:
            continue
        for perm in role.permissions:
            if perm.module not in perms:
                perms[perm.module] = []
            if perm.action not in perms[perm.module]:
                perms[perm.module].append(perm.action)
    return perms
