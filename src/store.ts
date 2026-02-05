import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface AccountInfo {
  name: string;
  address: string;
  account_type: string; // "derived" or "imported"
  index: number | null;
}

interface NetworkConfig {
  name: string;
  chain_id: number;
  rpc_url: string;
  symbol: string;
}

interface CreateWalletResponse {
  mnemonic: string;
  address: string;
}

interface Contact {
  id: string;
  name: string;
  address: string;
}

interface WalletState {
  isLoading: boolean;
  isUnlocked: boolean;
  hasWallet: boolean;
  accounts: AccountInfo[];
  currentAddress: string | null;
  balance: string;
  network: NetworkConfig;
  contacts: Contact[];
}

interface WalletActions {
  initialize: () => Promise<void>;
  createWallet: (password: string) => Promise<CreateWalletResponse>;
  importMnemonic: (mnemonic: string, password: string) => Promise<string>;
  deriveAccount: (name: string) => Promise<AccountInfo>;
  importPrivateKey: (name: string, privateKey: string) => Promise<AccountInfo>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  sendTransaction: (to: string, amount: string) => Promise<string>;
  setNetwork: (network: NetworkConfig) => Promise<void>;
  setCurrentAddress: (address: string) => Promise<void>;
  exportMnemonic: (password: string) => Promise<string>;
  exportPrivateKey: (address: string, password: string) => Promise<string>;
  deleteWallet: () => Promise<void>;
  loadContacts: () => Promise<void>;
  addContact: (name: string, address: string) => Promise<Contact>;
  updateContact: (id: string, name: string, address: string) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
}

export const useWalletStore = create<WalletState & WalletActions>((set, get) => ({
  isLoading: true,
  isUnlocked: false,
  hasWallet: false,
  accounts: [],
  currentAddress: null,
  balance: '0',
  network: {
    name: 'QFC Local',
    chain_id: 9000,
    rpc_url: 'http://127.0.0.1:8545',
    symbol: 'QFC',
  },
  contacts: [],

  initialize: async () => {
    try {
      const hasWallet = await invoke<boolean>('has_wallet');
      const currentAddress = await invoke<string | null>('get_current_address');
      const isUnlocked = await invoke<boolean>('is_unlocked');
      const network = await invoke<NetworkConfig>('get_network');
      const accounts = await invoke<AccountInfo[]>('get_accounts');
      const contacts = await invoke<Contact[]>('get_contacts');

      set({
        hasWallet,
        accounts,
        currentAddress,
        isUnlocked,
        network,
        contacts,
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

  createWallet: async (password) => {
    const result = await invoke<CreateWalletResponse>('create_wallet', { password });
    const accounts = await invoke<AccountInfo[]>('get_accounts');
    set({
      hasWallet: true,
      accounts,
      currentAddress: result.address,
      isUnlocked: true,
    });
    get().refreshBalance();
    return result;
  },

  importMnemonic: async (mnemonicPhrase, password) => {
    const address = await invoke<string>('import_mnemonic', { mnemonicPhrase, password });
    const accounts = await invoke<AccountInfo[]>('get_accounts');
    set({
      hasWallet: true,
      accounts,
      currentAddress: address,
      isUnlocked: true,
    });
    get().refreshBalance();
    return address;
  },

  deriveAccount: async (name) => {
    const account = await invoke<AccountInfo>('derive_account', { name });
    const accounts = await invoke<AccountInfo[]>('get_accounts');
    set({
      accounts,
      currentAddress: account.address,
    });
    get().refreshBalance();
    return account;
  },

  importPrivateKey: async (name, privateKey) => {
    const account = await invoke<AccountInfo>('import_private_key', { name, privateKey });
    const accounts = await invoke<AccountInfo[]>('get_accounts');
    set({
      accounts,
      currentAddress: account.address,
    });
    get().refreshBalance();
    return account;
  },

  unlock: async (password) => {
    const success = await invoke<boolean>('unlock', { password });
    if (success) {
      const accounts = await invoke<AccountInfo[]>('get_accounts');
      set({ isUnlocked: true, accounts });
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

  setCurrentAddress: async (address) => {
    await invoke('set_current_address', { address });
    set({ currentAddress: address });
    get().refreshBalance();
  },

  exportMnemonic: async (password) => {
    return await invoke<string>('export_mnemonic', { password });
  },

  exportPrivateKey: async (address, password) => {
    return await invoke<string>('export_private_key', { address, password });
  },

  deleteWallet: async () => {
    await invoke('delete_wallet');
    set({
      hasWallet: false,
      isUnlocked: false,
      accounts: [],
      currentAddress: null,
      balance: '0',
      contacts: [],
    });
  },

  loadContacts: async () => {
    const contacts = await invoke<Contact[]>('get_contacts');
    set({ contacts });
  },

  addContact: async (name, address) => {
    const contact = await invoke<Contact>('add_contact', { name, address });
    set({ contacts: [...get().contacts, contact] });
    return contact;
  },

  updateContact: async (id, name, address) => {
    const contact = await invoke<Contact>('update_contact', { id, name, address });
    set({
      contacts: get().contacts.map(c => c.id === id ? contact : c),
    });
    return contact;
  },

  deleteContact: async (id) => {
    await invoke('delete_contact', { id });
    set({
      contacts: get().contacts.filter(c => c.id !== id),
    });
  },
}));
