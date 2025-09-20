import { TestHelpers } from "generated";
import { decodeEventLog, parseAbi } from "viem";

const { Seaport } = TestHelpers;

/**
 * Utility functions for testing GraphQL queries and indexer functionality
 */

/**
 * Common test addresses for consistent testing
 */
export const TEST_ADDRESSES = {
  USER_1: "0x61515E2F0aaa048Eb1BBD72e0210825CD61AAb5c",
  USER_2: "0x1234567890123456789012345678901234567890",
  SELLER_1: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  BUYER_1: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  FEE_RECIPIENT: "0xfeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1",
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
} as const;

/**
 * Common NFT contract addresses for testing
 */
export const NFT_CONTRACTS = {
  BAYC: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
  CRYPTOPUNKS: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
  AZUKI: "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
  TEST_NFT_1: "0x1111111111111111111111111111111111111111",
  TEST_NFT_2: "0x2222222222222222222222222222222222222222",
} as const;

/**
 * Seaport item types
 */
export const ITEM_TYPES = {
  NATIVE: 0, // ETH
  ERC20: 1, // Fungible tokens
  ERC721: 2, // NFTs
  ERC1155: 3, // Semi-fungible tokens
} as const;

/**
 * Create a mock OrderFulfilled event with common defaults
 */
export function createMockOrderEvent(
  overrides: Partial<{
    orderHash: string;
    offerer: string;
    recipient: string;
    offer: Array<[bigint, string, bigint, bigint]>;
    consideration: Array<[bigint, string, bigint, bigint, string]>;
    blockNumber: number;
    timestamp: number;
    transactionHash: string;
    logIndex: number;
    chainId: number;
  }> = {}
) {
  const defaults = {
    orderHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    offerer: TEST_ADDRESSES.SELLER_1,
    recipient: TEST_ADDRESSES.BUYER_1,
    offer: [
      [BigInt(ITEM_TYPES.ERC721), NFT_CONTRACTS.TEST_NFT_1, 123n, 1n] as [
        bigint,
        string,
        bigint,
        bigint,
      ],
    ],
    consideration: [
      [
        BigInt(ITEM_TYPES.NATIVE),
        TEST_ADDRESSES.ZERO_ADDRESS,
        0n,
        1000000000000000000n,
        TEST_ADDRESSES.SELLER_1,
      ] as [bigint, string, bigint, bigint, string],
    ],
    blockNumber: 18500000,
    timestamp: 1700000000,
    transactionHash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    logIndex: 1,
    chainId: 1,
  };

  const params = { ...defaults, ...overrides };

  return Seaport.OrderFulfilled.createMockEvent({
    orderHash: params.orderHash,
    offerer: params.offerer,
    zone: TEST_ADDRESSES.ZERO_ADDRESS,
    recipient: params.recipient,
    offer: params.offer,
    consideration: params.consideration,
    mockEventData: {
      block: {
        number: params.blockNumber,
        timestamp: params.timestamp,
        hash: `0xblock${params.blockNumber}`,
      },
      transaction: {
        hash: params.transactionHash,
      },
      chainId: params.chainId,
      logIndex: params.logIndex,
    },
  });
}

/**
 * Create a mock NFT sale event (NFT for ETH)
 */
export function createNFTSaleEvent(params: {
  nftContract: string;
  tokenId: bigint;
  seller: string;
  buyer: string;
  priceWei: bigint;
  blockNumber?: number;
  timestamp?: number;
}) {
  return createMockOrderEvent({
    offerer: params.seller,
    recipient: params.buyer,
    offer: [[BigInt(ITEM_TYPES.ERC721), params.nftContract, params.tokenId, 1n]],
    consideration: [
      [BigInt(ITEM_TYPES.NATIVE), TEST_ADDRESSES.ZERO_ADDRESS, 0n, params.priceWei, params.seller],
    ],
    blockNumber: params.blockNumber,
    timestamp: params.timestamp,
  });
}

/**
 * Create a mock bundle sale event (multiple NFTs)
 */
export function createBundleSaleEvent(params: {
  nfts: Array<{ contract: string; tokenId: bigint }>;
  seller: string;
  buyer: string;
  priceWei: bigint;
  blockNumber?: number;
  timestamp?: number;
}) {
  const offer = params.nfts.map(
    (nft) =>
      [BigInt(ITEM_TYPES.ERC721), nft.contract, nft.tokenId, 1n] as [bigint, string, bigint, bigint]
  );

  return createMockOrderEvent({
    offerer: params.seller,
    recipient: params.buyer,
    offer,
    consideration: [
      [BigInt(ITEM_TYPES.NATIVE), TEST_ADDRESSES.ZERO_ADDRESS, 0n, params.priceWei, params.seller],
    ],
    blockNumber: params.blockNumber,
    timestamp: params.timestamp,
  });
}

