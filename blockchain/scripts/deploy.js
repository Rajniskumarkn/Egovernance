import hre from "hardhat";

async function main() {
    const Governance = await hre.ethers.getContractFactory("Governance");
    const governance = await Governance.deploy();

    await governance.waitForDeployment();

    console.log(`Governance deployed to ${governance.target}`);

    // Register deployer as Admin (Role 1)
    const [deployer] = await hre.ethers.getSigners();
    const tx = await governance.registerUser("SystemAdmin", 1, "adminHash"); // 1 = Admin
    await tx.wait();
    console.log(`Registered deployer ${deployer.address} as Admin`);

    const fs = await import("fs");
    const path = await import("path");

    // Save to ML Engine
    const mlAddressPath = path.resolve("..", "ml_engine", "contract_address.txt");
    fs.writeFileSync(mlAddressPath, governance.target);
    console.log(`Address saved to ${mlAddressPath}`);

    // Save to Client
    const clientAddressPath = path.resolve("..", "client", "src", "abis", "contract-address.json");
    fs.writeFileSync(clientAddressPath, JSON.stringify({ address: governance.target }, null, 4));
    console.log(`Address saved to ${clientAddressPath}`);

    // console.log("Database state reset (History preserved)."); 
    // Backend call removed to remove MongoDB dependency.
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
