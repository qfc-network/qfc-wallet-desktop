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

// Wallet state
pub struct WalletState {
    pub wallets: Mutex<Vec<WalletInfo>>,
    pub current_address: Mutex<Option<String>>,
    pub password: Mutex<Option<String>>,
    pub network: Mutex<NetworkConfig>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct WalletInfo {
    pub name: String,
    pub address: String,
    pub encrypted_private_key: String,
    pub encrypted_mnemonic: Option<String>,
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

    // Prepend nonce to ciphertext
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

// Tauri commands
#[tauri::command]
async fn create_wallet(
    name: String,
    password: String,
    state: State<'_, WalletState>,
) -> Result<WalletInfo, String> {
    let wallet = LocalWallet::new(&mut rand::thread_rng());
    let address = format!("{:?}", wallet.address());
    let private_key = hex::encode(wallet.signer().to_bytes());

    let encrypted_pk = encrypt_data(&private_key, &password);

    let wallet_info = WalletInfo {
        name,
        address: address.clone(),
        encrypted_private_key: encrypted_pk,
        encrypted_mnemonic: None,
    };

    {
        let mut wallets = state.wallets.lock().unwrap();
        wallets.push(wallet_info.clone());
    }
    {
        let mut current = state.current_address.lock().unwrap();
        *current = Some(address);
    }
    {
        let mut pwd = state.password.lock().unwrap();
        *pwd = Some(password);
    }

    Ok(wallet_info)
}

#[tauri::command]
async fn import_wallet(
    name: String,
    private_key: String,
    password: String,
    state: State<'_, WalletState>,
) -> Result<WalletInfo, String> {
    let pk = private_key.strip_prefix("0x").unwrap_or(&private_key);
    let wallet: LocalWallet = pk.parse().map_err(|e: WalletError| e.to_string())?;
    let address = format!("{:?}", wallet.address());

    let encrypted_pk = encrypt_data(pk, &password);

    let wallet_info = WalletInfo {
        name,
        address: address.clone(),
        encrypted_private_key: encrypted_pk,
        encrypted_mnemonic: None,
    };

    {
        let mut wallets = state.wallets.lock().unwrap();
        wallets.push(wallet_info.clone());
    }
    {
        let mut current = state.current_address.lock().unwrap();
        *current = Some(address);
    }
    {
        let mut pwd = state.password.lock().unwrap();
        *pwd = Some(password);
    }

    Ok(wallet_info)
}

#[tauri::command]
async fn get_balance(
    address: String,
    state: State<'_, WalletState>,
) -> Result<BalanceResponse, String> {
    // Clone network config before async operations
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
    let (private_key, network) = {
        let password = state.password.lock().unwrap()
            .clone()
            .ok_or("Wallet locked")?;

        let current_address = state.current_address.lock().unwrap()
            .clone()
            .ok_or("No wallet selected")?;

        let wallets = state.wallets.lock().unwrap();
        let wallet_info = wallets.iter()
            .find(|w| w.address == current_address)
            .ok_or("Wallet not found")?
            .clone();

        let private_key = decrypt_data(&wallet_info.encrypted_private_key, &password)?;
        let network = state.network.lock().unwrap().clone();

        (private_key, network)
    };

    let provider = Provider::<Http>::try_from(&network.rpc_url)
        .map_err(|e| e.to_string())?;

    let wallet: LocalWallet = private_key.parse::<LocalWallet>()
        .map_err(|e: WalletError| e.to_string())?
        .with_chain_id(network.chain_id);

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

#[tauri::command]
fn get_wallets(state: State<'_, WalletState>) -> Vec<WalletInfo> {
    state.wallets.lock().unwrap().clone()
}

#[tauri::command]
fn get_current_address(state: State<'_, WalletState>) -> Option<String> {
    state.current_address.lock().unwrap().clone()
}

#[tauri::command]
fn is_unlocked(state: State<'_, WalletState>) -> bool {
    state.password.lock().unwrap().is_some()
}

#[tauri::command]
fn unlock(password: String, state: State<'_, WalletState>) -> Result<bool, String> {
    // Verify password by trying to decrypt any wallet
    let wallets = state.wallets.lock().unwrap();
    if let Some(wallet) = wallets.first() {
        decrypt_data(&wallet.encrypted_private_key, &password)?;
    }
    drop(wallets);

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
fn set_current_address(address: String, state: State<'_, WalletState>) {
    let mut current = state.current_address.lock().unwrap();
    *current = Some(address);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WalletState {
            wallets: Mutex::new(Vec::new()),
            current_address: Mutex::new(None),
            password: Mutex::new(None),
            network: Mutex::new(NetworkConfig::default()),
        })
        .invoke_handler(tauri::generate_handler![
            create_wallet,
            import_wallet,
            get_balance,
            send_transaction,
            get_wallets,
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
