// contracts/ArtNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract ArtNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Address for address payable;

    uint256 public tokenCounter;
    address payable public platformWallet;
    // NOTE: `1 ether` here is unit denomination (wei). On Polygon the native token is MATIC,
    // so this implies a cost of 1 MATIC (in wei).
    uint256 public constant MINTING_COST = 1 ether;

    event Minted(address indexed minter, uint256 indexed tokenId, string tokenURI, uint256 valueReceived);
    event Withdraw(address indexed to, uint256 amount);
    event PlatformWalletChanged(address indexed previous, address indexed current);

    constructor(address payable _platformWallet) ERC721("ArtNFT", "ART") {
        require(_platformWallet != address(0), "ArtNFT: platform wallet is zero address");
        platformWallet = _platformWallet;
        tokenCounter = 0;
    }

    function mint(string memory tokenURI) public payable nonReentrant returns (uint256) {
        require(msg.value >= MINTING_COST, "ArtNFT: Insufficient payment for minting");

        // forward the required minting cost to platform wallet
        uint256 required = MINTING_COST;
        (bool sentFee, ) = platformWallet.call{ value: required }("");
        require(sentFee, "ArtNFT: Failed to forward minting fee to platform wallet");

        // refund excess to sender
        uint256 excess = msg.value - required;
        if (excess > 0) {
            // safe refund using sendValue
            payable(msg.sender).sendValue(excess);
        }

        uint256 newTokenId = ++tokenCounter;
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        emit Minted(msg.sender, newTokenId, tokenURI, msg.value);
        return newTokenId;
    }

    function setPlatformWallet(address payable _wallet) external onlyOwner {
        require(_wallet != address(0), "ArtNFT: invalid platform wallet");
        address payable previous = platformWallet;
        platformWallet = _wallet;
        emit PlatformWalletChanged(previous, _wallet);
    }

    // owner can withdraw any stuck native balance to platform wallet
    function withdraw() external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        require(bal > 0, "ArtNFT: no funds");
        payable(platformWallet).sendValue(bal);
        emit Withdraw(platformWallet, bal);
    }

    receive() external payable {}
}
