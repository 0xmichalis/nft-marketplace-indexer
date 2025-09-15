import { Seadrop, Sale } from "generated";

import {
  getOrCreateAccount,
  getOrCreateNFTContract,
  createSaleNFTJunctions,
  createAccountJunctionsForSale,
} from "./entities/EntityHelpers";
import { getMintedTokenIdsFromReceipt } from "./utils/Effects";

// SeaDropMint(address indexed nftContract, address indexed minter, address indexed feeRecipient,
//              address payer, uint256 quantityMinted, uint256 unitMintPrice, uint256 feeBps, uint256 dropStageIndex)
// Map to Sale entity using payer as offerer and minter as recipient.
Seadrop.SeaDropMint.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;

  // Ensure Account entities exist for payer (offerer) and minter (recipient)
  await getOrCreateAccount(context, event.params.payer);
  await getOrCreateAccount(context, event.params.minter);

  // Prepare arrays to fit Sale schema. SeaDropMint is a primary sale-style mint.
  // We represent the NFT(s) on the offer side, and payment on consideration side is not tracked here.
  const offerItemTypes: number[] = [];
  const offerTokens: string[] = [];
  const offerIdentifiers: string[] = [];
  const offerAmounts: string[] = [];

  // SeaDropMint doesn't include tokenIds. We fetch them from Transfer logs via an effect
  // and create SaleNFT junctions when available. If none are found (or during preload),
  // we still persist the Sale for aggregate tracking.

  // Consideration arrays left empty as SeaDropMint does not enumerate payment legs in the event signature we index.
  const considerationItemTypes: number[] = [];
  const considerationTokens: string[] = [];
  const considerationIdentifiers: string[] = [];
  const considerationAmounts: string[] = [];
  const considerationRecipients: string[] = [];

  const saleEntity: Sale = {
    id: saleId,
    timestamp,
    transactionHash: event.transaction.hash,
    market: "Seadrop",

    offerer_id: event.params.payer.toLowerCase(),
    recipient_id: event.params.minter.toLowerCase(),

    offerItemTypes,
    offerTokens,
    offerIdentifiers,
    offerAmounts,

    considerationItemTypes,
    considerationTokens,
    considerationIdentifiers,
    considerationAmounts,
    considerationRecipients,
  };

  // If a downstream consumer wants to tie NFTs, they'd need tokenIds; SeaDropMint lacks them.
  // We still ensure the NFT contract exists for reference.
  await getOrCreateNFTContract(context, event.params.nftContract);

  // Try to fetch minted tokenIds from Transfer logs in the same tx
  const mintedTokenIds: string[] = await context.effect(getMintedTokenIdsFromReceipt, {
    txHash: event.transaction.hash,
    nftContract: event.params.nftContract,
  });

  if (!context.isPreload && mintedTokenIds.length > 0) {
    const nftItems = mintedTokenIds.map((tokenId) => ({
      contractAddress: event.params.nftContract.toLowerCase(),
      tokenId,
      itemType: 2,
    }));
    await createSaleNFTJunctions(context, saleId, nftItems, true);
  }

  // Save the Sale entity
  context.Sale.set(saleEntity);

  // Account-level classification using helper
  createAccountJunctionsForSale(context, {
    saleId,
    offererId: event.params.payer.toLowerCase(),
    recipientId: event.params.minter.toLowerCase(),
    // SeaDropMint represents NFTs on the offer side (minted to recipient)
    hasOfferNfts: true,
    hasConsiderationNfts: false,
  });
});
