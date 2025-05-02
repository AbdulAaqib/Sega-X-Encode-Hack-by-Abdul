const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const MyToken = await hre.ethers.getContractFactory("SegaUNLEASHED");
  const myToken = await MyToken.deploy(deployer.address);

  await myToken.waitForDeployment();
  console.log("SegaUNLEASHED deployed to:", myToken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});