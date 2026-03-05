# QFC Wallet Desktop

Native desktop wallet for QFC Network, built with Tauri 2 + React.

## Features

- Create and import wallets (BIP-39 mnemonic / private key)
- HD wallet with multiple account derivation (BIP-44)
- Send and receive QFC tokens
- QR code for address sharing
- Address book for saved contacts
- AES-256-GCM encrypted key storage
- Network switching (Local / Testnet / Mainnet)

## Development

```bash
# Install dependencies
npm install

# Start dev mode (Tauri + Vite hot reload)
npm run tauri dev
```

### Prerequisites

- Node.js 22+
- Rust stable toolchain
- Platform dependencies:
  - **Linux**: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Visual Studio Build Tools

## Build

```bash
# Build for current platform
npm run tauri build
```

Output: `.dmg` (macOS) / `.msi` (Windows) / `.AppImage` + `.deb` (Linux)

## Release

Push a version tag to trigger automated builds for all platforms:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend**: Tauri 2 + Rust (ethers-rs, aes-gcm, tiny-bip39)
- **Platforms**: macOS (Intel + Apple Silicon), Windows, Linux

## Network Configuration

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Local | 9000 (0x2328) | http://127.0.0.1:8545 |
| Testnet | 9000 (0x2328) | https://rpc.testnet.qfc.network |
| Mainnet | 9001 (0x2329) | https://rpc.qfc.network |

## License

MIT
