import { NS } from "@ns";
import { numberWithCommas } from "utils";

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL')
    await serverBuyer(ns)
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
