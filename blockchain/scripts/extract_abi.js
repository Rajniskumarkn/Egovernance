import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const artifactPath = path.resolve(__dirname, "../artifacts/contracts/Governance.sol/Governance.json");
    const outputPath = path.resolve(__dirname, "../../ml_engine/governance_abi.json");

    if (!fs.existsSync(artifactPath)) {
        console.error("Artifact not found. Run 'npx hardhat compile' first.");
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abi = artifact.abi;

    fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));
    console.log(`ABI saved to ${outputPath}`);
}

main();
