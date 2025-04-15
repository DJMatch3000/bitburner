import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL')
    await hacknet(ns)
}

async function hacknet(ns: NS): Promise<void> {
    const maxROITime = 3600
    const playerMult = ns.getPlayer().mults.hacknet_node_money
    while (true) {
        if (ns.hacknet.numNodes() == 0) {
            while (ns.getServerMoneyAvailable("home") < ns.hacknet.getPurchaseNodeCost()) {
                await ns.sleep(1000)
            }
            ns.hacknet.purchaseNode()
        }
        let bestPurchase = {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            action: (_n: number) => ns.hacknet.purchaseNode() != -1, 
            node: -1, 
            cost: ns.hacknet.getPurchaseNodeCost(), 
            roiTime: ns.hacknet.getPurchaseNodeCost() / ns.hacknet.getNodeStats(ns.hacknet.numNodes() - 1).production,
            name: "Purchase Node"
        }
        for (let i = 0; i < ns.hacknet.numNodes(); i++) {
            const nodeStats = ns.hacknet.getNodeStats(i)
            const curGain = ns.formulas.hacknetNodes.moneyGainRate(nodeStats.level, nodeStats.ram, nodeStats.cores, playerMult)
            let newGain = ns.formulas.hacknetNodes.moneyGainRate(nodeStats.level + 1, nodeStats.ram, nodeStats.cores, playerMult)
            const levelROITime = ns.hacknet.getLevelUpgradeCost(i) / (newGain - curGain)
            if (levelROITime < bestPurchase.roiTime) {
                bestPurchase = {
                    action: ns.hacknet.upgradeLevel, 
                    node: i, 
                    cost: ns.hacknet.getLevelUpgradeCost(i), 
                    roiTime: levelROITime,
                    name: `Node ${i} Upgrade Level`
                }
            }
            newGain = ns.formulas.hacknetNodes.moneyGainRate(nodeStats.level, nodeStats.ram + 1, nodeStats.cores, playerMult)
            const ramROITime = ns.hacknet.getRamUpgradeCost(i) / (newGain - curGain)
            if (ramROITime < bestPurchase.roiTime) {
                bestPurchase = {
                    action: ns.hacknet.upgradeRam, 
                    node: i, 
                    cost: ns.hacknet.getRamUpgradeCost(i), 
                    roiTime: ramROITime,
                    name: `Node ${i} Upgrade RAM`
                }
            }
            newGain = ns.formulas.hacknetNodes.moneyGainRate(nodeStats.level, nodeStats.ram, nodeStats.cores + 1, playerMult)
            const coreROITime = ns.hacknet.getCoreUpgradeCost(i) / (newGain - curGain)
            if (coreROITime < bestPurchase.roiTime) {
                bestPurchase = {
                    action: ns.hacknet.upgradeCore, 
                    node: i, 
                    cost: ns.hacknet.getCoreUpgradeCost(i), 
                    roiTime: coreROITime,
                    name: `Node ${i} Upgrade Core`
                }
            }
        }
        ns.print(`Best action: ${bestPurchase.name}\nROI Time: ${bestPurchase.roiTime.toFixed(2)} seconds`)
        if (bestPurchase.roiTime < maxROITime) {
            while (ns.getServerMoneyAvailable("home") < bestPurchase.cost) {
                await ns.sleep(1000)
            }
            bestPurchase.action(bestPurchase.node)
        }
        else {
            ns.print("No profitable actions")
            ns.exit()
        }

        // await ns.asleep(50)
    }
}