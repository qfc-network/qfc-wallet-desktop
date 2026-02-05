# QFC Wallet Desktop - Development Notes

## Project Overview

A native desktop wallet for QFC blockchain built with Tauri 2 (Rust + React/TypeScript).

## Tech Stack

- **Backend**: Tauri 2, Rust
  - `ethers-rs` - Ethereum-compatible blockchain interactions
  - `tiny-bip39` + `hdwallet` - HD wallet (BIP-39/BIP-44)
  - `aes-gcm` - AES-256-GCM encryption for key storage
- **Frontend**: React 18, TypeScript, Vite
  - Zustand - State management
  - Tailwind CSS - Styling
  - Lucide React - Icons

## Project Structure

```
qfc-wallet-desktop/
├── src/                    # React frontend
│   ├── App.tsx            # Main app with routing
│   ├── store.ts           # Zustand state management
│   └── pages/
│       ├── Home.tsx       # Main wallet view (balance, send/receive)
│       ├── CreateWallet.tsx   # Wallet creation & import
│       ├── Unlock.tsx     # Password unlock screen
│       ├── Send.tsx       # Send QFC transaction
│       ├── Accounts.tsx   # Multi-account management
│       └── Settings.tsx   # Network & security settings
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs         # All Tauri commands & wallet logic
│   │   └── main.rs        # Entry point (calls lib::run())
│   ├── Cargo.toml         # Rust dependencies
│   └── icons/             # App icons
└── package.json           # Node dependencies
```

## Features Completed

### Wallet Core
- [x] HD Wallet (BIP-39/BIP-44) - Single 12-word recovery phrase
- [x] Create new wallet with mnemonic backup
- [x] Import wallet from mnemonic phrase
- [x] AES-256-GCM encrypted key storage
- [x] Password protection with lock/unlock

### Multi-Account Support
- [x] Derive unlimited accounts from single mnemonic (path: m/44'/60'/0'/0/x)
- [x] Import external accounts via private key
- [x] Switch between accounts
- [x] Separate display for HD accounts vs imported accounts

### Transactions
- [x] View balance (refreshes on network/account change)
- [x] Send QFC with address validation
- [x] Legacy transaction format (compatible with QFC node)
- [x] Transaction hash display on success

### Network
- [x] Network selector (Local/Testnet/Mainnet)
- [x] Custom RPC endpoint support
- [x] Chain ID configuration

### Security & Export
- [x] Export recovery phrase (with password verification)
- [x] Export private key for any account
- [x] Hidden by default, eye toggle to reveal
- [x] Copy to clipboard with warnings

### UI/UX
- [x] Clean, modern UI with gradient theme
- [x] Responsive design
- [x] Loading states and error handling
- [x] Copy address to clipboard
- [x] Max amount button (leaves gas reserve)

## Features TODO

### High Priority
- [ ] Receive page with QR code
- [ ] Transaction history
- [ ] Token support (ERC-20)
- [ ] Address book / contacts

### Medium Priority
- [ ] Biometric unlock (Touch ID / Face ID)
- [ ] Auto-lock timeout
- [ ] Price display (USD value)
- [ ] Gas estimation and custom gas settings
- [ ] Multiple networks simultaneously

### Low Priority
- [ ] NFT support (ERC-721)
- [ ] WalletConnect integration
- [ ] Hardware wallet support (Ledger/Trezor)
- [ ] Multi-language support (i18n)
- [ ] Dark mode

### Technical Debt
- [ ] Persistent wallet storage (currently in-memory, lost on restart)
- [ ] Error boundary components
- [ ] Unit tests for Rust commands
- [ ] E2E tests

## Known Issues

1. **Wallet not persisted**: Wallet data is only in memory. Restarting the app requires re-importing.
2. **No transaction history**: Only shows current balance, no past transactions.

## Build & Run

```bash
# Install dependencies
npm install

# Development
npm run tauri dev

# Build for production
npm run tauri build
```

## Important Notes

### Transaction Format
QFC node uses legacy transactions (not EIP-1559). Must set `gas` and `gas_price` explicitly:
```rust
let tx = TransactionRequest::new()
    .to(to_addr)
    .value(value)
    .gas(21000u64)
    .gas_price(1_000_000_000u64);  // 1 gwei
```

### HD Derivation Path
Standard Ethereum path: `m/44'/60'/0'/0/{index}`

### Encryption
- Key derivation: SHA-256 hash of password
- Cipher: AES-256-GCM with random 12-byte nonce
- Format: `hex(nonce || ciphertext)`

## Git History

- `9173b5d` - Add export functionality for mnemonic and private keys
- `d46328b` - Use legacy transaction format for QFC node
- `317864e` - Fix send transaction for HD wallet
- `e36ee64` - Upgrade to HD wallet (BIP-39/BIP-44)
- Earlier commits: Initial setup, multi-account, network selector
