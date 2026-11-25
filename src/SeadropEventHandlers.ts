import { indexer, type Sale, type SeadropCounter } from "envio";

import {
  getOrCreateAccount,
  getOrCreateNFTContract,
  getOrCreateNFTToken,
  createSaleNFTJunction,
  createAccountBuy,
} from "./entities/EntityHelpers";

// Limit one mint's expansion to the maximum length of a JavaScript array.
const MAX_MINT_QUANTITY = 0xffff_ffffn;

indexer.onEvent({ contract: "Seadrop", event: "SeaDropMint" }, async ({ event, context }) => {
  const { payer, minter, quantityMinted, unitMintPrice } = event.params;
  if (quantityMinted < 0n || quantityMinted > MAX_MINT_QUANTITY) {
    throw new RangeError(`SeaDrop mint quantity must be between 0 and ${MAX_MINT_QUANTITY}`);
  }

  const timestamp = BigInt(event.block.timestamp);

  await getOrCreateAccount(context, payer);
  const minterAccount = await getOrCreateAccount(context, minter);

  // Replace MFC's SeaDropXArtBlocksShim contract with the actual ArtBlocks contract
  const isOvertureShim = event.params.nftContract === "0x8Cfbe812a0CFEB6775900534389Ca72eD27741e3";
  const nftContract = isOvertureShim
    ? "0x000000DAb303a194b3F55d4702B24740ad5a2F00"
    : event.params.nftContract;

  const contract = await getOrCreateNFTContract(context, nftContract);

  // We keep track of the total number of tokens minted for this contract
  // to determine the exact token IDs that were minted by this sale.
  let contractCounter = await context.SeadropCounter.get(nftContract);

  if (!contractCounter) {
    contractCounter = {
      id: nftContract,
      counter: isOvertureShim ? BigInt(1) : BigInt(0),
    };
  }

  const startTokenId = contractCounter.counter;
  const endTokenId = startTokenId + quantityMinted;

  // Update the counter
  const updatedCounter: SeadropCounter = {
    ...contractCounter,
    counter: endTokenId,
  };
  context.SeadropCounter.set(updatedCounter);

  // TODO: In order to determine the actual seller, we need to either check the Transfer logs of
  //  the tx or do an RPC call to the Seadrop contract to determine the creator. Since these are
  //  mint events, this is not a high priority.
  const seller = "0x0000000000000000000000000000000000000000";
  const pricePerToken = unitMintPrice.toString();

  // The counter is the next token ID, so this mint owns [startTokenId, endTokenId).
  for (let nextTokenId = startTokenId; nextTokenId < endTokenId; nextTokenId += 1n) {
    const tokenId = nextTokenId.toString();
    const saleId = `${event.chainId}_${event.transaction.hash}_${tokenId}`;

    const saleEntity: Sale = {
      id: saleId,
      timestamp,
      transactionHash: event.transaction.hash,
      market: "Seadrop",

      offerer_id: seller,
      recipient_id: minterAccount.id,

      offerItemTypes: [2], // ERC721
      offerTokens: [nftContract],
      offerIdentifiers: [tokenId],
      offerAmounts: ["1"],

      considerationItemTypes: [0], // Native ETH
      considerationTokens: ["0x0000000000000000000000000000000000000000"],
      considerationIdentifiers: ["0"],
      considerationAmounts: [pricePerToken],
      considerationRecipients: [seller],
    };

    context.Sale.set(saleEntity);
    const token = await getOrCreateNFTToken(context, contract, tokenId);
    createSaleNFTJunction(context, saleId, token);
    createAccountBuy(context, saleEntity.recipient_id, saleId);
  }
});
