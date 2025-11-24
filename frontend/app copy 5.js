// frontend/app.js

document.addEventListener("DOMContentLoaded", () => {
  (async function () {
    // --- load contract metadata
    let CONTRACT_ADDRESS = null;
    let contractABI = null;

    try {
      const r = await fetch("contracts/contract-address.json");
      if (r.ok) CONTRACT_ADDRESS = (await r.json()).address;
    } catch (e) {
      console.warn("contract-address.json load failed", e);
    }

    try {
      const a = await fetch("contracts/abi.json");
      if (a.ok) contractABI = await a.json();
    } catch (e) {
      console.warn("abi.json load failed", e);
    }

    CONTRACT_ADDRESS =
      CONTRACT_ADDRESS || window.CONTRACT_ADDRESS_OVERRIDE || "0x83adc731564072ca4750e193e5068239a3b2407e";
    if (contractABI && contractABI.abi) contractABI = contractABI.abi;
    contractABI = contractABI || [
      "function mint(string tokenURI) public payable returns (uint256)",
      "function MINTING_COST() public view returns (uint256)",
      "function tokenURI(uint256 tokenId) view returns (string)",
      "event Minted(address indexed minter, uint256 indexed tokenId, string tokenURI, uint256 valueReceived)",
    ];

    // --- DOM refs
    const connectBtn = document.getElementById("connectWallet");
    const walletAddressEl = document.getElementById("walletAddress");
    const walletStatusEl = document.getElementById("walletStatus");
    const networkIndicator = document.getElementById("networkIndicator");
    const generateHashBtn = document.getElementById("generateHashBtn");
    const mintBtn = document.getElementById("mintBtn");
    const imageUpload = document.getElementById("imageUpload");
    const artFile = document.getElementById("artFile");
    const imagePreview = document.getElementById("imagePreview");
    const hashDisplay = document.getElementById("hashDisplay");
    const statusMessage = document.getElementById("statusMessage");
    const artistInput = document.getElementById("artistName");
    const titleInput = document.getElementById("artTitle");
    const descInput = document.getElementById("description");

    // Mint result UI
    const mintResult = document.getElementById("mintResult");
    const mintContract = document.getElementById("mintContract");
    const mintToken = document.getElementById("mintToken");
    const mintMetadataLink = document.getElementById("mintMetadataLink");
    const copyContractBtn = document.getElementById("copyContractBtn");
    const copyTokenBtn = document.getElementById("copyTokenBtn");
    const copyMetadataBtn = document.getElementById("copyMetadataBtn");

    // Metadata preview
    const metadataDisplay = document.getElementById("metadataDisplay");
    const previewImage = document.getElementById("previewImage");
    const previewTitle = document.getElementById("previewTitle");
    const previewArtist = document.getElementById("previewArtist");
    const previewDescription = document.getElementById("previewDescription");
    const previewHash = document.getElementById("previewHash");

    let provider, signer, contract;
    let accounts = [];
    let generatedHash = "";
    let imageFile = null;
    let MINT_PRICE_WEI = null;
    let currentChainId = null;

    const NFT_STORAGE_KEY = window.NFT_STORAGE_KEY || "";

    // --- Status helper
    function setStatus(type, text) {
      if (!statusMessage) return;
      statusMessage.style.display = "block";
      statusMessage.className = "status";
      if (type === "loading") statusMessage.innerHTML = `<span class="loading"></span>${text}`;
      else statusMessage.textContent = text;
      if (type === "success") statusMessage.classList.add("success"); else statusMessage.classList.remove("success");
      if (type === "error") statusMessage.classList.add("error"); else statusMessage.classList.remove("error");
    }

    // --- Network info
    const CHAIN_INFO = { 137: { name: "Polygon Mainnet", symbol: "MATIC" } };
    function updateNetworkUI(chainId) {
      currentChainId = chainId;
      const info = CHAIN_INFO[chainId] || { name: `chainId ${chainId}`, symbol: "NATIVE" };
      if (networkIndicator) networkIndicator.textContent = `Network: ${info.name} (chainId ${chainId})`;
    }

    async function switchToPolygon() {
      if (!window.ethereum) throw new Error("MetaMask not available");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x89" }],
        });
        return true;
      } catch (err) {
        if (err.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x89",
              chainName: "Polygon Mainnet",
              nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
              rpcUrls: ["https://polygon-rpc.com"],
              blockExplorerUrls: ["https://polygonscan.com"],
            }],
          });
          return true;
        }
        return false;
      }
    }

    // --- Wallet connection
    async function connectWallet() {
      if (!window.ethereum) { setStatus("error", "MetaMask not found"); return; }
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
      accounts = await provider.listAccounts();
      walletAddressEl && (walletAddressEl.textContent = accounts[0] || "");
      walletStatusEl && (walletStatusEl.textContent = accounts.length ? `Connected Wallet: ${accounts[0].slice(0,6)}...${accounts[0].slice(-4)}` : "Not connected");

      const net = await provider.getNetwork();
      if (net.chainId !== 137) {
        const switched = await switchToPolygon();
        if (!switched) { setStatus("error", "Switch to Polygon Mainnet and retry"); return; }
        location.reload();
      }
      updateNetworkUI(137);

      contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      try { MINT_PRICE_WEI = await contract.MINTING_COST(); } catch { MINT_PRICE_WEI = ethers.utils.parseEther("1.0"); }

      setStatus("success", `Wallet connected: ${accounts[0]}`);

      window.ethereum.on("accountsChanged", (newAcc) => { accounts = newAcc; walletAddressEl && (walletAddressEl.textContent = accounts[0] || ""); });
      window.ethereum.on("chainChanged", () => location.reload());
    }

    // --- File upload + drag/drop
    imageUpload?.addEventListener("click", () => artFile?.click());
    imageUpload?.addEventListener("dragover", (e) => { e.preventDefault(); imageUpload.style.borderColor = "var(--primary)"; });
    imageUpload?.addEventListener("dragleave", () => { imageUpload.style.borderColor = "#ced4da"; });
    imageUpload?.addEventListener("drop", (e) => {
      e.preventDefault();
      imageUpload.style.borderColor = "#ced4da";
      if (e.dataTransfer.files.length) { artFile.files = e.dataTransfer.files; handleImageUpload(); }
    });
    artFile?.addEventListener("change", handleImageUpload);

    function handleImageUpload() {
      const file = artFile.files[0];
      if (!file || !file.type.match("image.*")) { setStatus("error", "Upload an image file"); return; }
      imageFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (imagePreview) { imagePreview.src = e.target.result; imagePreview.style.display = "block"; }
        generateHashBtn.disabled = false;
      };
      reader.readAsDataURL(file);
    }

    // --- Generate hash
    async function generateArtHash() {
      if (!imageFile) { setStatus("error","Upload image first"); return; }
      setStatus("loading","Generating hash...");
      const buffer = await imageFile.arrayBuffer();
      generatedHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)))
        .map(b => b.toString(16).padStart(2,"0")).join("");
      if (hashDisplay) { hashDisplay.innerHTML = `<strong>Hash:</strong> ${generatedHash}`; hashDisplay.style.display="block"; }

      // Show preview
      if (metadataDisplay && previewImage && previewTitle && previewArtist && previewDescription && previewHash) {
        previewImage.src = URL.createObjectURL(imageFile);
        previewTitle.textContent = titleInput.value || "Untitled";
        previewArtist.textContent = artistInput.value || "";
        previewDescription.textContent = descInput.value || "";
        previewHash.textContent = generatedHash;
        metadataDisplay.style.display = "block";
      }

      setStatus("success","Hash generated");
      if (accounts.length) mintBtn.disabled = false;
    }

    // --- NFT.storage helpers
    async function uploadFileToNFTStorage(file) {
      if (!NFT_STORAGE_KEY) throw new Error("NFT.storage key not set");
      const resp = await fetch("https://api.nft.storage/upload", { method: "POST", headers: { Authorization: `Bearer ${NFT_STORAGE_KEY}` }, body: file });
      if (!resp.ok) throw new Error("NFT.storage upload failed");
      return (await resp.json()).value.cid;
    }

    async function uploadJSONToNFTStorage(jsonObj) {
      return uploadFileToNFTStorage(new Blob([JSON.stringify(jsonObj, null,2)], { type:"application/json" }));
    }
    function ipfsGatewayUrl(cid) { return `https://ipfs.io/ipfs/${cid}`; }

    // --- Copy to clipboard
    function copyToClipboard(text) {
      if (!text) return setStatus("error","Nothing to copy");
      navigator.clipboard.writeText(text).then(() => setStatus("success","Copied!"), () => setStatus("error","Copy failed"));
    }

    // --- Mint
    async function mintArtwork() {
      try {
        if (!generatedHash) { setStatus("error","Generate hash first"); return; }
        if (!accounts.length) { setStatus("error","Connect wallet first"); return; }
        if (!imageFile) { setStatus("error","No image"); return; }

        setStatus("loading","Uploading to IPFS...");
        mintBtn.disabled = true;

        const imageCid = await uploadFileToNFTStorage(imageFile);
        const metadata = {
          name: (titleInput.value || "Untitled").trim(),
          description: (descInput.value || "").trim(),
          artist: (artistInput.value || "").trim(),
          image: `ipfs://${imageCid}`,
          properties: { sha256: generatedHash, createdAt: new Date().toISOString() }
        };
        const metadataCid = await uploadJSONToNFTStorage(metadata);
        const tokenURI = `ipfs://${metadataCid}`;

        setStatus("loading","Calling contract...");
        const value = MINT_PRICE_WEI || ethers.utils.parseEther("1.0");

        try { await contract.estimateGas.mint(tokenURI,{value}); } catch(e){ console.warn("Gas estimation failed",e); }

        const tx = await contract.mint(tokenURI,{value});
        setStatus("loading",`TX submitted: ${tx.hash} — waiting for confirmation...`);
        const receipt = await tx.wait();

        // parse Minted or fallback Transfer
        let mintedId = null, mintedTokenURI = tokenURI;
        if (receipt.events) {
          for (const ev of receipt.events) {
            if (ev.event==="Minted") { mintedId=ev.args?.tokenId?.toString(); mintedTokenURI=ev.args?.tokenURI||mintedTokenURI; break; }
            if (!mintedId && ev.event==="Transfer") mintedId=ev.args?.tokenId?.toString();
          }
        }

        // Update UI
        if (mintContract) mintContract.textContent = CONTRACT_ADDRESS;
        if (mintToken) mintToken.textContent = mintedId||"(unknown)";
        if (mintMetadataLink) { mintMetadataLink.textContent=mintedTokenURI; mintMetadataLink.href=mintedTokenURI.startsWith("ipfs://")?ipfsGatewayUrl(mintedTokenURI.replace("ipfs://","")):mintedTokenURI; }
        if (mintResult) mintResult.style.display="block";

        // Copy handlers
        if (copyContractBtn) copyContractBtn.onclick=()=>copyToClipboard(CONTRACT_ADDRESS);
        if (copyTokenBtn) copyTokenBtn.onclick=()=>copyToClipboard(mintedId||"");
        if (copyMetadataBtn) copyMetadataBtn.onclick=()=>copyToClipboard(mintedTokenURI);

        // Local storage backup
        try {
          const allMints = JSON.parse(localStorage.getItem("allMints")||"[]");
          allMints.push({
            tokenId: mintedId||null,
            contract: CONTRACT_ADDRESS,
            tokenURI: mintedTokenURI,
            artist: artistInput.value?.trim()||"",
            title: titleInput.value?.trim()||"Untitled",
            description: descInput.value?.trim()||"",
            imageFileName: imageFile?.name||null,
            imageCid,
            metadataCid,
            sha256: generatedHash,
            mintedAt: new Date().toISOString()
          });
          localStorage.setItem("allMints",JSON.stringify(allMints,null,2));
        } catch(e){ console.warn("Failed saving local mints", e); }

        setStatus("success", `Minted! Token ID: ${mintedId||"(check contract)"}`);
        mintBtn.disabled=false;

      } catch(e){ console.error(e); setStatus("error","Mint failed: "+(e.message||e)); mintBtn.disabled=false; }
    }

    // --- Event listeners
    generateHashBtn?.addEventListener("click", generateArtHash);
    mintBtn?.addEventListener("click", mintArtwork);
    connectBtn?.addEventListener("click", connectWallet);

  })().catch(console.error);
});
