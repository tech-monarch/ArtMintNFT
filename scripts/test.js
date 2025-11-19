const addr = "0x83adc731564072ca4750e193e5068239a3b2407e"; // deployed address
const art = await ethers.getContractAt("ArtNFT", addr);

// token owner and metadata
console.log("ownerOf(1):", await art.ownerOf(1));
console.log("tokenURI(1):", await art.tokenURI(1));

// get emitted Minted events from provider (example)
const filter = art.filters.Minted(null, null);
const events = await art.queryFilter(filter);
console.log(events);
