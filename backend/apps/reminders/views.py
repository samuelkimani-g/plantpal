from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q
from .models import Reminder, ReminderLog
from .serializers import (
    ReminderSerializer,
    ReminderCreateSerializer,
    ReminderToggleSerializer,
    ReminderLogSerializer,
    ReminderStatsSerializer,
    TestReminderSerializer,
    BulkReminderSerializer,
    ReminderSettingsUpdateSerializer
)
from .tasks import send_individual_reminder, send_test_reminder


class ReminderViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for managing user-owned Reminder objects.
    Provides CRUD operations for reminders.
    """
    serializer_class = ReminderSerializer
    # Permissions: Authenticated users only, and only owners can modify/delete their reminders.
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Ensures users can only see and manage their own reminders.
        """
        return Reminder.objects.filter(user=self.request.user).order_by('scheduled_for')

    def perform_create(self, serializer):
        """
        Automatically sets the owner of the reminder to the current authenticated user upon creation.
        """
        serializer.save(user=self.request.user)


class ReminderSettingsView(APIView):
    """
    Get and update reminder settings: 
    GET /api/reminders/ - Get current settings
    POST /api/reminders/ - Create/update reminder settings
    PUT /api/reminders/ - Update reminder settings
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get current reminder settings"""
        reminder, created = Reminder.objects.get_or_create(user=request.user)
        
        if created:
            # Set default reminder settings based on user profile
            try:
                profile = getattr(request.user, 'profile', None)
                if profile and profile.timezone:
                    reminder.timezone = profile.timezone
                    reminder.save()
            except:
                pass
        
        serializer = ReminderSerializer(reminder)
        return Response({
            'reminder': serializer.data,
            'created': created
        })

    def post(self, request):
        """Create or update reminder settings"""
        reminder, created = Reminder.objects.get_or_create(user=request.user)
        serializer = ReminderSettingsUpdateSerializer(
            reminder, 
            data=request.data, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Reminder settings updated successfully',
                'reminder': ReminderSerializer(reminder).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        """Update reminder settings (alias for POST)"""
        return self.post(request)


class ToggleReminderView(APIView):
    """
    Toggle reminder on/off: POST /api/reminders/disable/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reminder, created = Reminder.objects.get_or_create(user=request.user)
        
        # Toggle the enabled status
        reminder.enabled = not reminder.enabled
        reminder.save()
        
        return Response({
            'enabled': reminder.enabled,
            'message': f"Reminders {'enabled' if reminder.enabled else 'disabled'}"
        })


class ReminderStatsView(APIView):
    """
    Get reminder statistics: GET /api/reminders/stats/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            reminder = Reminder.objects.get(user=request.user)
        except Reminder.DoesNotExist:
            return Response({
                'error': 'No reminder settings found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Calculate statistics
        logs = ReminderLog.objects.filter(reminder=reminder)
        
        stats = {
            'total_reminders_sent': logs.count(),
            'successful_reminders': logs.filter(success=True).count(),
            'failed_reminders': logs.filter(success=False).count(),
            'consecutive_misses': reminder.consecutive_misses,
            'last_journal_date': reminder.last_journal_date,
            'wilting_warnings_sent': logs.filter(was_wilting_warning=True).count(),
            'current_streak': max(0, 7 - reminder.consecutive_misses),  # Simple streak calculation
        }

        serializer = ReminderStatsSerializer(stats)
        return Response(serializer.data)


class ReminderLogView(generics.ListAPIView):
    """
    Get reminder history: GET /api/reminders/logs/
    """
    serializer_class = ReminderLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            reminder = Reminder.objects.get(user=self.request.user)
            return ReminderLog.objects.filter(reminder=reminder).order_by('-sent_at')
        except Reminder.DoesNotExist:
            return ReminderLog.objects.none()


class TestReminderView(APIView):
    """
    Send test reminder: POST /api/reminders/test/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Send a test reminder to the current user"""
        try:
            reminder, created = Reminder.objects.get_or_create(user=request.user)
            
            # Force send a test reminder regardless of timing/conditions
            success = send_individual_reminder(reminder)
            
            if success:
                return Response({
                    'success': True,
                    'message': f'Test reminder sent successfully via {reminder.method}'
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Failed to send test reminder'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error sending test reminder: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Function-based views for simple operations
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def quick_toggle_reminders(request):
    """
    Quick toggle for reminders: POST /api/reminders/toggle/
    """
    reminder, created = Reminder.objects.get_or_create(user=request.user)
    enabled = request.data.get('enabled')
    
    if enabled is not None:
        reminder.enabled = bool(enabled)
    else:
        reminder.enabled = not reminder.enabled
    
    reminder.save()
    
    return Response({
        'enabled': reminder.enabled,
        'message': f"Reminders {'enabled' if reminder.enabled else 'disabled'}",
        'settings': ReminderSerializer(reminder).data
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_reminder_time(request):
    """
    Quick update reminder time: POST /api/reminders/time/
    """
    reminder, created = Reminder.objects.get_or_create(user=request.user)
    
    new_time = request.data.get('time')
    if not new_time:
        return Response({
            'error': 'Time is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = ReminderCreateSerializer(reminder, data={'time': new_time}, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Reminder time updated successfully',
            'time': new_time,
            'settings': ReminderSerializer(reminder).data
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def reminder_status(request):
    """
    Get reminder status: GET /api/reminders/status/
    """
    try:
        reminder = Reminder.objects.get(user=request.user)
        
        status_info = {
            'enabled': reminder.enabled,
            'time': reminder.time,
            'timezone': reminder.timezone,
            'method': reminder.method,
            'consecutive_misses': reminder.consecutive_misses,
            'is_due_today': reminder.is_due_today,
            'should_send_wilting_warning': reminder.should_send_wilting_warning,
            'last_reminder_sent': reminder.last_reminder_sent,
            'last_journal_date': reminder.last_journal_date,
        }
        
        return Response(status_info)
        
    except Reminder.DoesNotExist:
        return Response({
            'enabled': False,
            'message': 'No reminder settings configured'
        })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_journal_activity(request):
    """
    Mark that user has journaled (called by journal app): POST /api/reminders/journal-activity/
    """
    try:
        reminder = Reminder.objects.get(user=request.user)
        journal_date = request.data.get('date')  # Optional specific date
        
        if journal_date:
            from django.utils.dateparse import parse_date
            journal_date = parse_date(journal_date)
        
        reminder.update_journal_activity(journal_date)
        
        return Response({
            'message': 'Journal activity recorded',
            'consecutive_misses': reminder.consecutive_misses,
            'last_journal_date': reminder.last_journal_date
        })
        
    except Reminder.DoesNotExist:
        return Response({
            'message': 'No reminder settings found, creating default settings'
        })


# Admin-only views
class BulkReminderView(APIView):
    """
    Bulk reminder operations (admin only): POST /api/reminders/bulk/
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        """Send reminders to multiple users"""
        serializer = BulkReminderSerializer(data=request.data)
        if serializer.is_valid():
            user_ids = serializer.validated_data['user_ids']
            force_send = serializer.validated_data['force_send']
            
            results = []
            for user_id in user_ids:
                try:
                    reminder = Reminder.objects.get(user_id=user_id)
                    if force_send or reminder.is_due_today:
                        success = send_individual_reminder(reminder)
                        results.append({
                            'user_id': user_id,
                            'success': success
                        })
                    else:
                        results.append({
                            'user_id': user_id,
                            'success': False,
                            'reason': 'Not due today'
                        })
                except Reminder.DoesNotExist:
                    results.append({
                        'user_id': user_id,
                        'success': False,
                        'reason': 'No reminder settings'
                    })
            
            return Response({
                'message': 'Bulk reminder operation completed',
                'results': results
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
