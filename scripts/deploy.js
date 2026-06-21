/**
 * SeQureChain — Deploy EvidenceManager.sol to Ethereum Sepolia
 *
 * Prerequisites:
 *   backend/.env must have:
 *     SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
 *     DEPLOYER_PRIVATE_KEY=0xYOUR_METAMASK_TEST_WALLET_PRIVATE_KEY
 *
 * Run:
 *   npx hardhat run scripts/deploy.js --network sepolia
 *
 * After deployment:
 *   Copy the printed CONTRACT_ADDRESS into:
 *     backend/.env   →  CONTRACT_ADDRESS=0x...
 *     frontend/.env  →  EXPO_PUBLIC_CONTRACT_ADDRESS=0x...
 */

const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network    = hre.network.name;

  console.log('\n🚀 SeQureChain — EvidenceManager Deployment');
  console.log('═'.repeat(52));
  console.log(`📡 Network:   ${network} (chainId: ${hre.network.config.chainId})`);
  console.log(`💼 Deployer:  ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balEth  = parseFloat(hre.ethers.formatEther(balance)).toFixed(4);
  console.log(`💰 Balance:   ${balEth} ETH`);

  if (network === 'sepolia' && balance < hre.ethers.parseEther('0.005')) {
    console.error('\n❌ Not enough Sepolia ETH for deployment.');
    console.error('   Get free test ETH at: https://sepoliafaucet.com');
    process.exit(1);
  }

  console.log('\n📦 Compiling EvidenceManager.sol...');
  const Factory  = await hre.ethers.getContractFactory('EvidenceManager');

  console.log('📡 Sending deployment transaction...');
  const contract = await Factory.deploy();

  console.log('⏳ Waiting for deployment confirmation...');
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const txHash  = contract.deploymentTransaction()?.hash;
  const receipt  = await contract.deploymentTransaction()?.wait(1);
  const block    = receipt?.blockNumber;

  console.log('\n✅ Deployment confirmed on Ethereum Sepolia!');
  console.log('═'.repeat(52));
  console.log(`📜 Contract:  ${address}`);
  console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${address}`);
  if (txHash) console.log(`🧾 TX:        https://sepolia.etherscan.io/tx/${txHash}`);
  if (block)  console.log(`🧱 Block:     ${block}`);

  console.log('\n📝 Add to backend/.env:');
  console.log(`   CONTRACT_ADDRESS=${address}`);
  console.log('\n📝 Add to frontend/.env:');
  console.log(`   EXPO_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log('\n💡 DEPLOYER_PRIVATE_KEY is only needed for deployment.');
  console.log('   All user transactions are signed by MetaMask in the browser.');
  console.log('═'.repeat(52));
}

main().catch(err => {
  console.error('\n❌ Deployment failed:', err.message);
  process.exit(1);
});
