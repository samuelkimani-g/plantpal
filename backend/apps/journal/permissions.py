from rest_framework import permissions

class IsOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to view or edit it.
    This permission is applied in addition to IsAuthenticated.
    """

    def has_object_permission(self, request, view, obj):
        """
        Check if the user has permission to interact with a specific object.
        DRF calls this for detail views (retrieve, update, delete).
        """
        # Read-only permissions (GET, HEAD, OPTIONS) are allowed to any authenticated request.
        # The get_queryset method in the ViewSet already filters for the current user's objects,
        # but this provides an additional layer of safety against direct object ID access.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions (POST, PUT, PATCH, DELETE) are only allowed if the requesting
        # user is the actual owner of the object.
        return obj.user == request.user

