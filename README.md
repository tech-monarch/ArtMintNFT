# ArtMinting NFT Project

## Overview

ArtMinting is a simple NFT minting application using Hardhat, OpenZeppelin and a minimal frontend. It supports:

- Local development (Hardhat)
- Polygon Mumbai testnet (recommended for testing)
- Polygon Mainnet (for production)

Frontend supports optional nft.storage pinning so images/metadata can be stored on IPFS and tokenURI on-chain can be an `ipfs://` URI.

## Project layout

```
art-minting
├── contracts
│   └── ArtNFT.sol
├── scripts
│   └── deploy.js
├── frontend
│   ├── index.html
│   └── app.js
├── hardhat.config.cjs
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Requirements

- Node.js (v16+ recommended)
- npm
- MetaMask browser extension
- (optional) nft.storage API key to pin images/metadata

## Quick install

From project root:

```powershell
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill values:

- INFURA_PROJECT_ID — Infura project id (optional; if blank, public RPCs used)
- POLYGON_PRIVATE_KEY — 0x-prefixed private key for deployer (do NOT commit)
- PLATFORM_WALLET_ADDRESS — address to receive platform fees (optional)
- POLYGONSCAN_API_KEY — for verification (optional)
- MUMBAI_RPC — optional custom RPC for Mumbai

Keep `.env` out of version control.

## NPM scripts (useful)

- npm run compile — compile contracts
- npm run deploy:localhost — deploy to local Hardhat node
- npm run deploy:mumbai — deploy to Polygon Mumbai (set env vars)
- npm run deploy:polygon — deploy to Polygon Mainnet (set env vars)
- npm run start — run `npx hardhat node` (local dev node)

## Deploy & run (recommended test flow)

1. Start local Hardhat node (for local testing)
   ```powershell
   npx hardhat node
   ```
2. Compile
   ```powershell
   npm run compile
   ```
3. Deploy to localhost

   ```powershell
   npm run deploy:localhost
   ```

   This writes `frontend/contract-address.json` and `frontend/abi.json` for the frontend.

4. Serve frontend

   ```powershell
   npx http-server .\frontend -p 8080
   ```

   Open http://127.0.0.1:8080

5. MetaMask (local)

- RPC: http://127.0.0.1:8545
- Chain ID: 31337
- Import one of the Hardhat node private keys printed by `npx hardhat node`

## Deploy to Mumbai (testnet)

1. Set `.env` variables (INFURA_PROJECT_ID or MUMBAI_RPC and POLYGON_PRIVATE_KEY).
2. Compile & deploy:
   ```powershell
   npm run compile
   npm run deploy:mumbai
   ```
3. Serve frontend and point MetaMask to Mumbai (or use the built-in switch helper).  
   Example RPC: `https://rpc-mumbai.maticvigil.com` or `https://polygon-mumbai.infura.io/v3/<PROJECT_ID>`  
   Chain ID: `80001`  
   Currency: `MATIC`  
   Explorer: https://mumbai.polygonscan.com

## Deploy to Polygon Mainnet

1. Ensure `.env` has a funded POLYGON_PRIVATE_KEY and INFURA_PROJECT_ID or use a secure RPC.
2. Deploy:
   ```powershell
   npm run deploy:polygon
   ```
3. Use RPC: `https://polygon-mainnet.infura.io/v3/<PROJECT_ID>` or public `https://polygon-rpc.com`  
   Chain ID: `137`  
   Currency: `MATIC`  
   Explorer: https://polygonscan.com

## Frontend usage

- Connect MetaMask
- Upload image, click "Generate Hash"
- (Optional) Paste nft.storage API key in UI to pin image+metadata to IPFS (recommended)
- Click Mint and confirm MetaMask transaction
- UI shows minted tokenId and tokenURI after confirmation

Notes:

- The contract exposes a MINTING_COST constant (read by frontend). Ensure your wallet has sufficient MATIC on the selected network.
- If using nft.storage, keep the API key secret; consider server-side pinning for production.

## MetaMask network settings (example)

For Polygon Mainnet:

- Network name: Polygon Mainnet
- RPC URL: https://polygon-mainnet.infura.io/v3/<INFURA_PROJECT_ID> (replace token) or https://polygon-rpc.com
- Chain ID: 137
- Currency Symbol: MATIC
- Block Explorer URL: https://polygonscan.com

For Mumbai:

- RPC URL: https://rpc-mumbai.maticvigil.com or https://polygon-mumbai.infura.io/v3/<PROJECT_ID>
- Chain ID: 80001
- Explorer: https://mumbai.polygonscan.com

## Testing & verification

- Use `npx hardhat console --network <network>` to interact with deployed contract and inspect events.
- Use `art.queryFilter(art.filters.Minted())` to list Minted events.

## Security & production notes

- Test thoroughly on Mumbai before mainnet.
- Never commit private keys or `.env`.
- Review platform wallet address and gas costs before mainnet deploy.

## Contributing & support

Open an issue or pull request in the GitHub repo. For help connecting to Polygon or CI/CD, contact the maintainer.

## License

MIT
