// Install: npm install nft.storage
import { NFTStorage, File } from 'nft.storage';
import { readFile } from 'fs/promises';

// === Configuration ===
// Use a NEW key generated from the NFT.storage website.
const NFT_STORAGE_KEY = "982608d6.7bbab07caca14418a9924e0eacf8f768"; 
const filePath = "nft.png"; 

async function uploadFileWithLibrary() {
    // ... (Error handling and logging removed for brevity, see previous answer for full code)

    // Create the client
    const storage = new NFTStorage({ token: NFT_STORAGE_KEY });

    try {
        const data = await readFile(filePath);
        
        // Use 'image/png' or the correct MIME type for your file
        const file = new File([data], filePath, { type: 'image/png' }); 

        // 🛑 This method uploads the raw file data without contract details 
        const cid = await storage.storeBlob(file);

        console.log(`✅ Upload successful!`);
        console.log(`🔗 File CID: ${cid}`);

    } catch (error) {
        console.error("\n\n❌ Upload Failed! (Check your API Key and Network connection)");
        console.error("Error Details:", error.message);
    }
}

uploadFileWithLibrary();