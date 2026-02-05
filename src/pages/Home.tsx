import { useEffect } from 'react';
import { useWalletStore } from '../store';
import { RefreshCw, Send, Download, Lock, Copy, Check, Settings, Users, BookUser } from 'lucide-react';
import { useState } from 'react';

interface HomeProps {
  onNavigate: (page: 'home' | 'send' | 'receive' | 'settings' | 'accounts' | 'addressbook') => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const { currentAddress, balance, network, refreshBalance, lock, accounts } = useWalletStore();
  const [copied, setCopied] = useState(false);

  const currentAccount = accounts.find(a => a.address === currentAddress);

  useEffect(() => {
    const interval = setInterval(refreshBalance, 10000);
    return () => clearInterval(interval);
  }, [refreshBalance]);

  const copyAddress = async () => {
    if (currentAddress) {
      await navigator.clipboard.writeText(currentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-qfc-500 to-blue-500" />
          <span className="font-semibold">QFC Wallet</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshBalance} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={() => onNavigate('accounts')} className="p-2 hover:bg-gray-100 rounded-lg" title="Accounts">
            <Users className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={() => onNavigate('addressbook')} className="p-2 hover:bg-gray-100 rounded-lg" title="Address Book">
            <BookUser className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={() => onNavigate('settings')} className="p-2 hover:bg-gray-100 rounded-lg" title="Settings">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={lock} className="p-2 hover:bg-gray-100 rounded-lg" title="Lock">
            <Lock className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Network Badge */}
      <div className="px-4 py-2">
        <button
          onClick={() => onNavigate('settings')}
          className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition-colors"
        >
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          {network.name}
        </button>
      </div>

      {/* Balance Card */}
      <div className="px-4 py-2">
        <div className="bg-gradient-to-r from-qfc-500 to-blue-500 rounded-2xl p-6 text-white">
          <p className="text-sm opacity-80">Total Balance</p>
          <p className="text-3xl font-bold mt-1">
            {parseFloat(balance).toFixed(4)} {network.symbol}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => onNavigate('accounts')}
              className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30"
            >
              <Users className="w-3 h-3" />
              {currentAccount?.name || (currentAddress && formatAddress(currentAddress))}
            </button>
            <button
              onClick={copyAddress}
              className="p-1.5 bg-white/20 rounded-full hover:bg-white/30"
              title="Copy address"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-4 grid grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate('receive')}
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-qfc-100 flex items-center justify-center">
            <Download className="w-6 h-6 text-qfc-600" />
          </div>
          <span className="text-sm font-medium">Receive</span>
        </button>
        <button
          onClick={() => onNavigate('send')}
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-qfc-100 flex items-center justify-center">
            <Send className="w-6 h-6 text-qfc-600" />
          </div>
          <span className="text-sm font-medium">Send</span>
        </button>
      </div>

      {/* Quick Links */}
      <div className="px-4 py-2">
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-medium text-gray-800 mb-3">Quick Access</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigate('accounts')}
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Users className="w-5 h-5 text-qfc-500" />
              <span className="text-sm">Accounts</span>
            </button>
            <button
              onClick={() => onNavigate('addressbook')}
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <BookUser className="w-5 h-5 text-qfc-500" />
              <span className="text-sm">Contacts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Network Info */}
      <div className="px-4 py-2">
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-medium text-gray-800 mb-2">Network Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Chain ID</span>
              <span className="font-mono">{network.chain_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">RPC</span>
              <span className="font-mono text-xs truncate max-w-[180px]">{network.rpc_url}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
