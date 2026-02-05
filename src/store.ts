import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface WalletInfo {
  name: string;
  address: string;
  encrypted_private_key: string;
  encrypted_mnemonic: string | null;
}

interface NetworkConfig {
  name: string;
  chain_id: number;
  rpc_url: string;
  symbol: string;
}

interface WalletState {
  isLoading: boolean;
  isUnlocked: boolean;
  wallets: WalletInfo[];
  currentAddress: string | null;
  balance: string;
  network: NetworkConfig;
}

interface WalletActions {
  initialize: () => Promise<void>;
  createWallet: (name: string, password: string) => Promise<void>;
  importWallet: (name: string, privateKey: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  sendTransaction: (to: string, amount: string) => Promise<string>;
  setNetwork: (network: NetworkConfig) => Promise<void>;
}

export const useWalletStore = create<WalletState & WalletActions>((set, get) => ({
  isLoading: true,
  isUnlocked: false,
  wallets: [],
  currentAddress: null,
  balance: '0',
  network: {
    name: 'QFC Local',
    chain_id: 9000,
    rpc_url: 'http://127.0.0.1:8545',
    symbol: 'QFC',
  },

  initialize: async () => {
    try {
      const wallets = await invoke<WalletInfo[]>('get_wallets');
      const currentAddress = await invoke<string | null>('get_current_address');
      const isUnlocked = await invoke<boolean>('is_unlocked');
      const network = await invoke<NetworkConfig>('get_network');

      set({
        wallets,
        currentAddress,
        isUnlocked,
        network,
        isLoading: false,
      });

      if (currentAddress && isUnlocked) {
        get().refreshBalance();
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
      set({ isLoading: false });
    }
  },

  createWallet: async (name, password) => {
    const wallet = await invoke<WalletInfo>('create_wallet', { name, password });
    set((state) => ({
      wallets: [...state.wallets, wallet],
      currentAddress: wallet.address,
      isUnlocked: true,
    }));
    get().refreshBalance();
  },

  importWallet: async (name, privateKey, password) => {
    const wallet = await invoke<WalletInfo>('import_wallet', { name, privateKey, password });
    set((state) => ({
      wallets: [...state.wallets, wallet],
      currentAddress: wallet.address,
      isUnlocked: true,
    }));
    get().refreshBalance();
  },

  unlock: async (password) => {
    const success = await invoke<boolean>('unlock', { password });
    if (success) {
      set({ isUnlocked: true });
      get().refreshBalance();
    }
    return success;
  },

  lock: async () => {
    await invoke('lock');
    set({ isUnlocked: false, balance: '0' });
  },

  refreshBalance: async () => {
    const { currentAddress } = get();
    if (!currentAddress) return;

    try {
      const result = await invoke<{ balance: string; formatted: string }>('get_balance', {
        address: currentAddress,
      });
      set({ balance: result.formatted });
    } catch (error) {
      console.error('Failed to get balance:', error);
    }
  },

  sendTransaction: async (to, amount) => {
    const result = await invoke<{ hash: string }>('send_transaction', { to, amount });
    get().refreshBalance();
    return result.hash;
  },

  setNetwork: async (network) => {
    await invoke('set_network', { network });
    set({ network });
    get().refreshBalance();
  },
}));