/**
 * Create a mock event with marketplace fees
 */
export function createEventWithFees(params: {
  nftContract: string;
  tokenId: bigint;
  seller: string;
  buyer: string;
  priceWei: bigint;
  feeWei: bigint;
  feeRecipient: string;
  blockNumber?: number;
  timestamp?: number;
}) {
  return createMockOrderEvent({
    offerer: params.seller,
    recipient: params.buyer,
    offer: [[BigInt(ITEM_TYPES.ERC721), params.nftContract, params.tokenId, 1n]],
    consideration: [
      [
        BigInt(ITEM_TYPES.NATIVE),
        TEST_ADDRESSES.ZERO_ADDRESS,
        0n,
        params.priceWei - params.feeWei,
        params.seller,
      ],
      [
        BigInt(ITEM_TYPES.NATIVE),
        TEST_ADDRESSES.ZERO_ADDRESS,
        0n,
        params.feeWei,
        params.feeRecipient,
      ],
    ],
    blockNumber: params.blockNumber,
    timestamp: params.timestamp,
  });
}

/**
 * Helper to process multiple events and return the updated database
 */
export async function processEvents(events: any[], initialMockDb: any) {
  let currentDb = initialMockDb;

  for (const event of events) {
    currentDb = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb: currentDb,
    });
  }

  return currentDb;
}

/**
 * Get all orders from the mock database
 */
export function getAllOrders(mockDb: any) {
  const orders = [];
  for (const [key, order] of mockDb.entities.Seaport_OrderFulfilled.entries()) {
    orders.push({ id: key, ...order });
  }
  return orders;
}

/**
 * Find orders by user (offerer or recipient)
 */
export function findOrdersByUser(mockDb: any, userAddress: string) {
  const orders = getAllOrders(mockDb);
  return orders.filter(
    (order) =>
      order.offerer.toLowerCase() === userAddress.toLowerCase() ||
      order.recipient.toLowerCase() === userAddress.toLowerCase()
  );
}

/**
 * Find orders by NFT contract
 */
export function findOrdersByNFTContract(mockDb: any, contractAddress: string) {
  const orders = getAllOrders(mockDb);
  return orders.filter(
    (order) =>
      order.offerTokens.some(
        (token: string) => token.toLowerCase() === contractAddress.toLowerCase()
      ) ||
      order.considerationTokens.some(
        (token: string) => token.toLowerCase() === contractAddress.toLowerCase()
      )
  );
}

/**
 * Find orders within block range
 */
export function findOrdersByBlockRange(mockDb: any, startBlock: number, endBlock: number) {
  const orders = getAllOrders(mockDb);
  return orders.filter((order) => {
    const blockNumber = Number(order.blockNumber);
    return blockNumber >= startBlock && blockNumber <= endBlock;
  });
}

/**
 * Find orders within timestamp range
 */
export function findOrdersByTimeRange(mockDb: any, startTime: number, endTime: number) {
  const orders = getAllOrders(mockDb);
  return orders.filter((order) => {
    const timestamp = Number(order.timestamp);
    return timestamp >= startTime && timestamp <= endTime;
  });
}

/**
 * Find NFT sales (orders with NFT in offer)
 */
export function findNFTSales(mockDb: any) {
  const orders = getAllOrders(mockDb);
  return orders.filter(
    (order) =>
      order.offerItemTypes.includes(ITEM_TYPES.ERC721) ||
      order.offerItemTypes.includes(ITEM_TYPES.ERC1155)
  );
}

/**
 * Sort orders by timestamp (descending by default)
 */
export function sortOrdersByTimestamp(orders: any[], ascending = false) {
  return orders.sort((a, b) => {
    const timestampA = Number(a.timestamp);
    const timestampB = Number(b.timestamp);
    return ascending ? timestampA - timestampB : timestampB - timestampA;
  });
}

/**
 * Sort orders by block number (descending by default)
 */
export function sortOrdersByBlockNumber(orders: any[], ascending = false) {
  return orders.sort((a, b) => {
    const blockA = Number(a.blockNumber);
    const blockB = Number(b.blockNumber);
    return ascending ? blockA - blockB : blockB - blockA;
  });
}

/**
 * Convert ETH wei to readable format for testing
 */
export function weiToEth(wei: bigint | string): string {
  const weiNum = typeof wei === "string" ? BigInt(wei) : wei;
  return (Number(weiNum) / 1e18).toFixed(4);
}

