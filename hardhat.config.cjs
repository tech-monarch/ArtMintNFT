// hardhat.config.cjs
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID || "";
const POLYGON_PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY || "";

// Optional Mumbai RPC (testnet)
const MUMBAI_RPC = process.env.MUMBAI_RPC || "";

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    ],
  },

  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // Polygon Mumbai (Testnet)
    mumbai: {
      url: 
        MUMBAI_RPC ||
        (INFURA_PROJECT_ID
          ? `https://polygon-mumbai.infura.io/v3/${INFURA_PROJECT_ID}`
          : ""),
      chainId: 80001,
      accounts: POLYGON_PRIVATE_KEY ? [POLYGON_PRIVATE_KEY] : [],
    },

    // Polygon MAINNET (the one your client uses)
    polygon: {
      url: process.env.POLYGON_RPC || 
           (INFURA_PROJECT_ID
            ? `https://polygon-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`
            : ""),
        chainId: 137,
        accounts: POLYGON_PRIVATE_KEY ? [POLYGON_PRIVATE_KEY] : [],
      },
    },

  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
};
