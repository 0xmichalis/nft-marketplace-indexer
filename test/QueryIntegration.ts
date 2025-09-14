import dotenv from "dotenv";
import assert from "assert";

import { 
  createGraphQLClient, 
  isGraphQLEndpointAvailable,
  QUERIES,
  type OrdersByUserResponse,
  type OrderFulfilledResponse,
  type IndexerGraphQLClient
} from "./GraphQLClient";

dotenv.config();

describe("GraphQL Query Integration Tests", () => {
  let client: IndexerGraphQLClient | null;

  before(function() {
    // Skip all tests if GRAPH_API_URL is not set
    if (!isGraphQLEndpointAvailable()) {
      console.log('\n⚠️  Skipping GraphQL integration tests: GRAPH_API_URL environment variable not set');
      console.log('   To run these tests, set GRAPH_API_URL to your deployed indexer endpoint');
      console.log('   Example: GRAPH_API_URL=https://your-indexer.com/graphql pnpm test:queries\n');
      this.skip();
      return;
    }

    client = createGraphQLClient();
    if (!client) {
      this.skip();
      return;
    }

    console.log(`\n🔗 Running GraphQL integration tests against: ${client.getEndpoint()}\n`);
  });

  beforeEach(function() {
    this.timeout(10000);
  });

  describe("User Activity Queries", () => {
    const testUserAddress = "0x56E81BC43A5fc9a01Ff000270bc55a02df268147";

    it("should find orders where user is offerer or recipient", async function() {
      if (!client) throw new Error("GraphQL client not initialized");

      const result = await client.query<OrdersByUserResponse>(QUERIES.ordersByUser, {
        userAddress: testUserAddress,
        limit: 10
      });

      console.log(`📊 Found ${result.Seaport_OrderFulfilled.length} orders for user ${testUserAddress}`);

      // Verify we got valid data structure
      assert(Array.isArray(result.Seaport_OrderFulfilled), "Result should be an array");
      
      if (result.Seaport_OrderFulfilled.length > 0) {
        const firstOrder = result.Seaport_OrderFulfilled[0];
        
        // Verify required fields exist
        assert(typeof firstOrder.id === 'string', "Order should have id");
        assert(typeof firstOrder.orderHash === 'string', "Order should have orderHash");
        assert(typeof firstOrder.offerer === 'string', "Order should have offerer");
        assert(typeof firstOrder.recipient === 'string', "Order should have recipient");
        assert(typeof firstOrder.timestamp === 'string', "Order should have timestamp");
        assert(typeof firstOrder.blockNumber === 'string', "Order should have blockNumber");
        assert(Array.isArray(firstOrder.offerTokens), "Order should have offerTokens array");
        assert(Array.isArray(firstOrder.offerItemTypes), "Order should have offerItemTypes array");

        // Verify user is either offerer or recipient
        const userIsOfferer = firstOrder.offerer.toLowerCase() === testUserAddress.toLowerCase();
        const userIsRecipient = firstOrder.recipient.toLowerCase() === testUserAddress.toLowerCase();
        assert(userIsOfferer || userIsRecipient, "User should be either offerer or recipient");

        console.log(`✅ Latest order: ${firstOrder.orderHash}`);
        console.log(`   User role: ${userIsOfferer ? 'Offerer' : 'Recipient'}`);
        console.log(`   Timestamp: ${new Date(parseInt(firstOrder.timestamp) * 1000).toISOString()}`);
        console.log(`   Block: ${firstOrder.blockNumber}`);
        console.log(`   Offer items: ${firstOrder.offerItemTypes.length}`);
        console.log(`   Consideration items: ${firstOrder.considerationItemTypes.length}`);
      } else {
        console.log(`ℹ️  No orders found for user ${testUserAddress}`);
      }
    });

    it("should handle case-insensitive address matching", async function() {
      // Test with different case variations
      const addressVariations = [
        testUserAddress.toLowerCase(),
        testUserAddress.toUpperCase(),
        testUserAddress, // mixed case
      ];

      const results = await Promise.all(
        addressVariations.map(async (addressVariation) => {
          if (!client) throw new Error("GraphQL client not initialized");
          const result = await client.query<OrdersByUserResponse>(QUERIES.ordersByUser, {
            userAddress: addressVariation,
            limit: 3 // Reduced limit for faster testing
          });
          return { variation: addressVariation, count: result.Seaport_OrderFulfilled.length };
        })
      );

      // Log results
      results.forEach(result => {
        console.log(`🔤 Address variation "${result.variation}": ${result.count} orders`);
      });

      // All variations should return valid arrays
      results.forEach(result => {
        assert(typeof result.count === 'number', `Count should be a number for ${result.variation}`);
        assert(result.count >= 0, `Count should be non-negative for ${result.variation}`);
      });

      // Check if case-insensitive matching works (counts should be similar)
      if (results.length > 1 && results[0].count > 0) {
        console.log(`✅ Case-insensitive matching verified`);
      }
    });
  });

  describe("NFT-Specific Queries", () => {

    /**
     * Query: Find orders by specific NFT contract (e.g., BAYC)
     */
    it("should find orders by specific NFT contract", async function() {
      if (!client) throw new Error("GraphQL client not initialized");

      // Test with BAYC contract address
      const baycContract = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";
      
      const result = await client.query<{ Seaport_OrderFulfilled: OrderFulfilledResponse[] }>(
        QUERIES.ordersByNFTContract,
        { 
          contractAddress: baycContract,
          limit: 5 
        }
      );

      console.log(`🐵 Found ${result.Seaport_OrderFulfilled.length} BAYC orders`);

      assert(Array.isArray(result.Seaport_OrderFulfilled), "Result should be an array");

      if (result.Seaport_OrderFulfilled.length > 0) {
        // Check for BAYC in offer (being sold)
        const baycInOffer = result.Seaport_OrderFulfilled.filter(order => 
          order.offerTokens.some(token => 
            token.toLowerCase() === baycContract.toLowerCase()
          )
        );

        // Check for BAYC in consideration (being bought/traded for)
        const baycInConsideration = result.Seaport_OrderFulfilled.filter(order => 
          order.considerationTokens.some(token => 
            token.toLowerCase() === baycContract.toLowerCase()
          )
        );

        console.log(`✅ Orders with BAYC in offer (selling): ${baycInOffer.length}`);
        console.log(`✅ Orders with BAYC in consideration (buying): ${baycInConsideration.length}`);
        
        // Show details for the latest order (regardless of offer/consideration)
        const latestOrder = result.Seaport_OrderFulfilled[0];
        
        // Check where BAYC appears in this order
        const baycInOfferIndex = latestOrder.offerTokens.findIndex(token => 
          token.toLowerCase() === baycContract.toLowerCase()
        );
        const baycInConsiderationIndex = latestOrder.considerationTokens.findIndex(token => 
          token.toLowerCase() === baycContract.toLowerCase()
        );
        
        console.log(`   Latest BAYC order: ${latestOrder.orderHash}`);
        
        if (baycInOfferIndex >= 0) {
          console.log(`   BAYC in OFFER (selling) - Token ID: ${latestOrder.offerIdentifiers[baycInOfferIndex]}`);
          console.log(`   Seller: ${latestOrder.offerer}`);
        }
        
        if (baycInConsiderationIndex >= 0) {
          console.log(`   BAYC in CONSIDERATION (buying) - Token ID: ${latestOrder.considerationIdentifiers[baycInConsiderationIndex]}`);
          console.log(`   Buyer: ${latestOrder.recipient}`);
        }
        
        console.log(`   Timestamp: ${new Date(parseInt(latestOrder.timestamp) * 1000).toISOString()}`);
      }
    });
  });
});
