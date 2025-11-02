import type { FhevmInstance } from "@/fhevm/fhevmTypes";

/**
 * FHE 加密工具 - 支持真正的 FHE 和 Mock
 * 自动根据网络选择：本地使用 Mock，Sepolia 使用真正的 FHE
 */

export interface EncryptedData {
  encryptedAmount: string;
  proof: string;
}

/**
 * 使用 FHEVM 实例加密投资金额
 * @param fhevmInstance - FHEVM 实例（来自 useFhevmProvider）
 * @param contractAddress - 合约地址
 * @param userAddress - 用户地址
 * @param amount - 要加密的金额（wei）
 * @returns 加密后的数据和 proof
 */
export async function encryptInvestmentAmount(
  fhevmInstance: FhevmInstance,
  contractAddress: string,
  userAddress: string,
  amount: bigint
): Promise<EncryptedData> {
  try {
    // 使用 FHEVM 实例创建加密输入
    // 注意：这里使用 euint64，需要确保金额不超过 2^64
    const input = fhevmInstance.createEncryptedInput(contractAddress, userAddress);
    input.add64(Number(amount));
    
    const encrypted = await input.encrypt();
    
    return {
      encryptedAmount: `0x${Buffer.from(encrypted.handles[0]).toString('hex')}`,
      proof: `0x${Buffer.from(encrypted.inputProof).toString('hex')}`,
    };
  } catch (error) {
    console.error("Error encrypting amount:", error);
    throw new Error(`Failed to encrypt amount: ${error}`);
  }
}

/**
 * 解密投资金额
 * 注意：需要先为用户生成解密签名，并且需要使用 Relayer SDK 的解密功能
 * @param fhevmInstance - FHEVM 实例
 * @param encryptedHandle - 链上加密数据的句柄（BigInt）
 * @param contractAddress - 合约地址
 * @param userAddress - 用户地址
 * @returns 解密后的金额
 */
export async function decryptInvestmentAmount(
  fhevmInstance: FhevmInstance,
  encryptedHandle: bigint,
  contractAddress: string,
  userAddress: string
): Promise<bigint> {
  // TODO: 实现解密功能
  // 需要使用 FhevmDecryptionSignature 和 instance.getDecryptedValue()
  console.warn("Decryption not yet implemented");
  throw new Error("Decryption functionality is not yet implemented. Please check the FhevmDecryptionSignature module.");
}

/**
 * 生成解密签名消息
 */
export function getDecryptionMessage(propertyId: number, userAddress: string): string {
  return `Decrypt investment amount for property ${propertyId}\nAddress: ${userAddress}\nTimestamp: ${Date.now()}`;
}

/**
 * 生成投资签名消息
 */
export function getInvestmentMessage(
  propertyId: number, 
  amount: string, 
  userAddress: string
): string {
  return `Invest ${amount} ETH in property ${propertyId}\nAddress: ${userAddress}\nTimestamp: ${Date.now()}`;
}
