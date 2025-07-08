from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatMessage(models.Model):
    """Model to store chatbot conversation messages"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    message = models.TextField(help_text="User's message")
    response = models.TextField(help_text="Bot's response")
    timestamp = models.DateTimeField(auto_now_add=True)
    mood_impact = models.JSONField(default=dict, blank=True, help_text="Mood impact data from this interaction")
    
    class Meta:
        ordering = ['-timestamp']
        db_table = 'chatbot_messages'
    
    def __str__(self):
        return f"{self.user.username} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
