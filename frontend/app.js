// === app.js ===
const artFile = document.getElementById("artFile");
const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");
const generateBtn = document.getElementById("generateHashBtn");
const mintBtn = document.getElementById("mintBtn");
const hashDisplay = document.getElementById("hashDisplay");
const copyBtn = document.getElementById("copyHashBtn");
const status = document.getElementById("statusMessage");

// Preview elements
const previewImage = document.getElementById("previewImage");
const previewTitle = document.getElementById("previewTitle");
const previewArtist = document.getElementById("previewArtist");
const previewDescription = document.getElementById("previewDescription");
const previewHash = document.getElementById("previewHash");

// Mint result elements
const mintResult = document.getElementById("mintResult");
const mintContract = document.getElementById("mintContract");
const mintToken = document.getElementById("mintToken");
const mintMetadataLink = document.getElementById("mintMetadataLink");

// PINATA config
const PINATA_API_KEY = "24d727b6a10f15e2b20f";
const PINATA_API_SECRET = "d43b67e5ae482cbc16c1dadb6749cb5d44feb7b7e999546cc55fb71225833f42";

// File upload handling
imageUpload.addEventListener("click", () => artFile.click());
artFile.addEventListener("change", () => {
  if (artFile.files && artFile.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = "block";
      showStatus("File loaded successfully", "success");
      generateBtn.disabled = false;
    };
    reader.readAsDataURL(artFile.files[0]);
  }
});

// Show status messages
function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = "block";
  setTimeout(() => status.style.display = "none", 4000);
}

// Generate SHA-256 hash
generateBtn.addEventListener("click", async () => {
  const title = document.getElementById("artTitle").value.trim();
  const artist = document.getElementById("artistName").value.trim();
  const description = document.getElementById("description").value.trim();

  if (!title || !artist) {
    showStatus("Title and Artist are required!", "error");
    return;
  }

  if (!artFile.files[0]) {
    showStatus("Please upload artwork first!", "error");
    return;
  }

  // Generate a SHA-256 hash of the file
  const arrayBuffer = await artFile.files[0].arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  hashDisplay.textContent = hashHex;
  hashDisplay.style.display = "block";
  copyBtn.style.display = "inline-block";
  mintBtn.disabled = false;

  // Show NFT preview
  previewImage.src = imagePreview.src;
  previewTitle.textContent = title;
  previewArtist.textContent = artist;
  previewDescription.textContent = description;
  previewHash.textContent = hashHex;

  // Add timestamp
  const timestamp = new Date().toLocaleString();
  hashDisplay.textContent += `\nTimestamp: ${timestamp}`;
  showStatus("Hash generated successfully!", "success");
});

// Copy hash button
copyBtn.addEventListener("click", () => {
  if (!hashDisplay.textContent) return;
  navigator.clipboard.writeText(hashDisplay.textContent)
    .then(() => showStatus("Hash copied to clipboard!", "success"))
    .catch(() => showStatus("Failed to copy hash!", "error"));
});

// Mint NFT (upload to Pinata)
mintBtn.addEventListener("click", async () => {
  const title = document.getElementById("artTitle").value.trim();
  const artist = document.getElementById("artistName").value.trim();
  const description = document.getElementById("description").value.trim();

  if (!artFile.files[0] || !hashDisplay.textContent) {
    showStatus("Generate hash before minting!", "error");
    return;
  }

  mintBtn.disabled = true;
  showStatus("Uploading to Pinata...", "success");

  const formData = new FormData();
  formData.append("file", artFile.files[0]);

  try {
    // Upload image to Pinata
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINATA_API_SECRET}`
      },
      body: formData
    });

    if (!res.ok) throw new Error("Pinata upload failed");
    const data = await res.json();
    const ipfsHash = data.IpfsHash;
    const metadata = {
      name: title,
      artist,
      description,
      image: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      hash: hashDisplay.textContent,
      timestamp: new Date().toISOString()
    };

    // Display mint result
    mintResult.style.display = "block";
    mintContract.textContent = "0xYourContractAddress"; // replace with actual
    mintToken.textContent = "1"; // replace with actual tokenId
    mintMetadataLink.textContent = `View Metadata`;
    mintMetadataLink.href = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    showStatus("Artwork uploaded and minted successfully!", "success");

  } catch (err) {
    showStatus(err.message, "error");
  } finally {
    mintBtn.disabled = false;
  }
});

// Copy buttons for mint result
document.getElementById("copyContractBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(mintContract.textContent);
  showStatus("Contract copied!", "success");
});
document.getElementById("copyTokenBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(mintToken.textContent);
  showStatus("Token ID copied!", "success");
});
document.getElementById("copyMetadataBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(mintMetadataLink.href);
  showStatus("Metadata link copied!", "success");
});
