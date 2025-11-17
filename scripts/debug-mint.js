const hre = require("hardhat");

async function main() {
  const addr = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const art = await hre.ethers.getContractAt("ArtNFT", addr);

  const cost = await art.MINTING_COST();
  console.log(
    "MINTING_COST (wei):",
    cost.toString(),
    "=>",
    hre.ethers.utils.formatEther(cost),
    "ETH"
  );

  const metadata = JSON.stringify({
    imageHash: "0xabc",
    artist: "test",
    title: "t",
    description: "d",
  });

  try {
    const result = await art.callStatic.mint(metadata, { value: cost });
    console.log("callStatic result (would succeed):", result.toString());
  } catch (e) {
    console.error("callStatic revert / reason:", e);
  }

  try {
    const [signer] = await hre.ethers.getSigners();
    const tx = await art
      .connect(signer)
      .mint(metadata, { value: cost, gasLimit: 500000 });
    await tx.wait();
    console.log("tx success", tx.hash);
  } catch (e) {
    console.error("mint threw:", e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
