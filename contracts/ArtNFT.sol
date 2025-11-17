// filepath: art-minting/contracts/ArtNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract ArtNFT is ERC721URIStorage, Ownable {
    using Address for address payable;

    uint256 public tokenCounter;
    address payable public platformWallet;
    uint256 public constant MINTING_COST = 1 ether;

    event Minted(address indexed minter, uint256 indexed tokenId, string tokenURI, uint256 valueReceived);

    constructor(address payable _platformWallet) ERC721("ArtNFT", "ART") {
        require(_platformWallet != address(0), "ArtNFT: platform wallet is zero address");
        platformWallet = _platformWallet;
        tokenCounter = 0;
    }

    function mint(string memory tokenURI) public payable returns (uint256) {
        require(msg.value >= MINTING_COST, "ArtNFT: Insufficient payment for minting");

        uint256 newTokenId = tokenCounter + 1;
        tokenCounter = newTokenId;

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        uint256 excess = msg.value - MINTING_COST;
        if (excess > 0) {
            payable(platformWallet).sendValue(excess);
        }

        emit Minted(msg.sender, newTokenId, tokenURI, msg.value);
        return newTokenId;
    }

    function setPlatformWallet(address payable _wallet) external onlyOwner {
        require(_wallet != address(0), "ArtNFT: invalid platform wallet");
        platformWallet = _wallet;
    }

    receive() external payable {}
}