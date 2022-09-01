const { expect } = require("chai");

const toWei = (num) => ethers.utils.parseEther(num.toString());
const fromWei = (num) => ethers.utils.formatEther(num);

describe("NFTMarketplace", function () {
  let nft;
  let nft2;
  let mytoken;
  let mytoken2;
  let marketplace;
  let deployer;
  let addr1;
  let addr2;
  let addrs;

  let URI = "sample URI";

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    const NFT = await ethers.getContractFactory("NFT");
    const MyToken = await ethers.getContractFactory("MyToken");
    const Marketplace = await ethers.getContractFactory("MarketPlace");
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

    // To deploy our contracts
    nft = await NFT.deploy();
    nft2 = await NFT.deploy();
    mytoken = await MyToken.deploy();
    mytoken2 = await MyToken.deploy();
    marketplace = await Marketplace.deploy(nft.address, mytoken.address);
    ab1 = await mytoken.transfer(addr1.address, toWei(1000));
    ab2 = await mytoken.transfer(addr2.address, toWei(1000));

    // marketplace = await Marketplace.deploy(feePercent);
  });

  describe("Deployment", function () {
    it("Should track name and symbol of the nft collection", async function () {
      // This test expects the owner variable stored in the contract to be equal
      // to our Signer's owner.
      const nftName = "DApp NFT";
      const nftSymbol = "DAPP";
      expect(await nft.name()).to.equal(nftName);
      expect(await nft.symbol()).to.equal(nftSymbol);
    });

    it("Should track name and symbol of the ERC20 token", async function () {
      expect(await mytoken.name()).to.equal("MyToken");
      expect(await mytoken.symbol()).to.equal("MTK");
      expect(await mytoken.balanceOf(addr1.address)).to.equal(toWei(1000));
      expect(await mytoken.balanceOf(addr2.address)).to.equal(toWei(1000));
    });
  });

  describe("Minting NFTs", function () {
    it("Should track each minted NFT", async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(URI);
      expect(await nft.tokenCount()).to.equal(1);
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
      expect(await nft.tokenURI(1)).to.equal(URI);
      // addr2 mints an nft
      await nft.connect(addr2).mint(URI);
      expect(await nft.tokenCount()).to.equal(2);
      expect(await nft.balanceOf(addr2.address)).to.equal(1);
      expect(await nft.tokenURI(2)).to.equal(URI);
    });
  });

  describe("approveing New NFT contract in marketplace", function () {
    it("set new Nft Type by deployer of the contract", async function () {
      await marketplace.connect(deployer).approveNFtType(nft2.address);
      expect(await marketplace.supported(nft2.address)).to.equal(true);
    });

    it("set new nft contract by random user", async function () {
      await expect(marketplace.connect(addr1).approveNFtType(nft2.address)).to
        .be.reverted;
    });
  });

  describe("approveing New ERC20 token contract in marketplace", function () {
    it("set new ERC20 token by deployer of the contract", async function () {
      await marketplace.connect(deployer).approveToken(mytoken2.address);
      expect(await marketplace.allowedCrypto(mytoken2.address)).to.equal(true);
    });

    it("set new ERC20 token by random user", async function () {
      await expect(marketplace.connect(addr1).approveToken(mytoken2.address)).to
        .be.reverted;
    });
  });

  describe("Nft sale in marketplace ", async function () {
    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(URI);
      await nft2.connect(addr1).mint(URI);
      // addr1 approves marketplace to spend nft
      await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
      await nft.connect(addr1).approve(marketplace.address, 1);
      //addr1 and addr2 approves spending erc20 on marketplace
      await mytoken.connect(addr1).approve(marketplace.address, toWei(1000));
      await mytoken.connect(addr2).approve(marketplace.address, toWei(1000));
    });

    describe("placing nft", function () {
      it("placing nft in marketplace by owner of the nft", async function () {
        await expect(
          marketplace
            .connect(addr1)
            .placeForSale(nft.address, 1, toWei(100), mytoken.address)
        )
          .to.emit(marketplace, "sellEvent")
          .withArgs(addr1.address, nft.address, 1, toWei(100), mytoken.address);
        expect(await nft.ownerOf(1)).to.equal(addr1.address);
      });

      it("placing nft in marketplace by random user", async function () {
        await expect(
          marketplace
            .connect(addr2)
            .placeForSale(nft.address, 1, toWei(100), mytoken.address)
        ).to.be.reverted;
      });

      it("placing nft from unsupported nft address in marketplace by random user", async function () {
        await expect(
          marketplace
            .connect(addr1)
            .placeForSale(nft2.address, 1, toWei(100), mytoken.address)
        ).to.be.reverted;
      });

      it("placing nft from unsupported crypto in marketplace by random user", async function () {
        await expect(
          marketplace
            .connect(addr1)
            .placeForSale(nft.address, 1, toWei(100), mytoken2.address)
        ).to.be.reverted;
      });
    });

    describe("bidding for nft", function () {
      beforeEach(async function () {
        await marketplace
          .connect(addr1)
          .placeForSale(nft.address, 1, toWei(100), mytoken.address);
      });
      describe("bid", function () {
        it("bid for nft in marketplace", async function () {
          await expect(marketplace.connect(addr2).bidItem(1, toWei(150)))
            .to.emit(marketplace, "bidEvent")
            .withArgs(addr2.address, nft.address, 1, toWei(150));
        });

        it("bid price below asking price", async function () {
          await expect(marketplace.connect(addr2).bidItem(1, toWei(99))).to.be
            .reverted;
        });

        it("insufficient balance", async function () {
          await expect(marketplace.connect(addr2).bidItem(1, toWei(1001))).to.be
            .reverted;
        });
      });
    });

    describe("sellForBid", function () {
      beforeEach(async function () {
        await marketplace
          .connect(addr1)
          .placeForSale(nft.address, 1, toWei(100), mytoken.address);

        await marketplace.connect(addr2).bidItem(1, toWei(150));
      });
      describe("finalize sale", function () {
        it("finalize bid for nft in marketplace", async function () {
          await expect(marketplace.connect(addr1).sellForBid(1))
            .to.emit(marketplace, "buyEvent")
            .withArgs(addr2.address, addr1.address, toWei(150), nft.address, 1);

          expect(await nft.ownerOf(1)).to.equal(addr2.address);
        });

        it("finalize by random user", async function () {
          await expect(marketplace.connect(addr2).sellForBid(1)).to.be.reverted;
        });
      });
    });

    describe("resell", function () {
      it("resell nft in marketplace", async function () {
        //placing the nft in market by addr1
        await expect(
          marketplace
            .connect(addr1)
            .placeForSale(nft.address, 1, toWei(100), mytoken.address)
        )
          .to.emit(marketplace, "sellEvent")
          .withArgs(addr1.address, nft.address, 1, toWei(100), mytoken.address);
        expect(await nft.ownerOf(1)).to.equal(addr1.address);

        //bidding for the nft by addr2
        await expect(marketplace.connect(addr2).bidItem(1, toWei(150)))
          .to.emit(marketplace, "bidEvent")
          .withArgs(addr2.address, nft.address, 1, toWei(150));

        //selling the nft for the bid amount
        await expect(marketplace.connect(addr1).sellForBid(1))
          .to.emit(marketplace, "buyEvent")
          .withArgs(addr2.address, addr1.address, toWei(150), nft.address, 1);
        //testing the owner is addr2
        expect(await nft.ownerOf(1)).to.equal(addr2.address);

        //approving marketplace to sell nft for addr2
        await nft.connect(addr2).approve(marketplace.address, 1);
        //placing nft for sale
        await expect(
          marketplace
            .connect(addr2)
            .placeForSale(nft.address, 1, toWei(100), mytoken.address)
        )
          .to.emit(marketplace, "sellEvent")
          .withArgs(addr2.address, nft.address, 1, toWei(100), mytoken.address);
        expect(await nft.ownerOf(1)).to.equal(addr2.address);
      });
    });
  });
});
