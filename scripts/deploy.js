const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  const ArtNFT = await hre.ethers.getContractFactory("ArtNFT");

  const platformWallet =
    process.env.PLATFORM_WALLET_ADDRESS &&
    process.env.PLATFORM_WALLET_ADDRESS !== ""
      ? process.env.PLATFORM_WALLET_ADDRESS
      : deployer.address;
  const artNFT = await ArtNFT.deploy(platformWallet);
  await artNFT.deployed();

  console.log("Platform wallet used:", platformWallet);
  console.log("ArtNFT Contract Address:", artNFT.address);
  console.log("Network:", hre.network.name);

  // ensure frontend dir
  const outDir = path.join(__dirname, "..", "frontend");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // write contract-address.json with network name
  const addrOut = {
    address: artNFT.address,
    network: hre.network.name,
    chainId: hre.network.config.chainId || null,
  };
  fs.writeFileSync(
    path.join(outDir, "contract-address.json"),
    JSON.stringify(addrOut, null, 2)
  );
  // write ABI
  const artifact = await hre.artifacts.readArtifact("ArtNFT");
  fs.writeFileSync(
    path.join(outDir, "abi.json"),
    JSON.stringify({ abi: artifact.abi }, null, 2)
  );

  console.log("Wrote frontend/contract-address.json and frontend/abi.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
