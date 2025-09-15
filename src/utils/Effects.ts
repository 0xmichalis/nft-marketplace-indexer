import { S, experimental_createEffect } from "envio";

export const getMintedTokenIdsFromReceipt = experimental_createEffect(
  {
    name: "getMintedTokenIdsFromReceipt",
    input: {
      txHash: S.string,
      nftContract: S.string,
      rpcUrl: S.optional(S.string),
    },
    output: S.array(S.string),
  },
  async ({ input }) => {
    const rpcUrl = input.rpcUrl ?? process.env.ETH_RPC_URL ?? "https://cloudflare-eth.com";
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [input.txHash],
    };

    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) return [];
    const json: any = await res.json();
    const receipt = json?.result;
    if (!receipt || !Array.isArray(receipt.logs)) return [];

    const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const target = input.nftContract.toLowerCase();

    const tokenIds: string[] = [];
    for (const log of receipt.logs) {
      if ((log.address as string)?.toLowerCase() !== target) continue;
      const topics: string[] = log.topics ?? [];
      if (topics.length >= 4 && (topics[0] as string).toLowerCase() === TRANSFER_TOPIC) {
        // ERC721 Transfer(address,address,uint256) → tokenId in topics[3]
        const tokenIdHex = topics[3];
        if (typeof tokenIdHex === "string") {
          try {
            const tokenId = BigInt(tokenIdHex).toString();
            tokenIds.push(tokenId);
          } catch {}
        }
      }
    }

    return tokenIds;
  }
);
