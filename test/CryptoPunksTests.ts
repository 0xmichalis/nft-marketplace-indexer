import assert from "assert";
import { TestHelpers } from "generated";

const { MockDb, CryptoPunks } = TestHelpers;

describe("CryptoPunks PunkBought event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Test addresses
  const BUYER_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const SELLER_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const CRYPTOPUNKS_CONTRACT = "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  it("Sale is created correctly for PunkBought event", async () => {
    // Creating mock for CryptoPunks PunkBought event
    const event = CryptoPunks.PunkBought.createMockEvent({
      tokenId: 123n,
      value: 1000000000000000000n, // 1 ETH in wei
      fromAddress: SELLER_ADDRESS,
      toAddress: BUYER_ADDRESS,
      mockEventData: {
        block: {
          number: 18650000,
          timestamp: 1715000000,
        },
        transaction: {
          hash: "0xtxhashpunk1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        },
        chainId: 1,
        logIndex: 1,
        srcAddress: CRYPTOPUNKS_CONTRACT,
      },
    });

    // Processing the event
    const mockDbUpdated = await CryptoPunks.PunkBought.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entities from the mock database
    const saleId = `${event.chainId}_${event.transaction.hash}`;
    const actualSale = mockDbUpdated.entities.Sale.get(saleId);
    const actualBuyerAccount = mockDbUpdated.entities.Account.get(BUYER_ADDRESS.toLowerCase());
    const actualSellerAccount = mockDbUpdated.entities.Account.get(SELLER_ADDRESS.toLowerCase());
    const actualNFTContract = mockDbUpdated.entities.NFTContract.get(
      CRYPTOPUNKS_CONTRACT.toLowerCase()
    );
    const actualNFTToken = mockDbUpdated.entities.NFTToken.get(
      `${CRYPTOPUNKS_CONTRACT.toLowerCase()}:123`
    );

    // Assertions for the Sale entity
    assert(actualSale, "Sale should be created");
    assert.equal(actualSale.id, saleId);
    assert.equal(actualSale.timestamp, BigInt(1715000000));
    assert.equal(actualSale.transactionHash, event.transaction.hash);
    assert.equal(actualSale.market, "CryptoPunks");
    assert.equal(actualSale.offerer_id, SELLER_ADDRESS.toLowerCase());
    assert.equal(actualSale.recipient_id, BUYER_ADDRESS.toLowerCase());

    // Check NFT data via junction entity
    const allSaleNfts = mockDbUpdated.entities.SaleNFT.getAll();
    const saleNfts = allSaleNfts.filter((sn: any) => sn.sale_id === saleId);
    assert.equal(saleNfts.length, 1, "Sale should have one NFT");
    assert.equal(saleNfts[0].nftToken_id, `${CRYPTOPUNKS_CONTRACT.toLowerCase()}:123`);

    // Assertions for offer items (NFT being sold)
    assert.equal(actualSale.offerItemTypes.length, 1);
    assert.equal(actualSale.offerItemTypes[0], 2); // ERC721 per indexer convention
    assert.equal(actualSale.offerTokens.length, 1);
    assert.equal(actualSale.offerTokens[0], CRYPTOPUNKS_CONTRACT);
    assert.equal(actualSale.offerIdentifiers.length, 1);
    assert.equal(actualSale.offerIdentifiers[0], "123");
    assert.equal(actualSale.offerAmounts.length, 1);
    assert.equal(actualSale.offerAmounts[0], "1");

    // Assertions for consideration items (ETH payment)
    assert.equal(actualSale.considerationItemTypes.length, 1);
    assert.equal(actualSale.considerationItemTypes[0], 0); // ETH
    assert.equal(actualSale.considerationTokens.length, 1);
    assert.equal(actualSale.considerationTokens[0], ZERO_ADDRESS);
    assert.equal(actualSale.considerationIdentifiers.length, 1);
    assert.equal(actualSale.considerationIdentifiers[0], "0");
    assert.equal(actualSale.considerationAmounts.length, 1);
    assert.equal(actualSale.considerationAmounts[0], "1000000000000000000"); // 1 ETH
    assert.equal(actualSale.considerationRecipients.length, 1);
    assert.equal(actualSale.considerationRecipients[0], SELLER_ADDRESS);

    // Assertions for Account entities
    assert(actualBuyerAccount, "Buyer account should be created");
    assert.equal(actualBuyerAccount.id, BUYER_ADDRESS.toLowerCase());
    assert.equal(actualBuyerAccount.address, BUYER_ADDRESS);

    assert(actualSellerAccount, "Seller account should be created");
    assert.equal(actualSellerAccount.id, SELLER_ADDRESS.toLowerCase());
    assert.equal(actualSellerAccount.address, SELLER_ADDRESS);

    // Assertions for NFT entities
    assert(actualNFTContract, "NFT contract should be created");
    assert.equal(actualNFTContract.id, CRYPTOPUNKS_CONTRACT.toLowerCase());
    assert.equal(actualNFTContract.address, CRYPTOPUNKS_CONTRACT);

    assert(actualNFTToken, "NFT token should be created");
    assert.equal(actualNFTToken.id, `${CRYPTOPUNKS_CONTRACT.toLowerCase()}:123`);
    assert.equal(actualNFTToken.contract_id, CRYPTOPUNKS_CONTRACT.toLowerCase());
    assert.equal(actualNFTToken.tokenId, "123");
  });
});
