import { transactionUrl } from "@/shared/lib/chains";
import { shortHex } from "@/shared/lib/format";

/** A shortened transaction hash, linked to the chain's explorer when the shop knows one. */
export function TransactionLink({ chainId, txHash }: { chainId: number; txHash: string }) {
  const url = transactionUrl(chainId, txHash);

  if (!url) return <span className="font-mono text-sm">{shortHex(txHash)}</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-sm text-sky-ink underline underline-offset-4"
    >
      {shortHex(txHash)}
    </a>
  );
}
