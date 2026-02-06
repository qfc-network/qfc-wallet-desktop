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
  - qrcode.react - QR code generation

## Project Structure

```
qfc-wallet-desktop/
├── src/                    # React frontend
│   ├── App.tsx            # Main app with routing
│   ├── store.ts           # Zustand state management
│   └── pages/
│       ├── Home.tsx       # Main wallet view (balance, quick access)
│       ├── CreateWallet.tsx   # Wallet creation & import
│       ├── Unlock.tsx     # Password unlock screen
│       ├── Send.tsx       # Send QFC transaction
│       ├── Receive.tsx    # Receive with QR code
│       ├── History.tsx    # Transaction history from explorer
│       ├── Accounts.tsx   # Multi-account management
│       ├── AddressBook.tsx # Contact management
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
- [x] **Persistent storage** - Wallet data saved to disk, survives restart

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
- [x] **Transaction history** - View sent/received transactions from explorer API

### Receive
- [x] **QR code display** - Scan to get address
- [x] Copy address to clipboard
- [x] Share address (on supported platforms)

### Address Book
- [x] **Contact management** - Add, edit, delete contacts
- [x] Quick send to contacts
- [x] Persistent storage with wallet data

### Network
- [x] Network selector (Local/Testnet/Mainnet)
- [x] Custom RPC endpoint support
- [x] Chain ID configuration
- [x] Network settings persisted

### Security & Export
- [x] Export recovery phrase (with password verification)
- [x] Export private key for any account
- [x] Hidden by default, eye toggle to reveal
- [x] Copy to clipboard with warnings
- [x] Delete wallet option

### UI/UX
- [x] Clean, modern UI with gradient theme
- [x] Responsive design
- [x] Loading states and error handling
- [x] Copy address to clipboard
- [x] Max amount button (leaves gas reserve)
- [x] Quick access section on home page

## Features TODO

### High Priority
- [x] Transaction history - Uses qfc-explorer API
- [ ] Token support (ERC-20) - Need to add contract interaction

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
- [ ] Error boundary components
- [ ] Unit tests for Rust commands
- [ ] E2E tests

## Implementation Notes

### Transaction History
Uses the qfc-explorer API at `/api/address/{address}` to fetch transaction history.
- Requires qfc-explorer running at http://localhost:3000
- Shows both sent and received transactions
- Displays amount, status, timestamp, and links to explorer

### Token Support (ERC-20)
Need to implement:
1. Token balance query via `balanceOf(address)` call
2. Token transfer via `transfer(to, amount)` call
3. Token list management (add/remove tokens)
4. Approval flow for dApps

## Build & Run

```bash
# Install dependencies
npm install

# Development
npm run tauri dev

# Build for production
npm run tauri build
```

## Data Storage

Wallet data stored at:
- macOS: `~/Library/Application Support/com.qfc.wallet-desktop/wallet.json`
- Windows: `%APPDATA%/com.qfc.wallet-desktop/wallet.json`
- Linux: `~/.config/com.qfc.wallet-desktop/wallet.json`

Data includes (all sensitive data encrypted):
- Encrypted mnemonic
- Derived accounts (name, address, index)
- Imported accounts (name, address, encrypted private key)
- Contacts (name, address)
- Network settings
- Current address selection

## Important Notes

### Transaction Format
QFC node now supports both:
1. **Ethereum format** (RLP + secp256k1) - Used by ethers.js/ethers-rs wallets
2. **QFC native format** (Borsh + Ed25519) - Original QFC format

The desktop wallet uses ethers-rs which sends Ethereum-formatted transactions.
The qfc-core RPC server (`eth_sendRawTransaction`) auto-detects the format:
- First tries to decode as QFC native (Borsh)
- Falls back to Ethereum format (RLP) if native fails
- Recovers sender address from secp256k1 signature
- Converts to internal QFC transaction format for execution

Must use legacy transactions (not EIP-1559) and set `gas` and `gas_price` explicitly:
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

## Git History (Recent)

- `50574f3` - Add receive QR code, address book features
- `11aa162` - Add wallet data persistence
- `a072ed7` - Add CLAUDE.md with development notes
- `9173b5d` - Add export functionality for mnemonic and private keys
- `d46328b` - Use legacy transaction format for QFC node
- `317864e` - Fix send transaction for HD wallet
- `e36ee64` - Upgrade to HD wallet (BIP-39/BIP-44)
