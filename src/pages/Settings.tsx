import { useState } from 'react';
import { useWalletStore } from '../store';
import { ArrowLeft, Check } from 'lucide-react';

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
  const { network, setNetwork, refreshBalance } = useWalletStore();
  const [customRpc, setCustomRpc] = useState('');
  const [showCustom, setShowCustom] = useState(false);

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
      </div>
    </div>
  );
}
