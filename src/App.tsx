import { useEffect, useState } from 'react';
import { useWalletStore } from './store';
import Home from './pages/Home';
import CreateWallet from './pages/CreateWallet';
import Unlock from './pages/Unlock';
import Send from './pages/Send';
import Receive from './pages/Receive';
import Settings from './pages/Settings';
import Accounts from './pages/Accounts';
import AddressBook from './pages/AddressBook';
import History from './pages/History';

type Page = 'home' | 'send' | 'receive' | 'settings' | 'accounts' | 'addressbook' | 'history';

export default function App() {
  const { isLoading, isUnlocked, hasWallet, initialize } = useWalletStore();
  const [page, setPage] = useState<Page>('home');
  const [sendToAddress, setSendToAddress] = useState<string | null>(null);

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

  if (!hasWallet) {
    return <CreateWallet />;
  }

  if (!isUnlocked) {
    return <Unlock />;
  }

  if (page === 'send') {
    return <Send onBack={() => { setPage('home'); setSendToAddress(null); }} prefillAddress={sendToAddress} />;
  }

  if (page === 'receive') {
    return <Receive onBack={() => setPage('home')} />;
  }

  if (page === 'settings') {
    return <Settings onBack={() => setPage('home')} />;
  }

  if (page === 'accounts') {
    return <Accounts onBack={() => setPage('home')} />;
  }

  if (page === 'addressbook') {
    return (
      <AddressBook
        onBack={() => setPage('home')}
        onSendTo={(address) => {
          setSendToAddress(address);
          setPage('send');
        }}
      />
    );
  }

  if (page === 'history') {
    return <History onBack={() => setPage('home')} />;
  }

  return <Home onNavigate={setPage} />;
}
