require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Handles environment variables

module.exports = {
  solidity: "0.8.20",
  networks: {
    mumbai: {
      url: "https://polygon-mainnet.infura.io/v3/0006bbd7c83346e79019f7fbdd74fde5",
      accounts: ["ca53f115c234ce09c26f14dc1170fc1769d6b0db3489bcb1f4761b6145223edd"]
    }
  }
};
