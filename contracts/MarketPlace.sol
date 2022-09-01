// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MarketPlace is Ownable {

    //add events bid,buy,sell

    struct Item {
        uint256 id;
        IERC721 nft;
        uint256 price;
        IERC20 tokenAddress;
    }

    struct bid {
        uint256 id;
        address by;
        uint256 bid;
    }

    event buyEvent(address buyer,address seller, uint256 finalprice,IERC721 nft,uint256 NftId);
    event bidEvent(address buyer, IERC721 nft,uint256 NftId,uint256 bidAmount);
    event sellEvent(address seller, IERC721 nft,uint256 NftId,uint256 askingPrice, IERC20 tokenAddress);

    uint256 public total;

    // IERC20 public token; // change to mapping of supported tokens
    mapping(IERC20 => bool) public allowedCrypto;

    mapping(uint256 => Item) public catalog;
    mapping(IERC721=> bool) public supported;
    mapping(uint256 => bid) public bids;

    constructor(IERC721 _nft,IERC20 _token){
        supported[_nft] = true;
        // token = _token;
        allowedCrypto[_token] =true;
    }

    function approveNFtType(IERC721 _nft) external onlyOwner {
        supported[_nft] = true;
    }

    //approve token
    function approveToken(IERC20 _token) external onlyOwner {
        allowedCrypto[_token] = true;
    }

    function placeForSale(IERC721 _nft,uint256 id,uint256 price, IERC20 _tokenId) external {
        require(supported[_nft]==true);
        require(allowedCrypto[_tokenId]==true);
        require(_nft.getApproved(id) == address(this),"approve marketplace");
        require(_nft.ownerOf(id)==msg.sender);
        require(price >0);
        total++;
        catalog[total] = Item(id,_nft,price,_tokenId);
        emit sellEvent(msg.sender,_nft,id,price,_tokenId);
    }

    function bidItem(uint256 _id,uint256 price) external {
        IERC20 token=catalog[_id].tokenAddress;
        require(price > catalog[_id].price);
        require(token.balanceOf(msg.sender)>=price);
        if(price > bids[_id].bid){
            if(bids[_id].bid !=0){
                token.transfer(bids[_id].by, bids[_id].bid);
            }
            require(token.transferFrom(msg.sender, address(this), price));
            bids[_id] = bid(_id,msg.sender,price);
            emit bidEvent(msg.sender,catalog[_id].nft,catalog[_id].id,price);

        }else{
            revert("bid too low");
        }
        
    }

    function sellForBid(uint256 id) external {
        IERC20 token=catalog[id].tokenAddress;

        require(catalog[id].nft.ownerOf(catalog[id].id) == msg.sender);
        catalog[id].nft.transferFrom(msg.sender,bids[id].by,catalog[id].id);
        token.transfer(msg.sender, bids[id].bid);
        emit buyEvent(bids[id].by,msg.sender,bids[id].bid,catalog[id].nft,catalog[id].id);
        delete bids[id];
    }

    //add function to re-sell already sold nft

    fallback() external {}

    receive() external payable{}
}