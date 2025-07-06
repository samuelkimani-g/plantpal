from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import StoreItem, UserInventory
from .serializers import StoreItemSerializer, UserInventorySerializer


# Create your views here.

class StoreItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StoreItem.objects.filter(is_active=True)
    serializer_class = StoreItemSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def buy(self, request, pk=None):
        item = self.get_object()
        user = request.user

        if user.plantpal_leaves < item.price:
            return Response({'error': 'Not enough leaves.'}, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        if UserInventory.objects.filter(user=user, item=item).exists():
            return Response({'error': 'You already own this item.'}, status=status.HTTP_400_BAD_REQUEST)

        user.plantpal_leaves -= item.price
        user.save()

        UserInventory.objects.create(user=user, item=item)

        return Response({'success': f'You have purchased {item.name}.'}, status=status.HTTP_200_OK)


class UserInventoryViewSet(viewsets.ModelViewSet):
    serializer_class = UserInventorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserInventory.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def equip(self, request, pk=None):
        inventory_item = self.get_object()
        item_type = inventory_item.item.item_type

        # Unequip other items of the same type
        UserInventory.objects.filter(
            user=request.user, 
            item__item_type=item_type, 
            equipped=True
        ).update(equipped=False)

        # Equip the new item
        inventory_item.equipped = True
        inventory_item.save()

        # Apply to user/plant model
        if item_type == 'AVATAR':
            request.user.avatar = inventory_item.item
            request.user.save()
        elif item_type == 'POT':
            request.user.plant.pot = inventory_item.item
            request.user.plant.save()
        elif item_type == 'DECORATION':
            request.user.plant.decoration = inventory_item.item
            request.user.plant.save()

        return Response({'success': f'{inventory_item.item.name} has been equipped.'})
