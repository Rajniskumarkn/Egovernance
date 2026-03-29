import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Governance", function () {
    async function deployGovernanceFixture() {
        const [owner, otherAccount, verifier] = await ethers.getSigners();
        const Governance = await ethers.getContractFactory("Governance");
        const governance = await Governance.deploy();
        await governance.waitForDeployment();
        return { governance, owner, otherAccount, verifier };
    }

    describe("User Registration", function () {
        it("Should register a new user", async function () {
            const { governance, owner } = await loadFixture(deployGovernanceFixture);
            await expect(governance.registerUser("Alice", 0, "hash123"))
                .to.emit(governance, "UserRegistered")
                .withArgs(owner.address, "Alice", 0);
        });
    });

    describe("Land Registry", function () {
        it("Should register a land", async function () {
            const { governance, owner } = await loadFixture(deployGovernanceFixture);
            await governance.registerUser("Alice", 0, "hash123");

            await expect(governance.registerLand("Location A", 1000))
                .to.emit(governance, "LandRegistered")
                .withArgs(1, "Location A", owner.address);

            const land = await governance.getLand(1);
            expect(land.location).to.equal("Location A");
        });
    });

    describe("Resource Allocation", function () {
        it("Should request funds", async function () {
            const { governance, owner } = await loadFixture(deployGovernanceFixture);
            await governance.registerUser("Alice", 0, "hash123");

            await expect(governance.requestFunds("Build Road", 5000))
                .to.emit(governance, "FundRequested")
                .withArgs(1, "Build Road", 5000, owner.address);
        });
    });
});
