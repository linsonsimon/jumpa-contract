// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract marketPlace is Ownable {

    //add events bid,buy,sell

    event sellEvent(address seller, uint256 price,IERC721 nft,uint256 NftId);
    event buyEvent(address buyer,address seller, uint256 price,IERC721 nft,uint256 NftId);


    struct Item {
        uint256 NftId;
        IERC721 nft;
        uint256 price;
        address payable seller;
        bool sold;
    }


    uint256 public total;


    mapping(uint256 => Item) public catalog;
    mapping(IERC721=> bool) public supported;
    // mapping(uint256 => bid) public bids;

    constructor(IERC721 _nft){
        supported[_nft] = true;
        // token = _token;
    }

    function approveNFtType(IERC721 _nft) external onlyOwner {
        supported[_nft] = true;
    }

    //approve token

    function placeForSale(IERC721 _nft,uint256 _id,uint256 _price) external {
        require(supported[_nft]==true);
        // require(_nft.getApproved(_id) == address(this),"approve marketplace");
        require(_nft.isApprovedForAll(msg.sender,address(this)) == true,"approve marketplace");
        require(_nft.ownerOf(_id)==msg.sender);
        require(_price >0);
        total++;
        catalog[total] = Item(_id,_nft,_price,payable(msg.sender),false);
        emit sellEvent(msg.sender,_price,_nft,_id);
    }

    // function bidItem(uint256 _id,uint256 price) external {
    //     require(price > catalog[_id].price);
    //     require(token.balanceOf(msg.sender)>=price);
    //     if(price > bids[_id].bid){
    //         if(bids[_id].bid !=0){
    //             token.transfer(bids[_id].by, bids[_id].bid);
    //         }
    //         require(token.transferFrom(msg.sender, address(this), price));
    //         bids[_id] = bid(_id,msg.sender,price);

    //     }else{
    //         revert("bid too low");
    //     }
    // }

    function Buy(uint256 _id) external payable {
        // require(catalog[id].nft.ownerOf(catalog[id].id) == msg.sender);
        require(catalog[_id].sold==false);
        require(msg.sender!=catalog[_id].nft.ownerOf(_id));
        require(msg.value>catalog[_id].price-1,"Price too low");
        require(catalog[_id].nft.ownerOf(_id)==catalog[_id].seller,"seller is not the Owner of the NFT anymore");
        catalog[_id].nft.transferFrom(catalog[_id].seller,msg.sender,catalog[_id].NftId);
        catalog[_id].seller.transfer(msg.value);
        catalog[_id].sold=true;
        emit buyEvent(msg.sender, catalog[_id].seller, msg.value, catalog[_id].nft, catalog[_id].NftId);
        
        // delete catalog[_id];
    }

    //add function to re-sell already sold nft

    fallback() external {}

    receive() external payable{}
}
