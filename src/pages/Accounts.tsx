import { useState } from 'react';
import { useWalletStore } from '../store';
import { ArrowLeft, Plus, Check, Copy, Trash2, Eye, EyeOff } from 'lucide-react';

interface AccountsProps {
  onBack: () => void;
}

export default function Accounts({ onBack }: AccountsProps) {
  const { wallets, currentAddress, setCurrentAddress, createWallet, importWallet, deleteWallet } = useWalletStore();
  const [mode, setMode] = useState<'list' | 'create' | 'import'>('list');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCreate = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createWallet(name || `Account ${wallets.length + 1}`, password);
      setMode('list');
      setName('');
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!privateKey) {
      setError('Private key is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await importWallet(name || `Imported ${wallets.length + 1}`, privateKey, password);
      setMode('list');
      setName('');
      setPassword('');
      setPrivateKey('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import account');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  if (mode === 'create' || mode === 'import') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50 p-4">
        <div className="max-w-sm mx-auto">
          <button
            onClick={() => setMode('list')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6">
              {mode === 'create' ? 'Create Account' : 'Import Account'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={mode === 'create' ? `Account ${wallets.length + 1}` : `Imported ${wallets.length + 1}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none"
                />
              </div>

              {mode === 'import' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Private Key
                  </label>
                  <input
                    type="password"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none font-mono text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This password encrypts this account's private key
                </p>
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <button
                onClick={mode === 'create' ? handleCreate : handleImport}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Processing...' : mode === 'create' ? 'Create Account' : 'Import Account'}
              </button>
            </div>
          </div>
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Accounts</h2>
            <span className="text-sm text-gray-500">{wallets.length} account{wallets.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-3 mb-6">
            {wallets.map((wallet) => (
              <button
                key={wallet.address}
                onClick={() => setCurrentAddress(wallet.address)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  currentAddress === wallet.address
                    ? 'border-qfc-500 bg-qfc-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{wallet.name}</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                      {formatAddress(wallet.address)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAddress(wallet.address);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                      {copied === wallet.address ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {currentAddress === wallet.address && (
                      <Check className="w-5 h-5 text-qfc-500" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Add account buttons */}
          <div className="space-y-2">
            <button
              onClick={() => setMode('create')}
              className="w-full py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Account
            </button>
            <button
              onClick={() => setMode('import')}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Import Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
