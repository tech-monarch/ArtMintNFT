const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ArtNFT", function () {
  let Art, art, owner, alice, platform;

  beforeEach(async () => {
    [owner, alice, platform] = await ethers.getSigners();
    Art = await ethers.getContractFactory("ArtNFT");
    art = await Art.deploy(platform.address);
    await art.deployed();
  });

  it("mints when paid exact cost and emits Minted", async () => {
    const cost = await art.MINTING_COST();
    await expect(art.connect(alice).mint('{"test":"meta"}', { value: cost }))
      .to.emit(art, "Minted")
      .withArgs(alice.address, 1, '{"test":"meta"}', cost);
    expect(await art.ownerOf(1)).to.equal(alice.address);
  });

  it("reverts when underpaid", async () => {
    const cost = await art.MINTING_COST();
    await expect(
      art.connect(alice).mint("x", { value: cost.sub(1) })
    ).to.be.revertedWith("ArtNFT: Insufficient payment for minting");
  });

  it("forwards fee to platform and refunds excess", async () => {
    const cost = await art.MINTING_COST();
    const platformBefore = await ethers.provider.getBalance(platform.address);
    const aliceBefore = await ethers.provider.getBalance(alice.address);

    // send double value; gasPrice set to 0 to simplify balance math on local node
    const tx = await art
      .connect(alice)
      .mint('{"a":1}', { value: cost.mul(2), gasPrice: 0 });
    const receipt = await tx.wait();

    const platformAfter = await ethers.provider.getBalance(platform.address);
    expect(platformAfter.sub(platformBefore)).to.equal(cost);

    // ensure token minted
    expect(await art.ownerOf(1)).to.equal(alice.address);
  });

  it("owner can withdraw contract balance to platform wallet", async () => {
    // send some value directly to contract
    await owner.sendTransaction({
      to: art.address,
      value: ethers.utils.parseEther("0.05"),
    });
    const platformBefore = await ethers.provider.getBalance(platform.address);

    await expect(art.connect(owner).withdraw()).to.emit(art, "Withdraw");

    const platformAfter = await ethers.provider.getBalance(platform.address);
    expect(platformAfter.sub(platformBefore)).to.be.gt(0);
  });
});
