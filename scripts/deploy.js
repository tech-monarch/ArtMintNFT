// scripts/deploy.js
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting deployment...");

  const network = hre.network.name;
  const chainId = hre.network.config.chainId;
  console.log(`📡 Network: ${network} (Chain ID: ${chainId})`);

  const PLATFORM_WALLET = process.env.PLATFORM_WALLET || "";

  if (!PLATFORM_WALLET || PLATFORM_WALLET === "0x83adc731564072ca4750e193e5068239a3b2407e") {
    console.warn(
      "⚠️ PLATFORM_WALLET is not set or looks like the placeholder. Set PLATFORM_WALLET in your .env to a real address."
    );
    // You can still proceed for localhost testing, but for mainnet you must set PLATFORM_WALLET in .env
  }

  console.log("📦 Deploying ArtNFT...");
  const ArtNFT = await hre.ethers.getContractFactory("ArtNFT");
  const nft = await ArtNFT.deploy(PLATFORM_WALLET);

  console.log("⏳ Waiting for confirmation...");
  await nft.deployed();

  const contractAddress = nft.address;
  console.log(`✅ ArtNFT deployed to: ${contractAddress}`);

  // Save ABI + contract address for frontend
  const frontendDir = path.join(__dirname, "..", "frontend", "contracts");
  if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });

  const artifact = await hre.artifacts.readArtifact("ArtNFT");
  fs.writeFileSync(path.join(frontendDir, "abi.json"), JSON.stringify(artifact.abi, null, 2));
  fs.writeFileSync(
    path.join(frontendDir, "contract-address.json"),
    JSON.stringify({ address: contractAddress, network, chainId }, null, 2)
  );

  console.log("📁 ABI and contract address saved to frontend/contracts/");

  console.log("🎉 Deployment finished.");
}

// If you want to add/test nft.storage upload in future, re-enable here. For now it's commented out to avoid failures.

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Deployment FAILED:", err);
    process.exit(1);
  });
