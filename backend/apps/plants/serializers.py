from rest_framework import serializers
from .models import Plant, PlantLog

class PlantLogSerializer(serializers.ModelSerializer):
    """
    Serializer for the PlantLog model.
    Converts PlantLog instances to JSON and validates incoming data for log entries.
    """
    class Meta:
        model = PlantLog
        # '__all__' includes all fields from the PlantLog model.
        # 'plant' is read-only because it should be set by the view or URL, not directly by the client in most cases.
        # 'date' is auto_now_add, so it's also read-only.
        fields = '__all__'
        read_only_fields = ['plant', 'date']

class PlantSerializer(serializers.ModelSerializer):
    """
    Serializer for the Plant model.
    Includes nested PlantLogSerializer to display related logs when retrieving a Plant.
    """
    # Nested serializer to display a list of logs associated with a plant.
    # 'many=True' indicates there can be multiple logs.
    # 'read_only=True' means logs cannot be created/updated directly through the PlantSerializer;
    # they must be managed via their own /api/plants/logs/ endpoint.
    logs = PlantLogSerializer(many=True, read_only=True)

    class Meta:
        model = Plant
        # '__all__' includes all fields from the Plant model, plus the 'logs' field defined above.
        fields = '__all__'
        # 'user' is read-only as it's automatically set to the authenticated user.
        # 'date_added' is auto_now_add, so it's also read-only.
        read_only_fields = ['user', 'date_added']

    def validate_name(self, value):
        """
        Custom validation for the 'name' field.
        Ensures the plant name is between 2 and 100 characters.
        """
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Plant name must be at least 2 characters long.")
        if len(value.strip()) > 100:
            raise serializers.ValidationError("Plant name cannot exceed 100 characters.")
        return value

    def validate_species(self, value):
        """
        Custom validation for the 'species' field (if provided).
        Ensures the species name does not exceed 100 characters.
        """
        if value and len(value.strip()) > 100:
            raise serializers.ValidationError("Species name cannot exceed 100 characters.")
        return value