/**
 * Convert ETH to wei for testing
 */
export function ethToWei(eth: number): bigint {
  return BigInt(Math.floor(eth * 1e18));
}

/**
 * Generate a series of test events with incrementing timestamps and block numbers
 */
export function generateTestEventSeries(
  count: number,
  baseParams: {
    baseTimestamp?: number;
    baseBlockNumber?: number;
    timestampIncrement?: number;
    blockIncrement?: number;
  }
) {
  const {
    baseTimestamp = 1700000000,
    baseBlockNumber = 18500000,
    timestampIncrement = 100,
    blockIncrement = 1,
  } = baseParams;

  const events = [];

  for (let i = 0; i < count; i++) {
    events.push(
      createMockOrderEvent({
        orderHash: `0x${i.toString().padStart(64, "0")}`,
        blockNumber: baseBlockNumber + i * blockIncrement,
        timestamp: baseTimestamp + i * timestampIncrement,
        logIndex: i + 1,
      })
    );
  }

  return events;
}

/**
 * Assert that two orders are equal (for testing)
 */
export function assertOrdersEqual(actual: any, expected: any, message?: string) {
  const assert = require("assert");

  // Helper to normalize orders for comparison
  const normalize = (order: any) => ({
    ...order,
    blockNumber: order.blockNumber.toString(),
    timestamp: order.timestamp.toString(),
  });

  assert.deepEqual(normalize(actual), normalize(expected), message);
}

/**
 * Print order summary for debugging
 */
export function printOrderSummary(order: any) {
  console.log(`Order ${order.id}:`);
  console.log(`  Hash: ${order.orderHash}`);
  console.log(`  Offerer: ${order.offerer}`);
  console.log(`  Recipient: ${order.recipient}`);
  console.log(`  Block: ${order.blockNumber}`);
  console.log(`  Timestamp: ${order.timestamp}`);
  console.log(`  Offer items: ${order.offerItemTypes.length}`);
  console.log(`  Consideration items: ${order.considerationItemTypes.length}`);
}

/**
 * SuperRare test utilities
 */
export const SUPER_RARE_CONTRACTS = {
  SUPER_RARE_V1: "0x3333333333333333333333333333333333333333",
  SUPER_RARE_BAZAAR: "0x4444444444444444444444444444444444444444",
  TEST_NFT: "0x1111111111111111111111111111111111111111",
} as const;

/**
 * Create a mock SuperRareBazaar AcceptOffer event
 */
export function createSuperRareBazaarAcceptOfferEvent(params: {
  seller: string;
  bidder: string;
  originContract: string;
  tokenId: bigint;
  amount: bigint;
  currencyAddress: string;
  blockNumber?: number;
  timestamp?: number;
  transactionHash?: string;
  chainId?: number;
}) {
  const {
    seller,
    bidder,
    originContract,
    tokenId,
    amount,
    currencyAddress,
    blockNumber = 18500000,
    timestamp = 1700000000,
    transactionHash = "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    chainId = 1,
  } = params;

  const { SuperRareBazaar } = TestHelpers;

  return SuperRareBazaar.AcceptOffer.createMockEvent({
    seller,
    bidder,
    originContract,
    tokenId,
    amount,
    currencyAddress,
    mockEventData: {
      block: {
        number: blockNumber,
        timestamp,
        hash: `0xblock${blockNumber}`,
      },
      transaction: {
        hash: transactionHash,
      },
      chainId,
      logIndex: 1,
    },
  });
}

/**
 * Create a mock SuperRareV1 Sold event
 */
export function createSuperRareV1SoldEvent(params: {
  seller: string;
  buyer: string;
  tokenId: bigint;
  amount: bigint;
  contractAddress: string;
  blockNumber?: number;
  timestamp?: number;
  transactionHash?: string;
  chainId?: number;
}) {
  const {
    seller,
    buyer,
    tokenId,
    amount,
    contractAddress,
    blockNumber = 18500000,
    timestamp = 1700000000,
    transactionHash = "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    chainId = 1,
  } = params;

  const { SuperRareV1 } = TestHelpers;

  return SuperRareV1.Sold.createMockEvent({
    seller,
    buyer,
    tokenId,
    amount,
    mockEventData: {
      block: {
        number: blockNumber,
        timestamp,
        hash: `0xblock${blockNumber}`,
      },
      transaction: {
        hash: transactionHash,
      },
      chainId,
      logIndex: 1,
      srcAddress: contractAddress,
    },
  });
}

/**
 * Create a mock SuperRareBazaar AcceptOffer event with ETH payment
 */
