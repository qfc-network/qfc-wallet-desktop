use serde::{Deserialize, Serialize};
use tauri::{Manager, State};
use std::sync::Mutex;
use std::fs;
use std::path::PathBuf;
use ethers::prelude::*;
use ethers::types::transaction::eip2718::TypedTransaction;
use ethers::signers::LocalWallet;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use sha2::{Sha256, Digest};
use rand::Rng;
use bip39::{Mnemonic, Language};
use hdwallet::{KeyChain, DefaultKeyChain, ExtendedPrivKey};

// Contact in address book
#[derive(Clone, Serialize, Deserialize)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub address: String,
}

// Persistent wallet data (saved to disk)
#[derive(Clone, Serialize, Deserialize, Default)]
pub struct WalletData {
    pub encrypted_mnemonic: Option<String>,
    pub accounts: Vec<Account>,
    pub imported_accounts: Vec<ImportedAccount>,
    pub current_address: Option<String>,
    pub network: NetworkConfig,
    pub next_index: u32,
    pub contacts: Vec<Contact>,
}

// Runtime wallet state
pub struct WalletState {
    pub data: Mutex<WalletData>,
    pub password: Mutex<Option<String>>,
    pub data_path: Mutex<Option<PathBuf>>,
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

// Persistence helpers
fn get_wallet_file_path(data_path: &Option<PathBuf>) -> Option<PathBuf> {
    data_path.as_ref().map(|p| p.join("wallet.json"))
}

fn save_wallet_data(state: &WalletState) -> Result<(), String> {
    let data_path = state.data_path.lock().unwrap();
    let file_path = get_wallet_file_path(&data_path)
        .ok_or("Data path not set")?;

    // Ensure directory exists
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let data = state.data.lock().unwrap();
    let json = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
    fs::write(&file_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

fn load_wallet_data(file_path: &PathBuf) -> Option<WalletData> {
    if file_path.exists() {
        let content = fs::read_to_string(file_path).ok()?;
        serde_json::from_str(&content).ok()
    } else {
        None
    }
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

    // Create first account
    let account = Account {
        name: "Account 1".to_string(),
        address: address.clone(),
        index: 0,
    };

    {
        let mut data = state.data.lock().unwrap();
        data.encrypted_mnemonic = Some(encrypted_mnemonic);
        data.accounts = vec![account];
        data.imported_accounts.clear();
        data.next_index = 1;
        data.current_address = Some(address.clone());
    }
    {
        let mut pwd = state.password.lock().unwrap();
        *pwd = Some(password);
    }

    // Save to disk
    save_wallet_data(&state)?;

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

    // Create first account
    let account = Account {
        name: "Account 1".to_string(),
        address: address.clone(),
        index: 0,
    };

    {
        let mut data = state.data.lock().unwrap();
        data.encrypted_mnemonic = Some(encrypted_mnemonic);
        data.accounts = vec![account];
        data.imported_accounts.clear();
        data.next_index = 1;
        data.current_address = Some(address.clone());
    }
    {
        let mut pwd = state.password.lock().unwrap();
        *pwd = Some(password);
    }

    // Save to disk
    save_wallet_data(&state)?;

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

    let (encrypted_mnemonic, index) = {
        let mut data = state.data.lock().unwrap();
        let enc_mn = data.encrypted_mnemonic.clone().ok_or("No wallet created")?;
        let idx = data.next_index;
        data.next_index += 1;
        (enc_mn, idx)
    };

    let mnemonic_phrase = decrypt_data(&encrypted_mnemonic, &password)?;
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
        let mut data = state.data.lock().unwrap();
        data.accounts.push(account.clone());
        data.current_address = Some(address);
    }

    // Save to disk
    save_wallet_data(&state)?;

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

    let account_name = {
        let data = state.data.lock().unwrap();
        if name.is_empty() {
            format!("Imported {}", data.imported_accounts.len() + 1)
        } else {
            name
        }
    };

    let imported = ImportedAccount {
        name: account_name.clone(),
        address: address.clone(),
        encrypted_private_key: encrypted_pk,
    };

    {
        let mut data = state.data.lock().unwrap();
        data.imported_accounts.push(imported);
        data.current_address = Some(address.clone());
    }

    // Save to disk
    save_wallet_data(&state)?;

    Ok(AccountInfo {
        name: account_name,
        address,
        account_type: "imported".to_string(),
        index: None,
    })
}

#[tauri::command]
fn get_accounts(state: State<'_, WalletState>) -> Vec<AccountInfo> {
    let data = state.data.lock().unwrap();

    let mut result: Vec<AccountInfo> = data.accounts.iter().map(|a| AccountInfo {
        name: a.name.clone(),
        address: a.address.clone(),
        account_type: "derived".to_string(),
        index: Some(a.index),
    }).collect();

    result.extend(data.imported_accounts.iter().map(|a| AccountInfo {
        name: a.name.clone(),
        address: a.address.clone(),
        account_type: "imported".to_string(),
        index: None,
    }));

    result
}

#[tauri::command]
fn has_wallet(state: State<'_, WalletState>) -> bool {
    state.data.lock().unwrap().encrypted_mnemonic.is_some()
}

#[tauri::command]
fn get_current_address(state: State<'_, WalletState>) -> Option<String> {
    state.data.lock().unwrap().current_address.clone()
}

#[tauri::command]
fn set_current_address(address: String, state: State<'_, WalletState>) {
    let mut data = state.data.lock().unwrap();
    data.current_address = Some(address);
    drop(data);
    let _ = save_wallet_data(&state);
}

#[tauri::command]
fn is_unlocked(state: State<'_, WalletState>) -> bool {
    state.password.lock().unwrap().is_some()
}

#[tauri::command]
fn unlock(password: String, state: State<'_, WalletState>) -> Result<bool, String> {
    let encrypted_mnemonic = state.data.lock().unwrap()
        .encrypted_mnemonic.clone()
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
    state.data.lock().unwrap().network.clone()
}

#[tauri::command]
fn set_network(network: NetworkConfig, state: State<'_, WalletState>) {
    let mut data = state.data.lock().unwrap();
    data.network = network;
    drop(data);
    let _ = save_wallet_data(&state);
}

#[tauri::command]
fn export_mnemonic(
    password: String,
    state: State<'_, WalletState>,
) -> Result<String, String> {
    let encrypted_mnemonic = state.data.lock().unwrap()
        .encrypted_mnemonic.clone()
        .ok_or("No wallet created")?;

    // Verify password and decrypt mnemonic
    let mnemonic = decrypt_data(&encrypted_mnemonic, &password)?;
    Ok(mnemonic)
}

#[tauri::command]
fn export_private_key(
    address: String,
    password: String,
    state: State<'_, WalletState>,
) -> Result<String, String> {
    let data = state.data.lock().unwrap();

    // First check if it's a derived account
    let account_index = data.accounts.iter()
        .find(|a| a.address.to_lowercase() == address.to_lowercase())
        .map(|a| a.index);

    if let Some(index) = account_index {
        // Derived account - get private key from mnemonic
        let encrypted_mnemonic = data.encrypted_mnemonic.clone().ok_or("No wallet")?;
        drop(data);

        let mnemonic_phrase = decrypt_data(&encrypted_mnemonic, &password)?;
        let wallet = derive_wallet_from_mnemonic(&mnemonic_phrase, index)?;

        // Get the private key bytes and format as hex
        let key_bytes = wallet.signer().to_bytes();
        return Ok(format!("0x{}", hex::encode(key_bytes)));
    }

    // Check imported accounts
    let imp_account = data.imported_accounts.iter()
        .find(|a| a.address.to_lowercase() == address.to_lowercase())
        .ok_or("Account not found")?
        .clone();
    drop(data);

    // Decrypt and return the private key
    let private_key = decrypt_data(&imp_account.encrypted_private_key, &password)?;
    Ok(format!("0x{}", private_key))
}

#[tauri::command]
async fn get_balance(
    address: String,
    state: State<'_, WalletState>,
) -> Result<BalanceResponse, String> {
    let network = {
        state.data.lock().unwrap().network.clone()
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
    let password = state.password.lock().unwrap()
        .clone()
        .ok_or("Wallet locked")?;

    let (current_address, network, accounts, imported_accounts, encrypted_mnemonic) = {
        let data = state.data.lock().unwrap();
        (
            data.current_address.clone().ok_or("No account selected")?,
            data.network.clone(),
            data.accounts.clone(),
            data.imported_accounts.clone(),
            data.encrypted_mnemonic.clone(),
        )
    };

    // Find account info
    let account_index = accounts.iter()
        .find(|a| a.address.to_lowercase() == current_address.to_lowercase())
        .map(|a| a.index);

    let wallet = if let Some(index) = account_index {
        // Derived account
        let encrypted_mnemonic = encrypted_mnemonic.ok_or("No wallet")?;
        let mnemonic_phrase = decrypt_data(&encrypted_mnemonic, &password)?;
        derive_wallet_from_mnemonic(&mnemonic_phrase, index)?
            .with_chain_id(network.chain_id)
    } else {
        // Check imported accounts
        let imp_account = imported_accounts.iter()
            .find(|a| a.address.to_lowercase() == current_address.to_lowercase())
            .ok_or("Account not found")?
            .clone();

        let private_key = decrypt_data(&imp_account.encrypted_private_key, &password)?;
        private_key.parse::<LocalWallet>()
            .map_err(|e: WalletError| e.to_string())?
            .with_chain_id(network.chain_id)
    };

    let provider = Provider::<Http>::try_from(&network.rpc_url)
        .map_err(|e| e.to_string())?;

    let client = SignerMiddleware::new(provider, wallet);

    let to_addr: Address = to.parse().map_err(|e: <Address as std::str::FromStr>::Err| e.to_string())?;
    let value = ethers::utils::parse_ether(&amount).map_err(|e| e.to_string())?;

    // Use legacy transaction format (not EIP-1559)
    // Must use into() to convert to TypedTransaction::Legacy
    let tx: TypedTransaction = TransactionRequest::new()
        .to(to_addr)
        .value(value)
        .gas(21000u64)  // Standard transfer gas
        .gas_price(1_000_000_000u64)  // 1 gwei
        .into();

    let pending_tx = client.send_transaction(tx, None).await.map_err(|e| e.to_string())?;
    let hash = format!("{:?}", pending_tx.tx_hash());

    Ok(TxResponse { hash })
}

#[tauri::command]
fn get_contacts(state: State<'_, WalletState>) -> Vec<Contact> {
    state.data.lock().unwrap().contacts.clone()
}

#[tauri::command]
fn add_contact(
    name: String,
    address: String,
    state: State<'_, WalletState>,
) -> Result<Contact, String> {
    // Validate address format
    if !address.starts_with("0x") || address.len() != 42 {
        return Err("Invalid address format".to_string());
    }

    let id = format!("{:x}", rand::thread_rng().gen::<u64>());

    let contact = Contact {
        id: id.clone(),
        name,
        address,
    };

    {
        let mut data = state.data.lock().unwrap();
        data.contacts.push(contact.clone());
    }

    save_wallet_data(&state)?;
    Ok(contact)
}

#[tauri::command]
fn update_contact(
    id: String,
    name: String,
    address: String,
    state: State<'_, WalletState>,
) -> Result<Contact, String> {
    let mut data = state.data.lock().unwrap();

    let contact = data.contacts.iter_mut()
        .find(|c| c.id == id)
        .ok_or("Contact not found")?;

    contact.name = name;
    contact.address = address;

    let updated = contact.clone();
    drop(data);

    save_wallet_data(&state)?;
    Ok(updated)
}

#[tauri::command]
fn delete_contact(
    id: String,
    state: State<'_, WalletState>,
) -> Result<(), String> {
    {
        let mut data = state.data.lock().unwrap();
        data.contacts.retain(|c| c.id != id);
    }

    save_wallet_data(&state)?;
    Ok(())
}

#[tauri::command]
fn delete_wallet(state: State<'_, WalletState>) -> Result<(), String> {
    // Clear all data
    {
        let mut data = state.data.lock().unwrap();
        *data = WalletData::default();
    }
    {
        let mut pwd = state.password.lock().unwrap();
        *pwd = None;
    }

    // Delete the wallet file
    let data_path = state.data_path.lock().unwrap();
    if let Some(file_path) = get_wallet_file_path(&data_path) {
        if file_path.exists() {
            fs::remove_file(&file_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WalletState {
            data: Mutex::new(WalletData::default()),
            password: Mutex::new(None),
            data_path: Mutex::new(None),
        })
        .setup(|app| {
            // Get app data directory and load wallet
            let app_handle = app.handle();
            if let Some(data_dir) = app_handle.path().app_data_dir().ok() {
                let wallet_file = data_dir.join("wallet.json");

                // Load existing wallet data if available
                if let Some(wallet_data) = load_wallet_data(&wallet_file) {
                    let state = app.state::<WalletState>();
                    let mut data = state.data.lock().unwrap();
                    *data = wallet_data;
                }

                // Store the data path for later saves
                let state = app.state::<WalletState>();
                let mut path = state.data_path.lock().unwrap();
                *path = Some(data_dir);
            }

            Ok(())
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
            export_mnemonic,
            export_private_key,
            get_contacts,
            add_contact,
            update_contact,
            delete_contact,
            delete_wallet,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
