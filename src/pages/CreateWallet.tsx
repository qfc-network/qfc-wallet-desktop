import { useState } from 'react';
import { useWalletStore } from '../store';
import { Eye, EyeOff, Copy, Check, AlertTriangle } from 'lucide-react';

export default function CreateWallet() {
  const { createWallet, importMnemonic } = useWalletStore();
  const [mode, setMode] = useState<'select' | 'create' | 'import' | 'backup'>('select');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [inputMnemonic, setInputMnemonic] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

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
      const result = await createWallet(password);
      setMnemonic(result.mnemonic);
      setMode('backup');
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
    const words = inputMnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError('Mnemonic must be 12 or 24 words');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await importMnemonic(inputMnemonic.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  const copyMnemonic = async () => {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Backup confirmation screen
  if (mode === 'backup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50 p-4">
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-semibold">Backup Recovery Phrase</h2>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Write down these 12 words in order. This is the ONLY way to recover your wallet if you lose access.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-3 gap-2">
                {mnemonic.split(' ').map((word, i) => (
                  <div key={i} className="flex items-center gap-1 text-sm">
                    <span className="text-gray-400 w-5">{i + 1}.</span>
                    <span className="font-mono font-medium">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={copyMnemonic}
              className="w-full py-2 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 mb-4"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-700">
                <strong>Warning:</strong> Never share your recovery phrase. Anyone with these words can steal your funds.
              </p>
            </div>

            <label className="flex items-start gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                I have written down my recovery phrase and stored it in a safe place.
              </span>
            </label>

            <button
              onClick={() => window.location.reload()}
              disabled={!confirmed}
              className="w-full py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Continue to Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Selection screen
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
            Import with Recovery Phrase
          </button>
        </div>
      </div>
    );
  }

  // Create or Import form
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
            {mode === 'import' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recovery Phrase
                </label>
                <textarea
                  value={inputMnemonic}
                  onChange={(e) => setInputMnemonic(e.target.value)}
                  placeholder="Enter your 12 or 24 word recovery phrase..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none font-mono text-sm resize-none"
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
