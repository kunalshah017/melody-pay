import { ethers, Wallet } from "ethers";

/**
 * Monad testnet configuration.
 *
 * Key Monad differences from Ethereum:
 * - Charges on gas_limit, NOT gas used (set tight limits!)
 * - Native transfer gas is always 21,000
 * - Minimum base fee: 100 gwei
 * - 10 MON reserve balance required per EOA
 * - 400ms block time, 800ms finality
 */
export const MONAD_CONFIG = {
  chainId: 10143,
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadscan.com",
  minBaseFeeGwei: "0.1", // 100 MON-gwei = 0.1 gwei in ethers notation
};

export interface TxParams {
  to: string;
  value: string; // in MON (e.g., "0.01")
  nonce: number;
  gasLimit?: number;
  maxFeePerGas?: string; // in gwei
  maxPriorityFeePerGas?: string; // in gwei
}

/**
 * Sign a Monad transaction offline.
 * This function needs NO internet. Just a private key and tx params.
 * Returns the serialized signed transaction (hex string starting with 0x).
 *
 * NOTE: On Monad, gas_limit directly determines cost. We hardcode 21000
 * for native transfers since this is always correct and minimizes user cost.
 */
export async function signTransaction(
  params: TxParams,
  privateKey: string
): Promise<string> {
  const wallet = new Wallet(privateKey);

  const tx = {
    to: params.to,
    value: ethers.parseEther(params.value),
    chainId: MONAD_CONFIG.chainId,
    nonce: params.nonce,
    // Hardcode 21000 for native transfers — Monad charges on gas_limit!
    gasLimit: params.gasLimit || 21000,
    maxFeePerGas: ethers.parseUnits(params.maxFeePerGas || "1", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits(
      params.maxPriorityFeePerGas || "1",
      "gwei"
    ),
    type: 2,
  };

  return await wallet.signTransaction(tx);
}

/**
 * Broadcast a signed transaction to Monad testnet.
 * Requires internet. Used by the Relay device.
 */
export async function broadcastTransaction(signedTx: string): Promise<string> {
  const provider = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
  const response = await provider.broadcastTransaction(signedTx);
  return response.hash;
}

/**
 * Get the current nonce for an address.
 */
export async function getNonce(address: string): Promise<number> {
  const provider = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
  return await provider.getTransactionCount(address);
}

/**
 * Get wallet address from a private key (no internet needed).
 */
export function getAddress(privateKey: string): string {
  return new Wallet(privateKey).address;
}

/**
 * Get balance of an address.
 */
export async function getBalance(address: string): Promise<string> {
  const provider = new ethers.JsonRpcProvider(MONAD_CONFIG.rpcUrl);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}
