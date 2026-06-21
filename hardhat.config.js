require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config({ path: './backend/.env' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // ── Ethereum Sepolia testnet ─────────────────────────────────────────────
    sepolia: {
      url:      process.env.SEPOLIA_RPC_URL || process.env.ALCHEMY_RPC_URL || '',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId:  11155111,
      gasPrice: 'auto',
      timeout:  120000,
    },
    // ── Local Hardhat node (for quick testing) ───────────────────────────────
    localhost: {
      url:     'http://127.0.0.1:8545',
      chainId: 31337,
    },
  },
  etherscan: {
    // Optional: verify contract on Etherscan
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
  paths: {
    sources:   './contracts',
    tests:     './test',
    cache:     './cache',
    artifacts: './artifacts',
  },
};
