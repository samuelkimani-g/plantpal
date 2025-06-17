"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { User, Edit, Save, X, Trash2, Key, Music, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { authAPI } from "../../services/api"
import SpotifyIntegration from "../music/SpotifyIntegration"

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    bio: "",
    music_mood_weight: 0.5,
  })

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        bio: user.bio || "",
        music_mood_weight: user.music_mood_weight || 0.5,
      })
    }
  }, [user])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await updateProfile(profileData)
      if (result.success) {
        setMessage("Profile updated successfully!")
        setIsEditing(false)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError("Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError("New passwords do not match")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await authAPI.post("/change-password/", {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password,
      })

      setMessage("Password changed successfully!")
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" })
      setIsChangingPassword(false)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to change password")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const refreshToken = localStorage.getItem("refresh_token")
      await authAPI.delete("/delete-account/", {
        data: { refresh: refreshToken },
      })

      // Account deleted, logout user
      await logout()
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete account")
      setIsLoading(false)
    }
  }

  const clearMessages = () => {
    setMessage(null)
    setError(null)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-emerald-950 p-6">
      <div className="container mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center justify-center gap-3">
            <User className="h-8 w-8" />
            Profile Settings
          </h1>
          <p className="text-emerald-600 dark:text-emerald-400">Manage your account and preferences</p>
        </div>

        {/* Messages */}
        {message && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300">{message}</AlertDescription>
            <Button variant="ghost" size="sm" onClick={clearMessages} className="ml-auto">
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button variant="ghost" size="sm" onClick={clearMessages} className="ml-auto">
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      placeholder="Email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="music_mood_weight">Music Influence on Plants</Label>
                    <div className="space-y-2">
                      <Input
                        id="music_mood_weight"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={profileData.music_mood_weight}
                        onChange={(e) =>
                          setProfileData({ ...profileData, music_mood_weight: Number.parseFloat(e.target.value) })
                        }
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Low influence</span>
                        <span>{Math.round(profileData.music_mood_weight * 100)}%</span>
                        <span>High influence</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">First Name</Label>
                      <p className="font-medium">{user.first_name || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Last Name</Label>
                      <p className="font-medium">{user.last_name || "Not set"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Username</Label>
                    <p className="font-medium">{user.username}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Bio</Label>
                    <p className="font-medium">{user.bio || "No bio added yet"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Music Influence</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{Math.round((user.music_mood_weight || 0.5) * 100)}%</Badge>
                      <span className="text-sm text-muted-foreground">influence on plant growth</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Member Since</Label>
                    <p className="font-medium">{new Date(user.date_joined).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Account Security
              </CardTitle>
              <CardDescription>Manage your password and account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Change Password */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Password</h4>
                  {!isChangingPassword && (
                    <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                      Change Password
                    </Button>
                  )}
                </div>

                {isChangingPassword ? (
                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    <Input
                      type="password"
                      placeholder="Current password"
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="New password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3 mr-2" />
                        )}
                        Update Password
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsChangingPassword(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">••••••••••••</p>
                )}
              </div>

              {/* Spotify Connection Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Spotify Connection
                  </h4>
                  <Badge variant={user.spotify_connected ? "default" : "secondary"}>
                    {user.spotify_connected ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {user.spotify_connected
                    ? "Your music is influencing your plant growth"
                    : "Connect Spotify to let music affect your plants"}
                </p>
              </div>

              {/* Delete Account */}
              <div className="space-y-4 pt-4 border-t border-destructive/20">
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                </div>

                {!isDeletingAccount ? (
                  <Button variant="destructive" onClick={() => setIsDeletingAccount(true)} className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This action cannot be undone. All your plants, journal entries, and data will be permanently
                        deleted.
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Yes, Delete My Account
                      </Button>
                      <Button variant="outline" onClick={() => setIsDeletingAccount(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Spotify Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Music Integration
            </CardTitle>
            <CardDescription>Connect your Spotify account to let music influence your plant growth</CardDescription>
          </CardHeader>
          <CardContent>
            <SpotifyIntegration />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
