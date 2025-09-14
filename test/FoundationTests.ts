import assert from "assert";
import { TestHelpers } from "generated";
const { MockDb, Foundation } = TestHelpers;

describe("Foundation event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Test addresses
  const BUYER_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const SELLER_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const FOUNDATION_CONTRACT = "0xcda72070e455bb31c7690a170224ce43623d0b6f";
  const NFT_CONTRACT = "0xcccccccccccccccccccccccccccccccccccccccc";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  describe("BuyPriceAccepted event tests", () => {
    it("Sale is created correctly for BuyPriceAccepted event", async () => {
      // Creating mock for Foundation BuyPriceAccepted event
      const event = Foundation.BuyPriceAccepted.createMockEvent({
        nftContract: NFT_CONTRACT,
        tokenId: 456n,
        seller: SELLER_ADDRESS,
        buyer: BUYER_ADDRESS,
        totalFees: 1000000000000000000n, // 1 ETH in wei
        creatorRev: 25000000000000000n, // 0.025 ETH (2.5%)
        sellerRev: 975000000000000000n, // 0.975 ETH (97.5%)
        mockEventData: {
          block: {
            number: 18500000,
            timestamp: 1700000000,
          },
          transaction: {
            hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          },
          chainId: 1,
          logIndex: 1,
          srcAddress: FOUNDATION_CONTRACT,
        },
      });

      // Processing the event
      const mockDbUpdated = await Foundation.BuyPriceAccepted.processEvent({
        event,
        mockDb,
      });

      // Getting the actual entities from the mock database
      const actualSale = mockDbUpdated.entities.Sale.get(
        `${event.chainId}_${event.transaction.hash}`
      );
      const actualBuyerAccount = mockDbUpdated.entities.Account.get(BUYER_ADDRESS.toLowerCase());
      const actualSellerAccount = mockDbUpdated.entities.Account.get(SELLER_ADDRESS.toLowerCase());
      const actualNFTContract = mockDbUpdated.entities.NFTContract.get(NFT_CONTRACT.toLowerCase());
      const actualNFTToken = mockDbUpdated.entities.NFTToken.get(
        `${NFT_CONTRACT.toLowerCase()}:456`
      );

      // Assertions for the Sale entity
      assert(actualSale, "Sale should be created");
      assert.equal(actualSale.id, `${event.chainId}_${event.transaction.hash}`);
      assert.equal(actualSale.timestamp, BigInt(1700000000));
      assert.equal(actualSale.transactionHash, event.transaction.hash);
      assert.equal(actualSale.market, "Foundation");
      assert.equal(actualSale.offerer_id, SELLER_ADDRESS.toLowerCase());
      assert.equal(actualSale.recipient_id, BUYER_ADDRESS.toLowerCase());

      // Check NFT data via junction entity
      const allSaleNfts = mockDbUpdated.entities.SaleNFT.getAll();
      const saleNfts = allSaleNfts.filter((sn) => sn.sale_id === actualSale?.id);
      assert.equal(saleNfts.length, 1, "Sale should have one NFT");
      assert.equal(saleNfts[0].nftToken_id, `${NFT_CONTRACT.toLowerCase()}:456`);
      assert.equal(saleNfts[0].isOffer, true, "NFT should be in offer");

      // Assertions for offer items (NFT being sold)
      assert.equal(actualSale.offerItemTypes.length, 1);
      assert.equal(actualSale.offerItemTypes[0], 2); // ERC721
      assert.equal(actualSale.offerTokens.length, 1);
      assert.equal(actualSale.offerTokens[0], NFT_CONTRACT);
      assert.equal(actualSale.offerIdentifiers.length, 1);
      assert.equal(actualSale.offerIdentifiers[0], "456");
      assert.equal(actualSale.offerAmounts.length, 1);
      assert.equal(actualSale.offerAmounts[0], "1");

      // Assertions for consideration items (ETH payment split)
      assert.equal(actualSale.considerationItemTypes.length, 2);
      assert.equal(actualSale.considerationItemTypes[0], 0); // ETH
      assert.equal(actualSale.considerationItemTypes[1], 0); // ETH
      assert.equal(actualSale.considerationTokens.length, 2);
      assert.equal(actualSale.considerationTokens[0], ZERO_ADDRESS);
      assert.equal(actualSale.considerationTokens[1], ZERO_ADDRESS);
      assert.equal(actualSale.considerationIdentifiers.length, 2);
      assert.equal(actualSale.considerationIdentifiers[0], "0");
      assert.equal(actualSale.considerationIdentifiers[1], "0");
      assert.equal(actualSale.considerationAmounts.length, 2);
      assert.equal(actualSale.considerationAmounts[0], "975000000000000000"); // seller amount
      assert.equal(actualSale.considerationAmounts[1], "25000000000000000"); // creator amount
      assert.equal(actualSale.considerationRecipients.length, 2);
      assert.equal(actualSale.considerationRecipients[0], SELLER_ADDRESS);
      assert.equal(actualSale.considerationRecipients[1], SELLER_ADDRESS);

      // Assertions for Account entities
      assert(actualBuyerAccount, "Buyer account should be created");
      assert.equal(actualBuyerAccount.id, BUYER_ADDRESS.toLowerCase());
      assert.equal(actualBuyerAccount.address, BUYER_ADDRESS);

      assert(actualSellerAccount, "Seller account should be created");
      assert.equal(actualSellerAccount.id, SELLER_ADDRESS.toLowerCase());
      assert.equal(actualSellerAccount.address, SELLER_ADDRESS);

      // Assertions for NFT entities
      assert(actualNFTContract, "NFT contract should be created");
      assert.equal(actualNFTContract.id, NFT_CONTRACT.toLowerCase());
      assert.equal(actualNFTContract.address, NFT_CONTRACT);

      assert(actualNFTToken, "NFT token should be created");
      assert.equal(actualNFTToken.id, `${NFT_CONTRACT.toLowerCase()}:456`);
      assert.equal(actualNFTToken.contract_id, NFT_CONTRACT.toLowerCase());
      assert.equal(actualNFTToken.tokenId, "456");
    });
  });
});
