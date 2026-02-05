import { useState } from 'react';
import { useWalletStore } from '../store';
import { ArrowLeft, Check, Eye, EyeOff, Copy, AlertTriangle, Key, Shield } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

const NETWORKS = [
  {
    name: 'QFC Local',
    chain_id: 9000,
    rpc_url: 'http://127.0.0.1:8545',
    symbol: 'QFC',
  },
  {
    name: 'QFC Testnet',
    chain_id: 9001,
    rpc_url: 'https://testnet-rpc.qfc.network',
    symbol: 'QFC',
  },
  {
    name: 'QFC Mainnet',
    chain_id: 9000,
    rpc_url: 'https://rpc.qfc.network',
    symbol: 'QFC',
  },
];

export default function Settings({ onBack }: SettingsProps) {
  const { network, setNetwork, refreshBalance, accounts, currentAddress, exportMnemonic, exportPrivateKey } = useWalletStore();
  const [customRpc, setCustomRpc] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // Export state
  const [showExport, setShowExport] = useState<'mnemonic' | 'private_key' | null>(null);
  const [exportPassword, setExportPassword] = useState('');
  const [exportedData, setExportedData] = useState('');
  const [exportError, setExportError] = useState('');
  const [showExportedData, setShowExportedData] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleSelectNetwork = async (net: typeof NETWORKS[0]) => {
    await setNetwork(net);
    refreshBalance();
  };

  const handleCustomNetwork = async () => {
    if (!customRpc) return;

    const customNet = {
      name: 'Custom RPC',
      chain_id: 9000,
      rpc_url: customRpc,
      symbol: 'QFC',
    };
    await setNetwork(customNet);
    refreshBalance();
    setShowCustom(false);
  };

  const handleExportMnemonic = async () => {
    if (!exportPassword) {
      setExportError('Please enter your password');
      return;
    }
    setExportLoading(true);
    setExportError('');
    try {
      const mnemonic = await exportMnemonic(exportPassword);
      setExportedData(mnemonic);
    } catch (e) {
      setExportError(typeof e === 'string' ? e : 'Wrong password');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPrivateKey = async () => {
    if (!exportPassword) {
      setExportError('Please enter your password');
      return;
    }
    if (!currentAddress) {
      setExportError('No account selected');
      return;
    }
    setExportLoading(true);
    setExportError('');
    try {
      const privateKey = await exportPrivateKey(currentAddress, exportPassword);
      setExportedData(privateKey);
    } catch (e) {
      setExportError(typeof e === 'string' ? e : 'Wrong password');
    } finally {
      setExportLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(exportedData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeExport = () => {
    setShowExport(null);
    setExportPassword('');
    setExportedData('');
    setExportError('');
    setShowExportedData(false);
  };

  const currentAccount = accounts.find(a => a.address === currentAddress);

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
          <h2 className="text-xl font-semibold mb-6">Network Settings</h2>

          <div className="space-y-3">
            {NETWORKS.map((net) => (
              <button
                key={net.name}
                onClick={() => handleSelectNetwork(net)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  network.rpc_url === net.rpc_url
                    ? 'border-qfc-500 bg-qfc-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{net.name}</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                      {net.rpc_url}
                    </p>
                  </div>
                  {network.rpc_url === net.rpc_url && (
                    <Check className="w-5 h-5 text-qfc-500" />
                  )}
                </div>
              </button>
            ))}

            {/* Custom RPC option */}
            {!showCustom ? (
              <button
                onClick={() => setShowCustom(true)}
                className="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-all"
              >
                + Add Custom RPC
              </button>
            ) : (
              <div className="p-4 rounded-xl border-2 border-gray-200 space-y-3">
                <input
                  type="text"
                  value={customRpc}
                  onChange={(e) => setCustomRpc(e.target.value)}
                  placeholder="https://custom-rpc.example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCustom(false)}
                    className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCustomNetwork}
                    disabled={!customRpc}
                    className="flex-1 py-2 bg-qfc-500 text-white rounded-lg hover:bg-qfc-600 disabled:opacity-50"
                  >
                    Connect
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current network info */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Current Network</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{network.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Chain ID</span>
                <span className="font-mono">{network.chain_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Symbol</span>
                <span>{network.symbol}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Export Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-qfc-500" />
            <h2 className="text-xl font-semibold">Security</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowExport('mnemonic')}
              className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 text-left transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Export Recovery Phrase</p>
                  <p className="text-xs text-gray-500">View your 12-word backup phrase</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setShowExport('private_key')}
              className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 text-left transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Key className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Export Private Key</p>
                  <p className="text-xs text-gray-500">
                    Export key for: {currentAccount?.name || 'Current account'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Export Modal */}
        {showExport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <div className="flex items-center gap-2 mb-4">
                {showExport === 'mnemonic' ? (
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                ) : (
                  <Key className="w-6 h-6 text-red-500" />
                )}
                <h3 className="text-lg font-semibold">
                  {showExport === 'mnemonic' ? 'Export Recovery Phrase' : 'Export Private Key'}
                </h3>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-red-700">
                  <strong>Warning:</strong> Never share your {showExport === 'mnemonic' ? 'recovery phrase' : 'private key'} with anyone.
                  Anyone with this information can steal your funds.
                </p>
              </div>

              {!exportedData ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enter Password
                    </label>
                    <input
                      type="password"
                      value={exportPassword}
                      onChange={(e) => setExportPassword(e.target.value)}
                      placeholder="Your wallet password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qfc-500 focus:border-transparent outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          showExport === 'mnemonic' ? handleExportMnemonic() : handleExportPrivateKey();
                        }
                      }}
                    />
                  </div>

                  {exportError && (
                    <p className="text-red-500 text-sm mb-4">{exportError}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={closeExport}
                      className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={showExport === 'mnemonic' ? handleExportMnemonic : handleExportPrivateKey}
                      disabled={exportLoading}
                      className="flex-1 py-2 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      {exportLoading ? 'Verifying...' : 'Continue'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    {showExport === 'mnemonic' ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-500">Recovery Phrase</span>
                          <button
                            onClick={() => setShowExportedData(!showExportedData)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {showExportedData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {showExportedData ? (
                          <div className="grid grid-cols-3 gap-2">
                            {exportedData.split(' ').map((word, i) => (
                              <div key={i} className="flex items-center gap-1 text-sm">
                                <span className="text-gray-400 w-5">{i + 1}.</span>
                                <span className="font-mono font-medium">{word}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            Click the eye icon to reveal
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-500">Private Key</span>
                          <button
                            onClick={() => setShowExportedData(!showExportedData)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {showExportedData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {showExportedData ? (
                          <p className="font-mono text-xs break-all">{exportedData}</p>
                        ) : (
                          <div className="text-center py-2 text-gray-400 text-sm">
                            Click the eye icon to reveal
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={copyToClipboard}
                    disabled={!showExportedData}
                    className="w-full py-2 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 mb-3 disabled:opacity-50"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>

                  <button
                    onClick={closeExport}
                    className="w-full py-2 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-lg hover:opacity-90"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
