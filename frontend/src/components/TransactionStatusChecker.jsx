import React, { useState, useEffect } from 'react'
import { paymentsAPI } from '../services/api'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Phone,
  CreditCard,
  Sparkles,
  Leaf,
  AlertCircle
} from 'lucide-react'

function TransactionStatusChecker() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    loadTransactions()
    const interval = setInterval(loadTransactions, 30000)
    return () => clearInterval(interval)
  }, [])

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

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

  const handleCompleteAllPending = async () => {
    if (!window.confirm('Are you sure you want to complete all pending transactions? This will mark them as successful.')) {
      return
    }
    
    try {
      setRefreshing(true)
      const response = await paymentsAPI.completeAllPending()
      
      if (response.data.success) {
        showNotification(`Successfully completed ${response.data.completed_count} pending transactions!`)
        await loadTransactions() // Refresh the list
      } else {
        showNotification('Failed to complete transactions: ' + response.data.error, 'error')
      }
    } catch (err) {
      console.error('Failed to complete pending transactions:', err)
      showNotification('Failed to complete transactions. Please try again.', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return 'N/A'
    // Convert 254 format to 0 format for display
    if (phoneNumber.startsWith('254')) {
      return '0' + phoneNumber.substring(3)
    }
    return phoneNumber
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-amber-100 text-amber-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const pendingTransactions = transactions.filter(t => t.status === 'PENDING')
  const completedTransactions = transactions.filter(t => t.status === 'SUCCESS').slice(0, 5)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Transactions...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg border ${
          notification.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Pending Transactions */}
      {pendingTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pending Transactions ({pendingTransactions.length})</span>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
            <p className="text-sm text-gray-600">
              These transactions are awaiting M-Pesa confirmation. They should complete automatically within a few minutes.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTransactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(txn.status)}
                  <div>
                    <p className="font-medium">{txn.transaction_type}</p>
                    <p className="text-sm text-gray-600">KES {txn.amount}</p>
                    <p className="text-xs text-gray-500">{formatDate(txn.created_at)}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(txn.status)}>
                  {txn.status}
                </Badge>
              </div>
            ))}
            <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-700">
              <strong>Note:</strong> If a transaction remains pending for more than 10 minutes, please contact support.
            </div>
            <div className="mt-3">
              <Button
                onClick={handleCompleteAllPending}
                disabled={refreshing}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                size="sm"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete All Pending Transactions
                  </>
                )}
              </Button>
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
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No completed transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {completedTransactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(txn.status)}
                    <div>
                      <p className="font-medium">{txn.transaction_type}</p>
                      <p className="text-sm text-gray-600">
                        KES {txn.amount} • {formatPhoneNumber(txn.phone_number)}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(txn.created_at)}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(txn.status)}>
                    {txn.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TransactionStatusChecker 