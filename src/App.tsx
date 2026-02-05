import { useEffect, useState } from 'react';
import { useWalletStore } from './store';
import Home from './pages/Home';
import CreateWallet from './pages/CreateWallet';
import Unlock from './pages/Unlock';
import Send from './pages/Send';
import Settings from './pages/Settings';

type Page = 'home' | 'send' | 'receive' | 'settings';

export default function App() {
  const { isLoading, isUnlocked, wallets, initialize } = useWalletStore();
  const [page, setPage] = useState<Page>('home');

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-qfc-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-qfc-500 to-blue-500 animate-pulse" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return <CreateWallet />;
  }

  if (!isUnlocked) {
    return <Unlock />;
  }

  if (page === 'send') {
    return <Send onBack={() => setPage('home')} />;
  }

  if (page === 'settings') {
    return <Settings onBack={() => setPage('home')} />;
  }

  return <Home onNavigate={setPage} />;
}
