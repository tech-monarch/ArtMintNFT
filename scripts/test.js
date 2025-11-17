const addr = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // deployed address
const art = await ethers.getContractAt("ArtNFT", addr);

// token owner and metadata
console.log("ownerOf(1):", await art.ownerOf(1));
console.log("tokenURI(1):", await art.tokenURI(1));

// get emitted Minted events from provider (example)
const filter = art.filters.Minted(null, null);
const events = await art.queryFilter(filter);
console.log(events);
