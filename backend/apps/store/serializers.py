from rest_framework import serializers
from .models import StoreItem, UserInventory

class StoreItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreItem
        fields = '__all__'

class UserInventorySerializer(serializers.ModelSerializer):
    item = StoreItemSerializer(read_only=True)
    class Meta:
        model = UserInventory
        fields = '__all__' 