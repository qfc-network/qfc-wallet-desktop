use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;
use ethers::prelude::*;
use ethers::signers::LocalWallet;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use sha2::{Sha256, Digest};
use rand::Rng;
use bip39::{Mnemonic, Language};
use hdwallet::{KeyChain, DefaultKeyChain, ExtendedPrivKey};

// Wallet state
pub struct WalletState {
    pub encrypted_mnemonic: Mutex<Option<String>>,
    pub accounts: Mutex<Vec<Account>>,
    pub imported_accounts: Mutex<Vec<ImportedAccount>>,
    pub current_address: Mutex<Option<String>>,
    pub password: Mutex<Option<String>>,
    pub network: Mutex<NetworkConfig>,
    pub next_index: Mutex<u32>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Account {
    pub name: String,
    pub address: String,
    pub index: u32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ImportedAccount {
    pub name: String,
    pub address: String,
    pub encrypted_private_key: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct AccountInfo {
    pub name: String,
    pub address: String,
    pub account_type: String, // "derived" or "imported"
    pub index: Option<u32>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub name: String,
    pub chain_id: u64,
    pub rpc_url: String,
    pub symbol: String,
}

impl Default for NetworkConfig {
    fn default() -> Self {
        Self {
            name: "QFC Local".to_string(),
            chain_id: 9000,
            rpc_url: "http://127.0.0.1:8545".to_string(),
            symbol: "QFC".to_string(),
        }
    }
}

#[derive(Serialize)]
pub struct CreateWalletResponse {
    pub mnemonic: String,
    pub address: String,
}

#[derive(Serialize)]
pub struct BalanceResponse {
    pub balance: String,
    pub formatted: String,
}

#[derive(Serialize)]
pub struct TxResponse {
    pub hash: String,
}

// Encryption helpers
fn derive_key(password: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hasher.finalize().into()
}

fn encrypt_data(data: &str, password: &str) -> String {
    let key = derive_key(password);
    let cipher = Aes256Gcm::new_from_slice(&key).unwrap();
    let mut rng = rand::thread_rng();
    let nonce_bytes: [u8; 12] = rng.gen();
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, data.as_bytes()).unwrap();

    let mut result = nonce_bytes.to_vec();
    result.extend(ciphertext);
    hex::encode(result)
}

fn decrypt_data(encrypted: &str, password: &str) -> Result<String, String> {
    let key = derive_key(password);
    let cipher = Aes256Gcm::new_from_slice(&key).unwrap();

    let data = hex::decode(encrypted).map_err(|e| e.to_string())?;
    if data.len() < 12 {
        return Err("Invalid encrypted data".to_string());
    }

    let (nonce_bytes, ciphertext) = data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed - wrong password?")?;

    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

// Derive wallet from mnemonic at specific index
fn derive_wallet_from_mnemonic(mnemonic_phrase: &str, index: u32) -> Result<LocalWallet, String> {
    let mnemonic = Mnemonic::from_phrase(mnemonic_phrase, Language::English)
        .map_err(|e| format!("Invalid mnemonic: {:?}", e))?;

    let seed = bip39::Seed::new(&mnemonic, "");

    let master_key = ExtendedPrivKey::with_seed(seed.as_bytes())
        .map_err(|e| format!("Failed to create master key: {:?}", e))?;

    let key_chain = DefaultKeyChain::new(master_key);

    // BIP-44 path: m/44'/60'/0'/0/index
    let path = format!("m/44'/60'/0'/0/{}", index);
    let (derived_key, _) = key_chain.derive_private_key(path.into())
        .map_err(|e| format!("Failed to derive key: {:?}", e))?;

    let key_bytes = derived_key.private_key.secret_bytes();
    let wallet = LocalWallet::from_bytes(&key_bytes)
        .map_err(|e| format!("Failed to create wallet: {}", e))?;

    Ok(wallet)
}

// Tauri commands

#[tauri::command]
fn create_wallet(
    password: String,
    state: State<'_, WalletState>,
) -> Result<CreateWalletResponse, String> {
    // Generate new mnemonic (12 words)
    let mnemonic = Mnemonic::new(bip39::MnemonicType::Words12, Language::English);
    let mnemonic_phrase = mnemonic.phrase().to_string();

    // Derive first account
    let wallet = derive_wallet_from_mnemonic(&mnemonic_phrase, 0)?;
    let address = format!("{:?}", wallet.address());

    // Encrypt and store mnemonic
    let encrypted_mnemonic = encrypt_data(&mnemonic_phrase, &password);

    {
        let mut enc_mn = state.encrypted_mnemonic.lock().unwrap();
        *enc_mn = Some(encrypted_mnemonic);
    }

    // Create first account
    let account = Account {
        name: "Account 1".to_string(),
        address: address.clone(),
        index: 0,
    };

    {
        let mut accounts = state.accounts.lock().unwrap();
        accounts.push(account);
    }
    {
        let mut next_idx = state.next_index.lock().unwrap();
        *next_idx = 1;
    }
    {
        let mut current = state.current_address.lock().unwrap();
        *current = Some(address.clone());
    }
    {
        let mut pwd = state.password.lock().unwrap();
        *pwd = Some(password);
    }

    Ok(CreateWalletResponse {
        mnemonic: mnemonic_phrase,
        address,
    })
}

#[tauri::command]
fn import_mnemonic(
    mnemonic_phrase: String,
    password: String,
    state: State<'_, WalletState>,
) -> Result<String, String> {
    // Validate mnemonic
    let _ = Mnemonic::from_phrase(&mnemonic_phrase, Language::English)
        .map_err(|_| "Invalid mnemonic phrase")?;

    // Derive first account
    let wallet = derive_wallet_from_mnemonic(&mnemonic_phrase, 0)?;
    let address = format!("{:?}", wallet.address());

    // Encrypt and store mnemonic
    let encrypted_mnemonic = encrypt_data(&mnemonic_phrase, &password);

    {
        let mut enc_mn = state.encrypted_mnemonic.lock().unwrap();
        *enc_mn = Some(encrypted_mnemonic);
    }

    // Create first account
    let account = Account {
        name: "Account 1".to_string(),
        address: address.clone(),
        index: 0,
    };

    {
        let mut accounts = state.accounts.lock().unwrap();
        accounts.clear();
        accounts.push(account);
    }
    {
        let mut imported = state.imported_accounts.lock().unwrap();
        imported.clear();
    }
    {
        let mut next_idx = state.next_index.lock().unwrap();
        *next_idx = 1;
    }
    {
        let mut current = state.current_address.lock().unwrap();
        *current = Some(address.clone());
    }
    {
        let mut pwd = state.password.lock().unwrap();
        *pwd = Some(password);
    }

    Ok(address)
}

#[tauri::command]
fn derive_account(
    name: String,
    state: State<'_, WalletState>,
) -> Result<Account, String> {
    let password = state.password.lock().unwrap()
        .clone()
        .ok_or("Wallet locked")?;

    let encrypted_mnemonic = state.encrypted_mnemonic.lock().unwrap()
        .clone()
        .ok_or("No wallet created")?;

    let mnemonic_phrase = decrypt_data(&encrypted_mnemonic, &password)?;

    let index = {
        let mut next_idx = state.next_index.lock().unwrap();
        let idx = *next_idx;
        *next_idx += 1;
        idx
    };

    let wallet = derive_wallet_from_mnemonic(&mnemonic_phrase, index)?;
    let address = format!("{:?}", wallet.address());

    let account_name = if name.is_empty() {
        format!("Account {}", index + 1)
    } else {
        name
    };

    let account = Account {
        name: account_name,
        address: address.clone(),
        index,
    };

    {
        let mut accounts = state.accounts.lock().unwrap();
        accounts.push(account.clone());
    }
    {
        let mut current = state.current_address.lock().unwrap();
        *current = Some(address);
    }

    Ok(account)
}

#[tauri::command]
fn import_private_key(
    name: String,
    private_key: String,
    state: State<'_, WalletState>,
) -> Result<AccountInfo, String> {
    let password = state.password.lock().unwrap()
        .clone()
        .ok_or("Wallet locked")?;

    let pk = private_key.strip_prefix("0x").unwrap_or(&private_key);
    let wallet: LocalWallet = pk.parse().map_err(|e: WalletError| e.to_string())?;
    let address = format!("{:?}", wallet.address());

    let encrypted_pk = encrypt_data(pk, &password);

    let account_name = if name.is_empty() {
        format!("Imported {}", state.imported_accounts.lock().unwrap().len() + 1)
    } else {
        name
    };

    let imported = ImportedAccount {
        name: account_name.clone(),
        address: address.clone(),
        encrypted_private_key: encrypted_pk,
    };

    {
        let mut imported_accounts = state.imported_accounts.lock().unwrap();
        imported_accounts.push(imported);
    }
    {
        let mut current = state.current_address.lock().unwrap();
        *current = Some(address.clone());
    }

    Ok(AccountInfo {
        name: account_name,
        address,
        account_type: "imported".to_string(),
        index: None,
    })
}

#[tauri::command]
fn get_accounts(state: State<'_, WalletState>) -> Vec<AccountInfo> {
    let accounts = state.accounts.lock().unwrap();
    let imported = state.imported_accounts.lock().unwrap();

    let mut result: Vec<AccountInfo> = accounts.iter().map(|a| AccountInfo {
        name: a.name.clone(),
        address: a.address.clone(),
        account_type: "derived".to_string(),
        index: Some(a.index),
    }).collect();

    result.extend(imported.iter().map(|a| AccountInfo {
        name: a.name.clone(),
        address: a.address.clone(),
        account_type: "imported".to_string(),
        index: None,
    }));

    result
}

#[tauri::command]
fn has_wallet(state: State<'_, WalletState>) -> bool {
    state.encrypted_mnemonic.lock().unwrap().is_some()
}

#[tauri::command]
fn get_current_address(state: State<'_, WalletState>) -> Option<String> {
    state.current_address.lock().unwrap().clone()
}

#[tauri::command]
fn set_current_address(address: String, state: State<'_, WalletState>) {
    let mut current = state.current_address.lock().unwrap();
    *current = Some(address);
}

#[tauri::command]
fn is_unlocked(state: State<'_, WalletState>) -> bool {
    state.password.lock().unwrap().is_some()
}

#[tauri::command]
fn unlock(password: String, state: State<'_, WalletState>) -> Result<bool, String> {
    let encrypted_mnemonic = state.encrypted_mnemonic.lock().unwrap()
        .clone()
        .ok_or("No wallet created")?;

    // Verify password by trying to decrypt
    decrypt_data(&encrypted_mnemonic, &password)?;

    let mut pwd = state.password.lock().unwrap();
    *pwd = Some(password);
    Ok(true)
}

#[tauri::command]
fn lock(state: State<'_, WalletState>) {
    let mut pwd = state.password.lock().unwrap();
    *pwd = None;
}

#[tauri::command]
fn get_network(state: State<'_, WalletState>) -> NetworkConfig {
    state.network.lock().unwrap().clone()
}

#[tauri::command]
fn set_network(network: NetworkConfig, state: State<'_, WalletState>) {
    let mut net = state.network.lock().unwrap();
    *net = network;
}

#[tauri::command]
async fn get_balance(
    address: String,
    state: State<'_, WalletState>,
) -> Result<BalanceResponse, String> {
    let network = {
        state.network.lock().unwrap().clone()
    };

    let provider = Provider::<Http>::try_from(&network.rpc_url)
        .map_err(|e| e.to_string())?;

    let addr: Address = address.parse().map_err(|e: <Address as std::str::FromStr>::Err| e.to_string())?;
    let balance = provider.get_balance(addr, None).await.map_err(|e| e.to_string())?;

    let formatted = ethers::utils::format_ether(balance);

    Ok(BalanceResponse {
        balance: balance.to_string(),
        formatted,
    })
}

#[tauri::command]
async fn send_transaction(
    to: String,
    amount: String,
    state: State<'_, WalletState>,
) -> Result<TxResponse, String> {
    // Extract all needed data before any await points
    let (wallet, network) = {
        let password = state.password.lock().unwrap()
            .clone()
            .ok_or("Wallet locked")?;

        let current_address = state.current_address.lock().unwrap()
            .clone()
            .ok_or("No account selected")?;

        let network = state.network.lock().unwrap().clone();

        // Check if it's a derived account
        let accounts = state.accounts.lock().unwrap();
        if let Some(account) = accounts.iter().find(|a| a.address == current_address) {
            let encrypted_mnemonic = state.encrypted_mnemonic.lock().unwrap()
                .clone()
                .ok_or("No wallet")?;
            let mnemonic_phrase = decrypt_data(&encrypted_mnemonic, &password)?;
            let wallet = derive_wallet_from_mnemonic(&mnemonic_phrase, account.index)?
                .with_chain_id(network.chain_id);
            (wallet, network)
        } else {
            // Check imported accounts
            let imported = state.imported_accounts.lock().unwrap();
            let imp_account = imported.iter()
                .find(|a| a.address == current_address)
                .ok_or("Account not found")?;

            let private_key = decrypt_data(&imp_account.encrypted_private_key, &password)?;
            let wallet = private_key.parse::<LocalWallet>()
                .map_err(|e: WalletError| e.to_string())?
                .with_chain_id(network.chain_id);
            (wallet, network)
        }
    };

    let provider = Provider::<Http>::try_from(&network.rpc_url)
        .map_err(|e| e.to_string())?;

    let client = SignerMiddleware::new(provider, wallet);

    let to_addr: Address = to.parse().map_err(|e: <Address as std::str::FromStr>::Err| e.to_string())?;
    let value = ethers::utils::parse_ether(&amount).map_err(|e| e.to_string())?;

    let tx = TransactionRequest::new()
        .to(to_addr)
        .value(value);

    let pending_tx = client.send_transaction(tx, None).await.map_err(|e| e.to_string())?;
    let hash = format!("{:?}", pending_tx.tx_hash());

    Ok(TxResponse { hash })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WalletState {
            encrypted_mnemonic: Mutex::new(None),
            accounts: Mutex::new(Vec::new()),
            imported_accounts: Mutex::new(Vec::new()),
            current_address: Mutex::new(None),
            password: Mutex::new(None),
            network: Mutex::new(NetworkConfig::default()),
            next_index: Mutex::new(0),
        })
        .invoke_handler(tauri::generate_handler![
            create_wallet,
            import_mnemonic,
            derive_account,
            import_private_key,
            get_accounts,
            has_wallet,
            get_balance,
            send_transaction,
            get_current_address,
            set_current_address,
            is_unlocked,
            unlock,
            lock,
            get_network,
            set_network,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
