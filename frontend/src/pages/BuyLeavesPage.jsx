import React, { useEffect, useState } from "react";
import { paymentsAPI } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2, Leaf, CheckCircle2, AlertTriangle, Phone, CreditCard, Info } from "lucide-react";

export default function BuyLeavesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState(0);
  const [selected, setSelected] = useState(null);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [businessShortcode, setBusinessShortcode] = useState("0707953603"); // Default display, will be updated from backend

  useEffect(() => {
    setLoading(true);
    console.log("🔍 Debug: Starting to load payment data...");
    
    // Load packages first (should work without auth)
    paymentsAPI.getPackages()
      .then((res) => {
        console.log("✅ Packages loaded:", res.data);
        setPackages(res.data);
      })
      .catch((err) => {
        console.error("❌ Failed to load packages:", err);
        setError("Failed to load packages. Please refresh the page.");
      });

    // Try to load user-specific data (requires auth)
    paymentsAPI.getLeaves()
      .then((res) => {
        console.log("✅ Leaves loaded:", res.data);
        setLeaves(res.data.leaves);
      })
      .catch((err) => {
        console.error("❌ Failed to load leaves:", err);
        // Don't set error for this, just keep leaves at 0
      });

    paymentsAPI.getTransactions()
      .then((res) => {
        console.log("✅ Transactions loaded:", res.data);
        setTransactions(res.data);
      })
      .catch((err) => {
        console.error("❌ Failed to load transactions:", err);
        // Don't set error for this, keep transactions empty
      })
      .finally(() => {
        console.log("🏁 Finished loading payment data");
        setLoading(false);
      });
  }, []);

  const handleBuy = async () => {
    if (!selected || !phone) return;
    setSubmitting(true);
    setStatus(null);
    setError("");
    setShowPaymentInfo(true);
    
    try {
      const res = await paymentsAPI.initiatePayment(selected.id, phone);
      
      // Update business shortcode from backend response
      if (res.data.business_shortcode) {
        setBusinessShortcode(res.data.business_shortcode);
      }
      
      setStatus({ 
        success: true, 
        message: res.data.customer_message || res.data.message,
        details: `Please check your phone (${phone}) for the M-Pesa PIN prompt. The payment will go to ${res.data.business_shortcode || businessShortcode}.`
      });
      
      // Refresh data after payment initiation
      setTimeout(() => {
        Promise.all([
          paymentsAPI.getLeaves().then((res) => setLeaves(res.data.leaves)),
          paymentsAPI.getTransactions().then((res) => setTransactions(res.data)),
        ]);
      }, 2000);
      
    } catch (e) {
      setError(e.response?.data?.error || "Failed to initiate payment.");
      setStatus({ 
        success: false, 
        message: e.response?.data?.error || "Failed to initiate payment.",
        details: "Please try again or contact support if the problem persists."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatPhoneNumber = (phoneNumber) => {
    // Format phone number display (e.g., 0707953603 → 0707 953 603)
    if (!phoneNumber) return "";
    const cleaned = phoneNumber.replace(/\D/g, "");
    
    // Handle business shortcodes (like 174379) - don't format them
    if (cleaned.length <= 6) {
      return cleaned;
    }
    
    // Format regular phone numbers
    if (cleaned.length === 10 && cleaned.startsWith("0")) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    return phoneNumber;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/40 dark:to-emerald-950/40 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Wallet Balance Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
              <Leaf className="h-6 w-6 text-emerald-400" /> PlantPal Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-2">
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-100">Leaves:</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-200 flex items-center gap-1">
                {leaves} <Leaf className="h-5 w-5 text-emerald-400" />
              </span>
            </div>
            <div className="text-gray-500 text-sm mb-2">Use leaves to water other users' plants and unlock premium features!</div>
          </CardContent>
        </Card>

        {/* Payment Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">How M-Pesa Payment Works</h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                  <p>• Select a leaf package below</p>
                  <p>• Enter your M-Pesa phone number</p>
                  <p>• You'll receive a PIN prompt on your phone</p>
                  <p>• Payment goes to <strong>{formatPhoneNumber(businessShortcode)}</strong></p>
                  <p>• Leaves are added to your wallet automatically</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buy Leaves Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Buy More Leaves
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* Package Selection */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Choose a Package</h4>
                  
                  {/* Debug Info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mb-4 p-3 bg-yellow-100 rounded-lg text-sm">
                      <div><strong>Debug Info:</strong></div>
                      <div>Packages count: {packages.length}</div>
                      <div>Loading: {loading.toString()}</div>
                      <div>Error: {error || 'none'}</div>
                      <div>API Base URL: {import.meta.env.VITE_API_URL || 'http://localhost:8000'}</div>
                    </div>
                  )}
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                      <div className="text-red-800 font-semibold">Error Loading Packages</div>
                      <div className="text-red-600 text-sm">{error}</div>
                      <button 
                        onClick={() => window.location.reload()} 
                        className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  
                  {packages.length === 0 && !loading && !error && (
                    <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                      <div className="text-gray-800 font-semibold">No packages available</div>
                      <div className="text-gray-600 text-sm">Please try refreshing the page or contact support.</div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {packages.map((pkg) => (
                      <Card
                        key={pkg.id}
                        className={`border-2 transition-all hover:shadow-lg ${
                          selected && selected.id === pkg.id 
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-200" 
                            : "border-gray-200 hover:border-emerald-300"
                        } cursor-pointer relative`}
                        onClick={() => setSelected(pkg)}
                      >
                        {/* Best Value Badge */}
                        {pkg.leaves >= 60 && (
                          <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                            Best Value
                          </div>
                        )}
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Leaf className="h-5 w-5 text-emerald-400" />
                              <span className="text-emerald-700 dark:text-emerald-300">{pkg.leaves} Leaves</span>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                KES {pkg.price}
                              </div>
                              <div className="text-xs text-gray-500">
                                KES {(pkg.price / pkg.leaves).toFixed(2)} per leaf
                              </div>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="text-sm text-gray-600 dark:text-gray-400">{pkg.description}</div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400">
                              • Water {Math.floor(pkg.leaves / 2)} other plants
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400">
                              • {pkg.name}
                            </div>
                            {selected && selected.id === pkg.id && (
                              <div className="mt-2 p-2 bg-emerald-100 dark:bg-emerald-800 rounded text-xs">
                                <strong>Selected:</strong> You're buying {pkg.leaves} leaves for KES {pkg.price}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Phone Number Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    M-Pesa Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="e.g., 0707123456"
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter the phone number that will receive the M-Pesa prompt</p>
                </div>

                {/* Purchase Summary */}
                {selected && phone && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Purchase Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Package:</span>
                        <span className="font-medium">{selected.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Leaves:</span>
                        <span className="font-medium">{selected.leaves} leaves</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium">KES {selected.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment to:</span>
                        <span className="font-medium">{formatPhoneNumber(businessShortcode)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Your number:</span>
                        <span className="font-medium">{formatPhoneNumber(phone)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Buy Button */}
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3"
                  onClick={handleBuy}
                  disabled={!selected || !phone || submitting}
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Initiating Payment...
                    </>
                  ) : (
                    <>
                      <Leaf className="h-4 w-4 mr-2" />
                      Buy {selected ? `${selected.leaves} Leaves for KES ${selected.price}` : 'Leaves'} via M-Pesa
                    </>
                  )}
                </Button>

                {/* Status Messages */}
                {status && (
                  <div className={`mt-4 p-4 rounded-lg ${status.success ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                    <div className={`flex items-center gap-2 ${status.success ? "text-emerald-700" : "text-red-600"}`}>
                      {status.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      <span className="font-medium">{status.message}</span>
                    </div>
                    {status.details && (
                      <p className={`mt-2 text-sm ${status.success ? "text-emerald-600" : "text-red-500"}`}>
                        {status.details}
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Payment Error</span>
                    </div>
                    <p className="mt-1 text-sm text-red-500">{error}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Transaction History Card */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <CreditCard className="h-12 w-12 mx-auto" />
                </div>
                <div className="text-gray-500">No transactions yet.</div>
                <div className="text-sm text-gray-400 mt-1">Your purchase history will appear here</div>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Leaf className="h-5 w-5 text-emerald-500" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {tx.leaves} Leaves
                          </div>
                          <div className="text-sm text-gray-500">
                            KES {tx.amount} • {formatPhoneNumber(tx.phone_number)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === "SUCCESS" 
                            ? "bg-emerald-100 text-emerald-700" 
                            : tx.status === "PENDING" 
                            ? "bg-yellow-100 text-yellow-700" 
                            : "bg-red-100 text-red-700"
                        }`}>
                          {tx.status}
                        </span>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 