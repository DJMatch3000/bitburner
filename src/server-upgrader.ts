import { NS } from "@ns";
import { numberWithCommas } from "utils";

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL')
    await serverUpgrader(ns)
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
