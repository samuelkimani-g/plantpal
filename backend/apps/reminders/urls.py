from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router for ViewSet-based views
router = DefaultRouter()
router.register(r'legacy', views.ReminderViewSet, basename='reminder')

app_name = 'reminders'

urlpatterns = [
    # Main reminder settings endpoints as specified in architecture
    path('', views.ReminderSettingsView.as_view(), name='reminder_settings'),  # GET/POST/PUT
    path('disable/', views.ToggleReminderView.as_view(), name='toggle_reminder'),  # POST
    
    # Additional reminder management
    path('toggle/', views.quick_toggle_reminders, name='quick_toggle'),
    path('time/', views.update_reminder_time, name='update_time'),
    path('status/', views.reminder_status, name='status'),
    
    # Statistics and logs
    path('stats/', views.ReminderStatsView.as_view(), name='stats'),
    path('logs/', views.ReminderLogView.as_view(), name='logs'),
    
    # Testing and utility
    path('test/', views.TestReminderView.as_view(), name='test_reminder'),
    path('journal-activity/', views.mark_journal_activity, name='journal_activity'),
    
    # Admin endpoints
    path('bulk/', views.BulkReminderView.as_view(), name='bulk_reminders'),
    
    # Legacy ViewSet routes for backward compatibility
    path('api/', include(router.urls)),
]
