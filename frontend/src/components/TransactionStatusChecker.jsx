import React, { useState, useEffect } from 'react'
import { paymentsAPI } from '../services/api'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Phone,
  CreditCard,
  Sparkles,
  Leaf
} from 'lucide-react'

const TransactionStatusChecker = () => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTransactions()
    // Auto-refresh every 30 seconds for pending transactions
    const interval = setInterval(() => {
      loadTransactions()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const loadTransactions = async () => {
    try {
      setError('')
      const response = await paymentsAPI.getTransactionHistory()
      setTransactions(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Failed to load transactions:', err)
      setError('Failed to load transaction history')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadTransactions()
  }

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

  const getTransactionIcon = (type) => {
    return type === 'PREMIUM' ? Sparkles : Leaf
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS':
        return CheckCircle2
      case 'PENDING':
        return Clock
      case 'FAILED':
        return AlertTriangle
      default:
        return CreditCard
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'PENDING':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'FAILED':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const pendingTransactions = transactions.filter(t => t.status === 'PENDING')
  const recentTransactions = transactions.slice(0, 10) // Show last 10 transactions

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pending Transactions Alert */}
      {pendingTransactions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Clock className="h-5 w-5" />
              Pending Transactions ({pendingTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-amber-600 mb-3">
              These transactions are awaiting M-Pesa confirmation. They should complete automatically within a few minutes.
            </div>
            <div className="space-y-2">
              {pendingTransactions.map((tx) => {
                const TypeIcon = getTransactionIcon(tx.transaction_type)
                return (
                  <div key={tx.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">
                        {tx.transaction_type === 'PREMIUM' 
                          ? `${tx.premium_days} Days Premium` 
                          : `${tx.leaves} Leaves`}
                      </span>
                      <span className="text-sm text-gray-500">
                        KES {tx.amount}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-700">
              <strong>Note:</strong> If a transaction remains pending for more than 10 minutes, please contact support with your phone number and transaction time.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transaction History</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <div className="text-gray-500">No transactions yet</div>
              <div className="text-sm text-gray-400 mt-1">Your purchase history will appear here</div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => {
                const TypeIcon = getTransactionIcon(tx.transaction_type)
                const StatusIcon = getStatusIcon(tx.status)
                const statusColor = getStatusColor(tx.status)
                
                return (
                  <div key={tx.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TypeIcon className={`h-5 w-5 ${tx.transaction_type === 'PREMIUM' ? 'text-amber-500' : 'text-emerald-500'}`} />
                        <div>
                          <div className="font-medium text-gray-900">
                            {tx.transaction_type === 'PREMIUM' 
                              ? `${tx.premium_days || 0} Days Premium` 
                              : `${tx.leaves || 0} Leaves`}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span>KES {tx.amount}</span>
                            <span>•</span>
                            <Phone className="h-3 w-3" />
                            <span>{formatPhoneNumber(tx.phone_number)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {tx.status}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                        </div>
                        {tx.receipt_number && (
                          <div className="text-xs text-gray-400 mt-1">
                            Receipt: {tx.receipt_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TransactionStatusChecker 