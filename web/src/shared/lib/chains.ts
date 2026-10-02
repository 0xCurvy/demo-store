/** Names and block explorers for the networks the shop is likely to run on. */
interface Chain {
  name: string;
  explorer?: string;
  /** Test networks carry tokens without value. */
  testnet: boolean;
}

const CHAINS: Record<number, Chain> = {
  1: { name: "Ethereum", explorer: "https://etherscan.io", testnet: false },
  10: { name: "Optimism", explorer: "https://optimistic.etherscan.io", testnet: false },
  100: { name: "Gnosis", explorer: "https://gnosisscan.io", testnet: false },
  137: { name: "Polygon", explorer: "https://polygonscan.com", testnet: false },
  8453: { name: "Base", explorer: "https://basescan.org", testnet: false },
  42161: { name: "Arbitrum One", explorer: "https://arbiscan.io", testnet: false },
  421614: { name: "Arbitrum Sepolia", explorer: "https://sepolia.arbiscan.io", testnet: true },
  11155111: { name: "Ethereum Sepolia", explorer: "https://sepolia.etherscan.io", testnet: true },
  31337: { name: "Local Anvil", testnet: true },
};

export function chainInfo(chainId: number): Chain {
  return CHAINS[chainId] ?? { name: `Chain ${chainId}`, testnet: false };
}

/** A link to the transaction on the chain's explorer, if the shop knows one. */
export function transactionUrl(chainId: number, txHash: string): string | null {
  const explorer = chainInfo(chainId).explorer;

  return explorer ? `${explorer}/tx/${txHash}` : null;
}
