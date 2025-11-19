// test-nft.js
require("dotenv").config();
const { NFTStorage, File } = require("nft.storage");
const fs = require("fs");

const NFT_STORAGE_KEY = process.env.NFT_STORAGE_KEY;

async function main() {
  if (!NFT_STORAGE_KEY) {
    console.error("NFT_STORAGE_KEY is not set in .env");
    process.exit(1);
  }

  console.log("Using NFT_STORAGE_KEY:", NFT_STORAGE_KEY);

  try {
    const nft = new NFTStorage({ token: NFT_STORAGE_KEY });
    const data = fs.readFileSync("./scripts/example-image.jpg"); // make sure this file exists
    const metadata = await nft.store({
      name: "Test NFT",
      description: "Testing NFT.Storage key",
      image: new File([data], "example-image.png", { type: "image/png" }),
    });
    console.log("✅ Upload successful!");
    console.log("IPFS URL:", metadata.url);
  } catch (err) {
    console.error("❌ Upload failed:", err);
  }
}

main();
