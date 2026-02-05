import { useState } from 'react';
import { useWalletStore } from '../store';
import { ArrowLeft, Plus, Check, Copy, Eye, EyeOff, Key, Layers } from 'lucide-react';

interface AccountsProps {
  onBack: () => void;
}

export default function Accounts({ onBack }: AccountsProps) {
  const { accounts, currentAddress, setCurrentAddress, deriveAccount, importPrivateKey } = useWalletStore();
  const [mode, setMode] = useState<'list' | 'derive' | 'import'>('list');
  const [name, setName] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleDerive = async () => {
    setLoading(true);
    setError('');
    try {
      await deriveAccount(name);
      setMode('list');
      setName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!privateKey) {
      setError('Private key is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await importPrivateKey(name, privateKey);
      setMode('list');
      setName('');
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

  // Derive or Import form
  if (mode === 'derive' || mode === 'import') {
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
            <div className="flex items-center gap-2 mb-6">
              {mode === 'derive' ? (
                <Layers className="w-6 h-6 text-qfc-500" />
              ) : (
                <Key className="w-6 h-6 text-qfc-500" />
              )}
              <h2 className="text-xl font-semibold">
                {mode === 'derive' ? 'Add Account' : 'Import Account'}
              </h2>
            </div>

            {mode === 'derive' && (
              <p className="text-sm text-gray-500 mb-4">
                This will derive a new address from your recovery phrase.
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={mode === 'derive' ? `Account ${accounts.filter(a => a.account_type === 'derived').length + 1}` : 'Imported Account'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none"
                />
              </div>

              {mode === 'import' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Private Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPrivateKey ? 'text' : 'password'}
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none font-mono text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPrivateKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This key will be encrypted with your wallet password.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <button
                onClick={mode === 'derive' ? handleDerive : handleImport}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Processing...' : mode === 'derive' ? 'Add Account' : 'Import Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Account list
  const derivedAccounts = accounts.filter(a => a.account_type === 'derived');
  const importedAccounts = accounts.filter(a => a.account_type === 'imported');

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
            <span className="text-sm text-gray-500">{accounts.length} total</span>
          </div>

          {/* Derived Accounts */}
          {derivedAccounts.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  HD Accounts
                </span>
              </div>
              <div className="space-y-2">
                {derivedAccounts.map((account) => (
                  <button
                    key={account.address}
                    onClick={() => setCurrentAddress(account.address)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      currentAddress === account.address
                        ? 'border-qfc-500 bg-qfc-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{account.name}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {formatAddress(account.address)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(account.address);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg"
                        >
                          {copied === account.address ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        {currentAddress === account.address && (
                          <Check className="w-5 h-5 text-qfc-500" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Imported Accounts */}
          {importedAccounts.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Imported
                </span>
              </div>
              <div className="space-y-2">
                {importedAccounts.map((account) => (
                  <button
                    key={account.address}
                    onClick={() => setCurrentAddress(account.address)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      currentAddress === account.address
                        ? 'border-qfc-500 bg-qfc-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{account.name}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {formatAddress(account.address)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(account.address);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg"
                        >
                          {copied === account.address ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        {currentAddress === account.address && (
                          <Check className="w-5 h-5 text-qfc-500" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add account buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => setMode('derive')}
              className="w-full py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Account
            </button>
            <button
              onClick={() => setMode('import')}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Key className="w-5 h-5" />
              Import Private Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
