import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { paymentsAPI } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Loader2, Leaf, CheckCircle2, AlertTriangle, Phone, CreditCard, Info, Star, Sparkles } from "lucide-react";

export default function PremiumUpgradePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [businessShortcode, setBusinessShortcode] = useState("0707953603");

  useEffect(() => {
    setLoading(true);
    console.log("🔍 Loading premium packages...");
    
    // Load premium packages
    paymentsAPI.getPremiumPackages()
      .then((res) => {
        console.log("✅ Premium packages loaded:", res.data);
        setPackages(res.data);
      })
      .catch((err) => {
        console.error("❌ Failed to load premium packages:", err);
        setError("Failed to load premium packages. Please refresh the page.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleBuyPremium = async () => {
    if (!selected || !phone) return;
    setSubmitting(true);
    setStatus(null);
    setError("");
    setShowPaymentInfo(true);
    
    try {
      const res = await paymentsAPI.initiatePremiumPayment(selected.id, phone);
      
      if (res.data.business_shortcode) {
        setBusinessShortcode(res.data.business_shortcode);
      }
      
      setStatus({ 
        success: true, 
        message: res.data.customer_message || res.data.message,
        details: `Please check your phone (${phone}) for the M-Pesa PIN prompt. The payment will go to ${res.data.business_shortcode || businessShortcode}.`
      });
      
      // Refresh user data after payment initiation
      setTimeout(() => {
        window.location.reload(); // Reload to get updated premium status
      }, 3000);
      
    } catch (e) {
      setError(e.response?.data?.error || "Failed to initiate premium payment.");
      setStatus({ 
        success: false, 
        message: e.response?.data?.error || "Failed to initiate premium payment.",
        details: "Please try again or contact support if the problem persists."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return "";
    const cleaned = phoneNumber.replace(/\D/g, "");
    
    if (cleaned.length <= 6) {
      return cleaned;
    }
    
    if (cleaned.length === 10 && cleaned.startsWith("0")) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    return phoneNumber;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/40 dark:to-orange-950/40 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Leaf className="h-8 w-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-amber-800">PlantPal Premium</h1>
          </div>
          <p className="text-amber-700 max-w-2xl mx-auto">
            Unlock exclusive features including AI-powered chat, advanced analytics, and premium plant varieties. 
            Pay directly with M-Pesa - no leaves required!
          </p>
        </div>

        {/* Current Premium Status */}
        {user?.is_premium && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">You're Already Premium!</h3>
                  <p className="text-green-700 text-sm">
                    Your premium membership expires on{" "}
                    {user.userprofile.premium_expiry_date 
                      ? new Date(user.userprofile.premium_expiry_date).toLocaleDateString()
                      : "Unknown"}
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    You can extend your membership by purchasing any package below.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">How Premium Payment Works</h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                  <p>• Select a premium package below</p>
                  <p>• Enter your M-Pesa phone number</p>
                  <p>• You'll receive a PIN prompt on your phone</p>
                  <p>• Payment goes to <strong>{formatPhoneNumber(businessShortcode)}</strong></p>
                  <p>• Premium is activated immediately after payment</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Features */}
        <Card className="mb-8 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              Premium Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">AI-powered chatbot for guidance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">Advanced mood analytics</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">Priority support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">Exclusive plant varieties</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Packages */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Choose Your Premium Package
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
              </div>
            ) : (
              <>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selected?.id === pkg.id
                          ? "border-amber-500 bg-amber-50 shadow-md"
                          : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
                      }`}
                      onClick={() => setSelected(pkg)}
                    >
                      <div className="text-center">
                        <h3 className="font-bold text-lg text-amber-800">{pkg.name}</h3>
                        <p className="text-2xl font-bold text-amber-600 my-2">
                          KES {pkg.price}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          {pkg.duration_days} days of premium
                        </p>
                        <p className="text-xs text-gray-500">{pkg.description}</p>
                        {pkg.duration_days === 90 && (
                          <div className="mt-2">
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              Most Popular
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Phone Number Input */}
                {selected && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">M-Pesa Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="0700000000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                    
                    <Button
                      onClick={handleBuyPremium}
                      disabled={submitting || !phone}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Leaf className="h-4 w-4 mr-2" />
                          Buy Premium for KES {selected.price}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Status Messages */}
                {status && (
                  <Alert className={`mt-4 ${status.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    {status.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>
                      <div className="font-semibold">{status.message}</div>
                      {status.details && <div className="text-sm mt-1">{status.details}</div>}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Back to Profile */}
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/profile')}
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            Back to Profile
          </Button>
        </div>
      </div>
    </div>
  );
} 