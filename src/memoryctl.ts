import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    await memoryBuyer(ns)
}

async function memoryBuyer(ns: NS): Promise<void> {
    while (ns.getServerMaxRam("home") < ns.getPurchasedServerMaxRam()) {
        let money = ns.getServerMoneyAvailable("home")
        if (money >= ns.singularity.getUpgradeHomeRamCost()) {
            ns.singularity.upgradeHomeRam()
        }
        await ns.asleep(200)
    }
    ns.clearPort(4)
    ns.writePort(4, "Done")
}