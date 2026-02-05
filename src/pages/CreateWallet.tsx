import { useState } from 'react';
import { useWalletStore } from '../store';
import { Eye, EyeOff } from 'lucide-react';

export default function CreateWallet() {
  const { createWallet, importWallet } = useWalletStore();
  const [mode, setMode] = useState<'select' | 'create' | 'import'>('select');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createWallet(name || 'My Wallet', password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create wallet');
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
      await importWallet(name || 'Imported Wallet', privateKey, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-qfc-500 to-blue-500 mb-6" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">QFC Wallet</h1>
        <p className="text-gray-500 mb-8">Desktop Edition</p>

        <div className="w-full max-w-xs space-y-4">
          <button
            onClick={() => setMode('create')}
            className="w-full py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Create New Wallet
          </button>
          <button
            onClick={() => setMode('import')}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Import Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50 p-4">
      <div className="max-w-sm mx-auto">
        <button
          onClick={() => setMode('select')}
          className="mb-4 text-gray-600 hover:text-gray-800"
        >
          ← Back
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6">
            {mode === 'create' ? 'Create Wallet' : 'Import Wallet'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wallet Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Wallet"
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
            </div>

            {mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              onClick={mode === 'create' ? handleCreate : handleImport}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Processing...' : mode === 'create' ? 'Create Wallet' : 'Import Wallet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
