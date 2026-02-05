import { useState } from 'react';
import { useWalletStore } from '../store';
import { ArrowLeft, Check } from 'lucide-react';

interface SendProps {
  onBack: () => void;
}

export default function Send({ onBack }: SendProps) {
  const { balance, network, sendTransaction } = useWalletStore();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const handleSend = async () => {
    if (!to || !amount) {
      setError('Please fill in all fields');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
      setError('Invalid address format');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount');
      return;
    }

    if (amountNum > parseFloat(balance)) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const hash = await sendTransaction(to, amount);
      setTxHash(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const setMax = () => {
    // Leave some for gas (0.01 QFC)
    const max = Math.max(0, parseFloat(balance) - 0.01);
    setAmount(max.toString());
  };

  if (txHash) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Transaction Sent!</h2>
          <p className="text-gray-500 text-sm mb-4">
            Your transaction has been submitted to the network.
          </p>
          <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all mb-4">
            {txHash}
          </p>
          <button
            onClick={onBack}
            className="w-full py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50 p-4">
      <div className="max-w-sm mx-auto">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Send {network.symbol}</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Address
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none font-mono text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <button
                  onClick={setMax}
                  className="text-xs text-qfc-600 hover:text-qfc-700"
                >
                  Max: {parseFloat(balance).toFixed(4)} {network.symbol}
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {network.symbol}
                </span>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              onClick={handleSend}
              disabled={loading || !to || !amount}
              className="w-full py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
