"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { reminderAPI } from "../../services/api"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { 
  Bell, 
  Clock, 
  Mail, 
  Smartphone, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Calendar,
  Target,
  BarChart3
} from "lucide-react"

// Simple inline Switch component
const Switch = ({ checked, onCheckedChange, disabled, className = "" }) => {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`
        inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent 
        transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50 
        ${checked ? 'bg-blue-600' : 'bg-gray-200'} 
        ${className}
      `}
      onClick={handleClick}
      disabled={disabled}
    >
      <span
        className={`
          pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
};

const ReminderSettings = () => {
  const { user } = useAuth()
  const [reminder, setReminder] = useState(null)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeTab, setActiveTab] = useState("settings")

  const [reminderForm, setReminderForm] = useState({
    time: "19:00",
    timezone: "UTC",
    method: "email",
    enabled: true
  })

  useEffect(() => {
    loadReminderData()
  }, [])

  const loadReminderData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await reminderAPI.getReminders()
      
      if (response.data) {
        const reminderData = Array.isArray(response.data) 
          ? response.data[0] 
          : response.data
        
        if (reminderData) {
          setReminder(reminderData)
          setReminderForm({
            time: reminderData.time || "19:00",
            timezone: reminderData.timezone || "UTC",
            method: reminderData.method || "email",
            enabled: reminderData.enabled !== false
          })
        }
      }

    } catch (err) {
      console.error("Error loading reminder data:", err)
      setError("Failed to load reminder settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      let response
      if (reminder?.id) {
        response = await reminderAPI.updateReminder(reminder.id, reminderForm)
      } else {
        response = await reminderAPI.createReminder(reminderForm)
      }

      setReminder(response.data)
      setSuccess("Reminder settings saved successfully!")
      
      setTimeout(() => {
        loadReminderData()
        setSuccess(null)
      }, 2000)

    } catch (err) {
      console.error("Error saving reminder:", err)
      setError(err.response?.data?.detail || "Failed to save reminder settings")
    } finally {
      setIsSaving(false)
    }
  }

  const formatTime = (time) => {
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch {
      return time
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading reminder settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🔔 Reminder Settings
          </h1>
          <p className="text-muted-foreground">Stay consistent with your mindful journey</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Daily Reminder Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable Daily Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded to write in your journal every day
                  </p>
                </div>
                <Switch
                  checked={reminderForm.enabled}
                  onCheckedChange={(checked) => 
                    setReminderForm({ ...reminderForm, enabled: checked })
                  }
                />
              </div>

              {reminderForm.enabled && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="time">Reminder Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={reminderForm.time}
                        onChange={(e) => 
                          setReminderForm({ ...reminderForm, time: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="method">Notification Method</Label>
                      <Select
                        value={reminderForm.method}
                        onValueChange={(value) =>
                          setReminderForm({ ...reminderForm, method: value })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email
                            </div>
                          </SelectItem>
                          <SelectItem value="push">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              Push Notification
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Settings
              </Button>
            </CardContent>
          </Card>

          {reminder && (
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {reminder.consecutive_misses || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Consecutive Misses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatTime(reminder.time)}
                    </div>
                    <div className="text-sm text-muted-foreground">Daily Reminder Time</div>
                  </div>
                  <div className="text-center">
                    <Badge variant={reminder.enabled ? "default" : "secondary"}>
                      {reminder.enabled ? "Active" : "Disabled"}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">Status</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReminderSettings