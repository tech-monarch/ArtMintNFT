document.addEventListener("DOMContentLoaded", () => {
  (async function () {
    // load contract metadata written by deploy script
    let CONTRACT_ADDRESS = null;
    let contractABI = null;
    try {
      const r = await fetch("contract-address.json");
      if (r.ok) {
        const j = await r.json();
        CONTRACT_ADDRESS = j.address;
      }
    } catch (e) {
      console.warn("contract-address.json load failed", e);
    }
    try {
      const a = await fetch("abi.json");
      if (a.ok) contractABI = (await a.json()).abi;
    } catch (e) {
      console.warn("abi.json load failed", e);
    }

    CONTRACT_ADDRESS =
      CONTRACT_ADDRESS || "0x83adc731564072ca4750e193e5068239a3b2407e";
    contractABI = contractABI || [
      "function mint(string tokenURI) public payable returns (uint256)",
      "function MINTING_COST() public view returns (uint256)",
      "function tokenURI(uint256 tokenId) view returns (string)",
      "event Minted(address indexed minter, uint256 indexed tokenId, string tokenURI, uint256 valueReceived)",
    ];

    // Allowed chains and display names
    const CHAIN_INFO = {
      31337: { name: "Localhost", symbol: "ETH" },
      80001: { name: "Mumbai Testnet", symbol: "MATIC" },
      137: { name: "Polygon Mainnet", symbol: "MATIC" },
    };

    // DOM refs
    let connectBtn = document.getElementById("connectWallet");
    // fallback: if id changed, try class selector
    if (!connectBtn)
      connectBtn =
        document.querySelector(".btn-wallet") ||
        document.querySelector("button");

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
    const nftStorageKeyInput = document.getElementById("nftStorageKey");

    let provider, signer, contract;
    let accounts = [];
    let generatedHash = "";
    let imageFile = null;
    let MINT_PRICE_WEI = null;
    let currentChainId = null;

    function setStatus(type, text) {
      statusMessage.style.display = "block";
      statusMessage.className = "status";
      if (type === "loading") {
        statusMessage.innerHTML = `<span class="loading"></span>${text}`;
      } else {
        statusMessage.textContent = text;
      }
      if (type === "success") statusMessage.classList.add("success");
      if (type === "error") statusMessage.classList.add("error");
    }

    async function switchToChain(chainId) {
      if (!window.ethereum) throw new Error("MetaMask not available");
      const hex = "0x" + chainId.toString(16);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hex }],
        });
        return true;
      } catch (switchError) {
        // 4902 indicates the chain is not added in MetaMask
        if (switchError.code === 4902) {
          // Add network parameters for Polygon / Mumbai
          const params =
            chainId === 137
              ? {
                  chainId: "0x89",
                  chainName: "Polygon Mainnet",
                  nativeCurrency: {
                    name: "Matic",
                    symbol: "MATIC",
                    decimals: 18,
                  },
                  rpcUrls: [
                    process.env && process.env.POLYGON_RPC
                      ? process.env.POLYGON_RPC
                      : `https://polygon-rpc.com`,
                  ],
                  blockExplorerUrls: ["https://polygonscan.com/"],
                }
              : {
                  chainId: "0x13881",
                  chainName: "Polygon Mumbai Testnet",
                  nativeCurrency: {
                    name: "Matic",
                    symbol: "MATIC",
                    decimals: 18,
                  },
                  rpcUrls: [
                    process.env && process.env.MUMBAI_RPC
                      ? process.env.MUMBAI_RPC
                      : `https://rpc-mumbai.maticvigil.com`,
                  ],
                  blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
                };
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [params],
            });
            return true;
          } catch (addError) {
            console.warn("wallet_addEthereumChain failed", addError);
            return false;
          }
        } else {
          console.warn("wallet_switchEthereumChain failed", switchError);
          return false;
        }
      }
    }

    function updateNetworkUI(chainId) {
      currentChainId = chainId;
      const info = CHAIN_INFO[chainId] || {
        name: `chainId ${chainId}`,
        symbol: "NATIVE",
      };
      networkIndicator.textContent = `Network: ${info.name} (chainId ${chainId})`;
    }

    async function connectWallet() {
      if (!window.ethereum) {
        setStatus("error", "MetaMask not found. Install MetaMask.");
        return;
      }
      try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        accounts = await provider.listAccounts();
        walletAddressEl.textContent = accounts[0] || ""; //the faulty line
        walletStatusEl.textContent = accounts.length
          ? `Connected Wallet: ${accounts[0].slice(0, 6)}...${accounts[0].slice(
              -4
            )}`
          : "Not connected";

        const net = await provider.getNetwork();
        updateNetworkUI(net.chainId);

        // if not supported chain, suggest switch to Mumbai (for testing) or Polygon
        if (![80001, 137, 31337].includes(net.chainId)) {
          setStatus(
            "error",
            `Unsupported network (chainId ${net.chainId}). Switch to Mumbai (80001) or Polygon (137).`
          );
        }

        contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

        try {
          MINT_PRICE_WEI = await contract.MINTING_COST();
          console.log("MINTING_COST (wei):", MINT_PRICE_WEI.toString());
        } catch (e) {
          MINT_PRICE_WEI = ethers.utils.parseEther("1.0");
          console.warn("Could not read MINTING_COST; using 1.0", e);
        }

        setStatus("success", `Wallet connected: ${accounts[0]}`);
        window.ethereum.on("accountsChanged", (newAcc) => {
          accounts = newAcc;
          walletAddressEl.textContent = accounts[0] || "";
        });
        window.ethereum.on("chainChanged", (hexChain) => {
          const id = parseInt(hexChain, 16);
          updateNetworkUI(id);
          // reload to re-init contract if network changed
          location.reload();
        });
      } catch (err) {
        console.error(err);
        setStatus("error", "Connection failed: " + (err?.message || err));
      }
    }

    // handle file upload / hash generation (unchanged behavior)
    imageUpload.addEventListener("click", () => artFile.click());
    imageUpload.addEventListener("dragover", (e) => {
      e.preventDefault();
      imageUpload.style.borderColor = "var(--primary)";
    });
    imageUpload.addEventListener("dragleave", () => {
      imageUpload.style.borderColor = "#ced4da";
    });
    imageUpload.addEventListener("drop", (e) => {
      e.preventDefault();
      imageUpload.style.borderColor = "#ced4da";
      if (e.dataTransfer.files.length) {
        artFile.files = e.dataTransfer.files;
        handleImageUpload();
      }
    });
    artFile.addEventListener("change", handleImageUpload);
    generateHashBtn.addEventListener("click", generateArtHash);
    mintBtn.addEventListener("click", mintArtwork);
    // safe attach for connect button
    if (connectBtn) {
      connectBtn.addEventListener("click", connectWallet);
    } else {
      console.warn("Connect button not found in DOM");
    }

    function handleImageUpload() {
      const file = artFile.files[0];
      if (file && file.type.match("image.*")) {
        imageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.src = e.target.result;
          imagePreview.style.display = "block";
          imageUpload.querySelector("p").textContent = file.name;
          generateHashBtn.disabled = false;
        };
        reader.readAsDataURL(file);
      }
    }

    async function generateArtHash() {
      if (!imageFile) {
        setStatus("error", "Please upload an image first");
        return;
      }
      try {
        setStatus("loading", "Generating hash...");
        generateHashBtn.disabled = true;
        const buffer = await imageFile.arrayBuffer();
        const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
        const hashArr = Array.from(new Uint8Array(hashBuf));
        generatedHash = hashArr
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const ts = new Date().toISOString();
        // show hash and generated timestamp
        hashDisplay.innerHTML = `<strong>Artwork Hash:</strong> <span id="artHashText">${generatedHash}</span><br><strong>Generated At:</strong> ${ts}`;
        hashDisplay.style.display = "block";

        // add / update copy button next to the hash
        // remove existing copy button if present
        const existingCopy = document.getElementById("copyHashBtn");
        if (existingCopy) existingCopy.remove();

        const copyBtn = document.createElement("button");
        copyBtn.id = "copyHashBtn";
        copyBtn.type = "button";
        copyBtn.className = "btn";
        copyBtn.style.marginTop = "8px";
        copyBtn.style.marginLeft = "10px";
        copyBtn.textContent = "Copy Hash";
        copyBtn.addEventListener("click", async () => {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(generatedHash);
            } else {
              // fallback
              const tmp = document.createElement("textarea");
              tmp.value = generatedHash;
              document.body.appendChild(tmp);
              tmp.select();
              document.execCommand("copy");
              tmp.remove();
            }
            const old = copyBtn.textContent;
            copyBtn.textContent = "Copied";
            setTimeout(() => {
              copyBtn.textContent = old;
            }, 2000);
          } catch (err) {
            console.warn("Copy failed", err);
            setStatus("error", "Copy to clipboard failed");
          }
        });
        hashDisplay.appendChild(copyBtn);
        hashDisplay.style.display = "block";
        setStatus("success", "Hash generated successfully");
        if (accounts.length) mintBtn.disabled = false;
      } catch (e) {
        console.error(e);
        setStatus("error", "Failed to generate hash");
        generateHashBtn.disabled = false;
      }
    }

    async function mintArtwork() {
      if (!generatedHash) {
        setStatus("error", "Please generate a hash first");
        return;
      }
      if (!accounts.length) {
        setStatus("error", "Connect your wallet first");
        return;
      }

      // enforce supported chain
      const supported = [31337, 80001, 137];
      if (!supported.includes(currentChainId)) {
        // try to auto-switch to Mumbai (preferred for testing)
        const switched = await switchToChain(80001).catch(() => false);
        if (!switched) {
          setStatus(
            "error",
            "Please switch MetaMask to Mumbai (80001) or Polygon (137) and retry."
          );
          return;
        }
        // reload to reconnect
        location.reload();
        return;
      }

      const currency = CHAIN_INFO[currentChainId]?.symbol || "NATIVE";
      setStatus(
        "loading",
        `Minting your artwork. Confirm in MetaMask (price in ${currency})...`
      );
      mintBtn.disabled = true;
      try {
        const meta = JSON.stringify({
          imageHash: generatedHash,
          artist: (artistInput.value || "").trim(),
          title: (titleInput.value || "").trim(),
          description: (descInput.value || "").trim(),
          timestamp: new Date().toISOString(),
        });

        const value = MINT_PRICE_WEI || ethers.utils.parseEther("1.0");
        try {
          await contract.estimateGas.mint(meta, { value });
        } catch (e) {
          console.warn("estimateGas failed", e);
        }

        const tx = await contract.mint(meta, { value });
        setStatus(
          "loading",
          "Transaction submitted: " + tx.hash + " — waiting for confirmation..."
        );
        const receipt = await tx.wait();

        // event parse
        let mintedId = null;
        if (receipt.events) {
          for (const ev of receipt.events) {
            if (ev.event === "Minted") {
              const args = ev.args || {};
              mintedId = args.tokenId || args[2] || null;
              break;
            }
          }
        }
        if (mintedId) {
          setStatus(
            "success",
            `Minted! Your artwork ID is ${mintedId}. View on <a target="_blank" href="https://polygonscan.com/tx/${tx.hash}">Polygonscan</a>`
          );
        } else {
          setStatus("success", "Minted! Transaction confirmed.");
        }
        mintBtn.disabled = false;
      } catch (e) {
        console.error(e);
        setStatus("error", "Minting failed: " + (e.message || e));
        mintBtn.disabled = false;
      }
    }

    // ensure button touch friendliness: add pointer events fallback
    function addClickListener(el, handler) {
      if (!el) return;
      el.addEventListener("click", handler);
      el.addEventListener(
        "touchstart",
        function touchHandler(e) {
          e.preventDefault();
          handler(e);
        },
        { once: false }
      );
    }

    // example: attach to generate and mint buttons safely
    // const generateHashBtn = document.getElementById("generateHashBtn");
    // const mintBtn = document.getElementById("mintBtn");
    if (generateHashBtn) addClickListener(generateHashBtn, generateArtHash);
    if (mintBtn) addClickListener(mintBtn, mintArtwork);

    // existing generateArtHash implementation should append #copyHashBtn inside hashDisplay.
    // ensure any copy button created earlier uses .btn class (styling handled in CSS).
  })().catch(console.error);
});
