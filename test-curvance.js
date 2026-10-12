import { setupChain } from "curvance";
import { ethers } from "ethers";

async function checkHealth() {
    const provider = new ethers.JsonRpcProvider("https://rpc.monad.xyz");
    const setup = await setupChain("monad-mainnet", provider);

    const userAddress = "0x1615...64bc";

    console.log("Revisando wallet:", userAddress, "\n");

    if (!setup.markets || !Array.isArray(setup.markets)) {
        console.log("Keys del setup:", Object.keys(setup));
        return;
    }

    for (const market of setup.markets) {
        try {
            if (typeof market.reloadUserData === "function") {
                await market.reloadUserData(userAddress);
            }
        } catch (e) {}

        const health = market.positionHealth;
        console.log("Mercado:", market.name || market.address);

        if (health === null || health === undefined) {
            console.log("  Estado: SEGURO (Sin Deuda)\n");
            continue;
        }

        const healthNum = parseFloat(health.toString());
        console.log("  Health:", healthNum.toFixed(4));

        if (healthNum < 1) {
            console.log("  Estado: CRITICO\n");
        } else if (healthNum < 1.5) {
            console.log("  Estado: MEDIO\n");
        } else {
            console.log("  Estado: SEGURO\n");
        }
    }
}

checkHealth().catch(console.error);