export function createSuperRareBazaarETHSale(params: {
  seller: string;
  bidder: string;
  originContract: string;
  tokenId: bigint;
  amountETH: number; // Amount in ETH (will be converted to wei)
  blockNumber?: number;
  timestamp?: number;
  transactionHash?: string;
  chainId?: number;
}) {
  return createSuperRareBazaarAcceptOfferEvent({
    ...params,
    amount: ethToWei(params.amountETH),
    currencyAddress: TEST_ADDRESSES.ZERO_ADDRESS,
  });
}

/**
 * Create a mock SuperRareBazaar AcceptOffer event with ERC20 payment
 */
export function createSuperRareBazaarERC20Sale(params: {
  seller: string;
  bidder: string;
  originContract: string;
  tokenId: bigint;
  amount: bigint;
  erc20Token: string;
  blockNumber?: number;
  timestamp?: number;
  transactionHash?: string;
  chainId?: number;
}) {
  return createSuperRareBazaarAcceptOfferEvent({
    ...params,
    currencyAddress: params.erc20Token,
  });
}

/**
 * Create a mock SuperRareV1 Sold event with ETH payment
 */
export function createSuperRareV1ETHSale(params: {
  seller: string;
  buyer: string;
  tokenId: bigint;
  amountETH: number; // Amount in ETH (will be converted to wei)
  contractAddress: string;
  blockNumber?: number;
  timestamp?: number;
  transactionHash?: string;
  chainId?: number;
}) {
  return createSuperRareV1SoldEvent({
    ...params,
    amount: ethToWei(params.amountETH),
  });
}

/**
 * Assert that two SuperRare sales are equal (for unit testing)
 */
export function assertSuperRareSalesEqual(actual: any, expected: any, message?: string) {
  const assert = require("assert");

  // Helper to normalize sales for comparison
  const normalize = (sale: any) => ({
    ...sale,
    timestamp: sale.timestamp.toString(),
  });

  assert.deepEqual(normalize(actual), normalize(expected), message);
}

// Seaport OrderFulfilled event ABI
const SEAPORT_ABI = parseAbi([
  "event OrderFulfilled(bytes32 orderHash, address indexed offerer, address indexed zone, address recipient, (uint8 itemType, address token, uint256 identifier, uint256 amount)[] offer, (uint8 itemType, address token, uint256 identifier, uint256 amount, address recipient)[] consideration)",
]);

/**
 * Decode raw event data into a mock event for testing
 */
export function decodeRawOrderFulfilledEvent(rawEventData: {
  topics: string[];
  data: string;
  blockNumber: number;
  timestamp: number;
  transactionHash: string;
  logIndex: number;
  chainId: number;
}) {
  const { topics, data, blockNumber, timestamp, transactionHash, logIndex, chainId } = rawEventData;

  try {
    const decoded = decodeEventLog({
      abi: SEAPORT_ABI,
      data: data as `0x${string}`,
      topics: topics as [`0x${string}`, ...`0x${string}`[]],
      eventName: "OrderFulfilled",
    });

    // Extract the decoded parameters
    const { orderHash, offerer, zone, recipient, offer, consideration } = decoded.args;

    // Convert the decoded data to the format expected by the mock event
    const formattedOffer = offer.map(
      (item: any) =>
        [BigInt(item.itemType), item.token, BigInt(item.identifier), BigInt(item.amount)] as [
          bigint,
          string,
          bigint,
          bigint,
        ]
    );

    const formattedConsideration = consideration.map(
      (item: any) =>
        [
          BigInt(item.itemType),
          item.token,
          BigInt(item.identifier),
          BigInt(item.amount),
          item.recipient,
        ] as [bigint, string, bigint, bigint, string]
    );

    return Seaport.OrderFulfilled.createMockEvent({
      orderHash,
      offerer,
      zone,
      recipient,
      offer: formattedOffer,
      consideration: formattedConsideration,
      mockEventData: {
        block: {
          number: blockNumber,
          timestamp,
          hash: `0xblock${blockNumber}`,
        },
        transaction: {
          hash: transactionHash,
        },
        chainId,
        logIndex,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to decode OrderFulfilled event: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export function processOrderFulfilledEventTest(
  rawEventData: Parameters<typeof decodeRawOrderFulfilledEvent>[0],
  testName: string,
  assertions: (event: any, mockDb: any) => void
) {
  return async () => {
    const mockDb = TestHelpers.MockDb.createMockDb();
    const event = decodeRawOrderFulfilledEvent(rawEventData);

    const updatedDb = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    assertions(event, updatedDb);
  };
}
