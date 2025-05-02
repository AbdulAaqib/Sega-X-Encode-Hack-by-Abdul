require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Handles environment variables

module.exports = {
  solidity: "0.8.20",
  networks: {
    mumbai: {
      url: process.env.POLYGON_MUMBAI_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
