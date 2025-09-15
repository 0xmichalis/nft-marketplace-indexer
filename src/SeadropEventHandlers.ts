import { Seadrop, Sale, SeadropCounter } from "generated";

import {
  getOrCreateAccount,
  getOrCreateNFTContract,
  createSaleNFTJunctions,
  createAccountBuy,
} from "./entities/EntityHelpers";

// SeaDropMint(address indexed nftContract, address indexed minter, address indexed feeRecipient,
//              address payer, uint256 quantityMinted, uint256 unitMintPrice, uint256 feeBps, uint256 dropStageIndex)
// Map to Sale entity using payer as offerer and minter as recipient.
Seadrop.SeaDropMint.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);

  // Ensure Account entities exist for payer (offerer) and minter (recipient)
  await getOrCreateAccount(context, event.params.payer);
  await getOrCreateAccount(context, event.params.minter);

  // Ensure the NFT contract exists for reference
  await getOrCreateNFTContract(context, event.params.nftContract);

  // We keep track of the total number of tokens minted for this contract
  // to determine the exact token IDs that were minted by this sale.
  let contractCounter = await context.SeadropCounter.get(event.params.nftContract);

  if (!contractCounter) {
    contractCounter = {
      id: event.params.nftContract,
      counter: BigInt(0),
    };
  }

  // Calculate the exact token IDs that were minted
  const quantityMinted = Number(event.params.quantityMinted);
  const startTokenId = contractCounter.counter;
  const mintedTokenIds: string[] = [];

  for (let i = 0; i < quantityMinted; i++) {
    mintedTokenIds.push((startTokenId + BigInt(i)).toString());
  }

  // Update the counter
  const updatedCounter: SeadropCounter = {
    ...contractCounter,
    counter: startTokenId + BigInt(quantityMinted),
  };
  context.SeadropCounter.set(updatedCounter);

  // TODO: In order to determine the actual seller, we need to either check the Transfer logs of
  //  the tx or do an RPC call to the Seadrop contract to determine the creator. Since these are
  //  mint events, this is not a high priority.
  const seller = "0x0000000000000000000000000000000000000000";

  // Create individual sales for each token ID
  for (const tokenId of mintedTokenIds) {
    // Create unique sale ID that includes token ID
    const saleId = `${event.chainId}_${event.transaction.hash}_${tokenId}`;

    // Create offer arrays for single NFT
    const offerItemTypes = [2]; // ERC721
    const offerTokens = [event.params.nftContract];
    const offerIdentifiers = [tokenId];
    const offerAmounts = ["1"]; // Always 1 for ERC721

    // Create consideration arrays for single token payment
    const considerationItemTypes = [0]; // Native ETH
    const considerationTokens = ["0x0000000000000000000000000000000000000000"]; // ETH address
    const considerationIdentifiers = ["0"]; // No identifier for ETH
    const considerationAmounts = [event.params.unitMintPrice.toString()]; // Price per token
    const considerationRecipients = [seller];

    // Create the Sale entity for this individual token
    const saleEntity: Sale = {
      id: saleId,
      timestamp,
      transactionHash: event.transaction.hash,
      market: "Seadrop",

      offerer_id: seller.toLowerCase(),
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

    // Save the Sale entity
    context.Sale.set(saleEntity);

    // Create NFT junction for this individual token
    const nftItems = [
      {
        contractAddress: event.params.nftContract,
        tokenId,
        itemType: 2,
      },
    ];
    await createSaleNFTJunctions(context, saleId, nftItems);

    // Account-level sale classification
    createAccountBuy(context, saleEntity.recipient_id, saleId);
  }
});
