const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
// const NFTStorage = require("nft.storage").NFTStorage;
// const { File } = require("nft.storage");
require("dotenv").config();

// const NFT_STORAGE_KEY = process.env.NFT_STORAGE_KEY; // Your NFT.Storage API key

async function main() {
  console.log("🚀 Starting deployment...");

  const network = hre.network.name;
  const chainId = hre.network.config.chainId;
  console.log(`📡 Network: ${network} (Chain ID: ${chainId})`);

  // if (!NFT_STORAGE_KEY) throw new Error("❌ Please set your NFT_STORAGE_KEY in .env");
  // const nftStorage = new NFTStorage({ token: NFT_STORAGE_KEY });

  // ---------------------------------------
  // 1. PLATFORM WALLET
  // ---------------------------------------
  const platformWallet = "0x83adc731564072ca4750e193e5068239a3b2407e";

  // ---------------------------------------
  // 2. DEPLOY CONTRACT
  // ---------------------------------------
  console.log("📦 Deploying ArtNFT...");

  const ArtNFT = await hre.ethers.getContractFactory("ArtNFT");
  const nft = await ArtNFT.deploy(platformWallet);

  console.log("⏳ Waiting for confirmation...");
  await nft.deployed();

  const contractAddress = nft.address;
  console.log(`✅ ArtNFT deployed to: ${contractAddress}`);

  // ---------------------------------------
  // 3. SAVE ABI + ADDRESS FOR FRONTEND
  // ---------------------------------------
  const frontendDir = path.join(__dirname, "..", "frontend", "contracts");
  if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });

  const artifact = await hre.artifacts.readArtifact("ArtNFT");
  fs.writeFileSync(path.join(frontendDir, "abi.json"), JSON.stringify(artifact.abi, null, 2));
  fs.writeFileSync(
    path.join(frontendDir, "contract-address.json"),
    JSON.stringify({ address: contractAddress, network, chainId }, null, 2)
  );

  console.log("📁 ABI and contract address saved to frontend/contracts/");

  // ---------------------------------------
  // 4. GENERATE AND UPLOAD NFT METADATA (COMMENTED OUT)
  // ---------------------------------------
  // console.log("🎨 Generating test NFT metadata and uploading to NFT.Storage...");
  //
  // // Example image (replace with your local image or dynamic generation)
  // const imagePath = path.join(__dirname, "example-image.jpg"); 
  // const imageData = await fs.promises.readFile(imagePath);
  //
  // const metadata = await nftStorage.store({
  //   name: "Test ArtNFT",
  //   description: "This is a test NFT minted from Hardhat + NFT.Storage",
  //   image: new File([imageData], "example-image.jpg", { type: "image/jpeg" }),
  //   attributes: [
  //     { trait_type: "Background", value: "Blue" },
  //     { trait_type: "Mood", value: "Excited" }
  //   ]
  // });
  //
  // console.log(`✅ Metadata uploaded! IPFS URL: ${metadata.url}`);
  //
  // ---------------------------------------
  // 5. MINT NFT WITH IPFS METADATA (COMMENTED OUT)
  // ---------------------------------------
  // console.log("💎 Minting NFT to platform wallet...");
  //
  // const mintTx = await nft.mintNFT(platformWallet, metadata.url);
  // const receipt = await mintTx.wait();
  //
  // const transferEvent = receipt.events.find(e => e.event === "Transfer");
  // const tokenId = transferEvent.args.tokenId.toString();
  //
  // console.log(`✅ NFT minted!`);
  // console.log(`Token ID: ${tokenId}`);
  // console.log(`Token URI (IPFS): ${metadata.url}`);
  // console.log("🎉 Deployment, metadata upload, and minting completed!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Deployment FAILED:", err);
    process.exit(1);
  });
