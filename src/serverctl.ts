import { NS } from "@ns";
import { numberWithCommas } from "utils";

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL')
    if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
        await serverBuyer(ns)
    }
    // while (true) {
    //     await serverUpgrader(ns)
    // }
}

export async function serverBuyer(ns: NS) {
    const HOSTNAME = "daemonhost-"

    for (let i = ns.getPurchasedServers().length; i < ns.getPurchasedServerLimit(); i++) {
        const serverRam = Math.min(ns.getServerMaxRam("home") / 2, ns.getPurchasedServerMaxRam())
        ns.print(`Server cost: $${numberWithCommas(ns.getPurchasedServerCost(serverRam))}`)
        while (ns.getServerMoneyAvailable("home") < ns.getPurchasedServerCost(serverRam)) {
            await ns.sleep(200)
        }
        ns.print("Purchasing server " + HOSTNAME + i.toString())
        ns.purchaseServer(HOSTNAME + i.toString(), serverRam)
    }
    ns.writePort(2, "Done")
}

export async function serverUpgrader(ns: NS) {
    const HOSTNAME = "daemonhost-"
    const targetRAM = Math.max(ns.getServerMaxRam("home"), ns.getServerMaxRam(HOSTNAME + (ns.getPurchasedServers().length - 1).toString()) * 2)
    for (let i = 0; i < ns.getPurchasedServers().length; i++) {
        const cost = ns.getPurchasedServerUpgradeCost(HOSTNAME + i.toString(), targetRAM)
        if (ns.getServerMaxRam(HOSTNAME + i.toString()) >= targetRAM) {
            continue
        }
        ns.print(`Server cost: $${numberWithCommas(cost)}`)
        while (ns.getServerMoneyAvailable("home") < cost) {
            await ns.sleep(200)
        }
        ns.print("Upgrading server " + HOSTNAME + i.toString())
        ns.upgradePurchasedServer(HOSTNAME + i.toString(), targetRAM)
    }
}
