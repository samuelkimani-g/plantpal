import React, { useEffect, useState } from "react";
import { paymentsAPI } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2, Leaf, CheckCircle2, AlertTriangle } from "lucide-react";

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

  useEffect(() => {
    setLoading(true);
    Promise.all([
      paymentsAPI.getPackages().then((res) => setPackages(res.data)),
      paymentsAPI.getLeaves().then((res) => setLeaves(res.data.leaves)),
      paymentsAPI.getTransactions().then((res) => setTransactions(res.data)),
    ])
      .catch(() => setError("Failed to load payment info."))
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async () => {
    if (!selected || !phone) return;
    setSubmitting(true);
    setStatus(null);
    setError("");
    try {
      const res = await paymentsAPI.initiatePayment(selected.id, phone);
      setStatus({ success: true, message: res.data.customer_message || res.data.message });
      // Optionally refresh leaves and transactions
      paymentsAPI.getLeaves().then((res) => setLeaves(res.data.leaves));
      paymentsAPI.getTransactions().then((res) => setTransactions(res.data));
    } catch (e) {
      setError(e.response?.data?.error || "Failed to initiate payment.");
      setStatus({ success: false, message: e.response?.data?.error || "Failed to initiate payment." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/40 dark:to-emerald-950/40 py-10 px-4">
      <div className="max-w-2xl mx-auto">
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
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Buy More Leaves</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`border-2 transition-all hover:shadow-lg ${
                      selected && selected.id === pkg.id 
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
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
                            {(pkg.price / pkg.leaves).toFixed(2)} per leaf
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">{pkg.description}</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          • Water {Math.floor(pkg.leaves / 2)} plants
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          • {pkg.name}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <div className="mt-6">
              <input
                type="tel"
                placeholder="Enter your M-Pesa phone number"
                className="w-full px-4 py-2 border rounded mb-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
              />
              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={handleBuy}
                disabled={!selected || !phone || submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Leaf className="h-4 w-4 mr-2" />}
                {submitting ? "Processing..." : "Buy Leaves via M-Pesa"}
              </Button>
              {status && (
                <div className={`mt-3 flex items-center gap-2 ${status.success ? "text-emerald-700" : "text-red-600"}`}>
                  {status.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  {status.message}
                </div>
              )}
              {error && <div className="mt-2 text-red-600">{error}</div>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-gray-500">No transactions yet.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <li key={tx.id} className="py-2 flex items-center gap-2">
                    <span className="font-bold text-emerald-700">{tx.leaves} Leaves</span>
                    <span className="text-gray-500 text-sm">KES {tx.amount}</span>
                    <span className={`text-xs px-2 py-1 rounded ${tx.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : tx.status === "PENDING" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{tx.status}</span>
                    <span className="text-xs text-gray-400 ml-auto">{new Date(tx.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 