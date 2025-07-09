import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { paymentsAPI, authAPI } from '../services/api'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import TransactionStatusChecker from '../components/TransactionStatusChecker'
import { 
  Crown, 
  Sparkles, 
  MessageCircle, 
  ShoppingBag, 
  Leaf, 
  Calendar, 
  CreditCard,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info,
  Bot,
  Store,
  Zap
} from 'lucide-react'

const PremiumPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [premiumPackages, setPremiumPackages] = useState([])
  const [storeItems, setStoreItems] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    loadPremiumData()
    loadStoreData()
  }, [])

  const loadPremiumData = async () => {
    try {
      const response = await paymentsAPI.getPremiumPackages()
      setPremiumPackages(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Failed to load premium packages:', err)
      setError('Failed to load premium packages')
    }
  }

  const loadStoreData = async () => {
    try {
      const [itemsRes, inventoryRes] = await Promise.all([
        paymentsAPI.getStoreItems(),
        paymentsAPI.getInventory()
      ])
      setStoreItems(Array.isArray(itemsRes.data) ? itemsRes.data : [])
      setInventory(Array.isArray(inventoryRes.data) ? inventoryRes.data : [])
    } catch (err) {
      console.error('Failed to load store data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePremiumPurchase = async () => {
    if (!selectedPackage || !phone) return

    setSubmitting(true)
    setStatus(null)

    try {
      const response = await paymentsAPI.initiatePremiumPayment(selectedPackage.id, phone)

      setStatus({
        success: true,
        message: 'Payment initiated successfully!',
        details: response.data.customer_message || 'Check your phone for the M-Pesa PIN prompt.'
      })

      // Reset form
      setSelectedPackage(null)
      setPhone('')
    } catch (err) {
      setStatus({
        success: false,
        message: 'Payment failed',
        details: err.response?.data?.error || 'Please try again.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStoreItemPurchase = async (item) => {
    try {
      await paymentsAPI.purchaseStoreItem(item.id)
      // Reload inventory after purchase
      loadStoreData()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to purchase item.')
    }
  }

  const isOwned = (itemId) => Array.isArray(inventory) ? inventory.some(inv => inv.item.id === itemId) : false

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return ''
    const cleaned = phoneNumber.replace(/\D/g, '')
    if (cleaned.startsWith('254')) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')
    } else if (cleaned.startsWith('0')) {
      return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
    }
    return phoneNumber
  }

  const renderStoreSection = (itemType, title, icon) => {
    const Icon = icon
    const filteredItems = Array.isArray(storeItems) ? storeItems.filter(item => item.item_type === itemType) : []
    
    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-8">
          <Icon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No {title.toLowerCase()} available right now.</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                <Store className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{item.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Leaf className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-emerald-700">{item.price} Leaves</span>
                </div>
                {isOwned(item.id) ? (
                  <Badge variant="success">Owned</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleStoreItemPurchase(item)}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    Buy
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Leaf className="h-8 w-8 text-amber-500" />
          <h1 className="text-3xl font-bold text-gray-900">PlantPal Premium</h1>
          <Leaf className="h-8 w-8 text-amber-500" />
        </div>
        <p className="text-lg text-gray-600">Unlock exclusive features and premium plant care tools</p>
        
        {user?.is_premium && (
          <div className="mt-4 inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full">
            <Leaf className="h-4 w-4" />
            <span className="font-medium">Premium Active</span>
            <span className="text-sm">
              • Expires {user.premium_expiry_date ? new Date(user.premium_expiry_date).toLocaleDateString() : 'Never'}
            </span>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="upgrade" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Upgrade
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Store
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Transactions
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* AI Chatbot Feature */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-purple-600" />
                  AI Plant Doctor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Get instant plant care advice from our AI assistant</p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>• 24/7 plant care guidance</li>
                  <li>• Disease diagnosis help</li>
                  <li>• Personalized care tips</li>
                  <li>• Growth optimization advice</li>
                </ul>
                {user?.is_premium ? (
                  <Button 
                    onClick={() => navigate('/premium-chatbot')}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with AI Doctor
                  </Button>
                ) : (
                  <div className="text-center">
                    <div className="text-amber-600 font-medium mb-2">Premium Feature</div>
                    <Button variant="outline" disabled className="w-full">
                      Requires Premium
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Premium Store Access */}
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-emerald-600" />
                  Premium Store
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Access exclusive plant items and decorations</p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>• Rare plant avatars</li>
                  <li>• Designer pots & decorations</li>
                  <li>• Exclusive themes</li>
                  <li>• Premium accessories</li>
                </ul>
                <Button 
                  onClick={() => navigate('/premium')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Store className="h-4 w-4 mr-2" />
                  Browse Store
                </Button>
              </CardContent>
            </Card>

            {/* Advanced Analytics */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Advanced Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Unlock advanced plant care capabilities</p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>• Detailed plant analytics</li>
                  <li>• Growth tracking & insights</li>
                  <li>• Weather integration</li>
                  <li>• Priority support</li>
                </ul>
                {user?.is_premium ? (
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                ) : (
                  <div className="text-center">
                    <div className="text-amber-600 font-medium mb-2">Premium Feature</div>
                    <Button variant="outline" disabled className="w-full">
                      Requires Premium
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Upgrade Tab */}
        <TabsContent value="upgrade" className="space-y-6">
          {!user?.is_premium && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800">How M-Pesa Payment Works</h4>
                    <div className="text-sm text-amber-700 mt-1 space-y-1">
                      <p>• Select a premium package below</p>
                      <p>• Enter your M-Pesa phone number</p>
                      <p>• You'll receive a PIN prompt on your phone</p>
                      <p>• Payment goes to <strong>0707 953 603</strong></p>
                      <p>• Premium access is activated automatically</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {user?.is_premium ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-green-700">
                  <CheckCircle2 className="h-6 w-6" />
                  <div>
                    <h3 className="font-semibold">Premium Active!</h3>
                    <p className="text-sm">
                      Your premium membership expires on {user.premium_expiry_date ? new Date(user.premium_expiry_date).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Premium Packages */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {premiumPackages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`border-2 transition-all hover:shadow-lg cursor-pointer ${
                      selectedPackage?.id === pkg.id
                        ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                        : "border-gray-200 hover:border-purple-300"
                    }`}
                    onClick={() => setSelectedPackage(pkg)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-purple-600" />
                          <span>{pkg.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-700">
                            KES {pkg.price}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pkg.duration_days} days
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">{pkg.description}</p>
                        <div className="text-sm text-purple-600">
                          • {pkg.duration_days} days of premium access
                        </div>
                        {pkg.bonus_leaves > 0 && (
                          <div className="text-sm text-emerald-600">
                            • {pkg.bonus_leaves} bonus leaves included
                          </div>
                        )}
                        {selectedPackage?.id === pkg.id && (
                          <div className="mt-2 p-2 bg-purple-100 rounded text-xs">
                            <strong>Selected:</strong> {pkg.duration_days} days premium for KES {pkg.price}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Phone Number Input */}
              {selectedPackage && (
                <Card>
                  <CardHeader>
                    <CardTitle>Complete Your Purchase</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        M-Pesa Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="e.g., 0707123456"
                          className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    {/* Purchase Summary */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-700 mb-2">Purchase Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Package:</span>
                          <span className="font-medium">{selectedPackage.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span className="font-medium">{selectedPackage.duration_days} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-medium">KES {selectedPackage.price}</span>
                        </div>
                        {selectedPackage.bonus_leaves > 0 && (
                          <div className="flex justify-between">
                            <span>Bonus Leaves:</span>
                            <span className="font-medium">{selectedPackage.bonus_leaves} leaves</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={handlePremiumPurchase}
                      disabled={!phone || submitting}
                      size="lg"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Initiating Payment...
                        </>
                      ) : (
                        <>
                          <Crown className="h-4 w-4 mr-2" />
                          Upgrade to Premium - KES {selectedPackage.price}
                        </>
                      )}
                    </Button>

                    {/* Status Messages */}
                    {status && (
                      <div className={`p-4 rounded-lg ${status.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                        <div className={`flex items-center gap-2 ${status.success ? "text-green-700" : "text-red-600"}`}>
                          {status.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                          <span className="font-medium">{status.message}</span>
                        </div>
                        {status.details && (
                          <p className={`mt-2 text-sm ${status.success ? "text-green-600" : "text-red-500"}`}>
                            {status.details}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* AI Chatbot Tab */}
        <TabsContent value="chatbot" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-purple-600" />
                AI Plant Doctor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user?.is_premium ? (
                <div className="text-center py-8">
                  <Bot className="h-16 w-16 mx-auto text-purple-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Your AI Plant Doctor is Ready!</h3>
                  <p className="text-gray-600 mb-6">
                    Get instant plant care advice, disease diagnosis, and personalized recommendations.
                  </p>
                  <Button 
                    onClick={() => navigate('/premium-chatbot')}
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Start Chatting with AI Doctor
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="relative">
                    <Bot className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                      Premium
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">AI Plant Doctor</h3>
                  <p className="text-gray-600 mb-6">
                    Upgrade to premium to unlock 24/7 AI-powered plant care assistance.
                  </p>
                  <Button 
                    onClick={() => {
                      // Set the active tab to upgrade
                      const upgradeTab = document.querySelector('[value="upgrade"]');
                      if (upgradeTab) {
                        upgradeTab.click();
                      }
                    }}
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Crown className="h-5 w-5 mr-2" />
                    Upgrade to Premium
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Tab */}
        <TabsContent value="store" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-6 w-6 text-emerald-600" />
                  Plant Avatars
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderStoreSection('AVATAR', 'Avatars', ShoppingBag)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-6 w-6 text-blue-600" />
                  Plant Pots
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderStoreSection('POT', 'Pots', Store)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  Decorations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderStoreSection('DECORATION', 'Decorations', Sparkles)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <TransactionStatusChecker />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PremiumPage 