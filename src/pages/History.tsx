import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useWalletStore } from '../store';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, RefreshCw, ExternalLink } from 'lucide-react';

interface Transaction {
  hash: string;
  block_height: number;
  from_address: string;
  to_address: string | null;
  value: string;
  gas_used: string;
  gas_price: string;
  status: string;
  timestamp_ms: string;
}

interface HistoryProps {
  onBack: () => void;
}

const EXPLORER_URL = 'http://localhost:3000';

export default function History({ onBack }: HistoryProps) {
  const { currentAddress, network } = useWalletStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!currentAddress) return;

    setLoading(true);
    setError(null);

    try {
      const result = await invoke<{ transactions: Transaction[] }>('get_transaction_history', {
        address: currentAddress,
        explorerUrl: EXPLORER_URL,
      });
      setTransactions(result.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentAddress]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const formatValue = (value: string) => {
    try {
      const wei = BigInt(value);
      const base = BigInt('1000000000000000000'); // 10^18
      const whole = wei / base;
      const fraction = wei % base;
      const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (fraction === BigInt(0)) {
        return wholeStr;
      }
      const fractionStr = fraction.toString().padStart(18, '0').slice(0, 4);
      return `${wholeStr}.${fractionStr}`;
    } catch {
      return value;
    }
  };

  const formatTimestamp = (timestampMs: string) => {
    const num = Number(timestampMs);
    if (!Number.isFinite(num)) return timestampMs;
    const date = new Date(num);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const isSent = (tx: Transaction) => {
    return tx.from_address.toLowerCase() === currentAddress?.toLowerCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1">Transaction History</h1>
        <button
          onClick={fetchHistory}
          className="p-2 hover:bg-gray-100 rounded-lg"
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4">
        {loading && transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-8 h-8 border-2 border-qfc-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchHistory}
              className="mt-2 text-sm text-red-500 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <ExternalLink className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No transactions yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Your transaction history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const sent = isSent(tx);
              return (
                <div
                  key={tx.hash}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      sent ? 'bg-red-100' : 'bg-green-100'
                    }`}>
                      {sent ? (
                        <ArrowUpRight className="w-5 h-5 text-red-600" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {sent ? 'Sent' : 'Received'}
                        </span>
                        <span className={`font-semibold ${
                          sent ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {sent ? '-' : '+'}{formatValue(tx.value)} {network.symbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-gray-500">
                          {sent ? 'To: ' : 'From: '}
                          {formatAddress(sent ? (tx.to_address || '0x0') : tx.from_address)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          tx.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(tx.timestamp_ms)}
                        </span>
                        <a
                          href={`${EXPLORER_URL}/txs/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-qfc-500 hover:underline flex items-center gap-1"
                        >
                          {formatAddress(tx.hash)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
