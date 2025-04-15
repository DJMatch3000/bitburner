import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL')
    await programBuyer(ns)
}

export async function programBuyer(ns: NS) {
    while(!ns.singularity.purchaseTor()) {
        await ns.sleep(1000)
    }
    let progs = ns.singularity.getDarkwebPrograms()
    progs.sort((a, b) => ns.singularity.getDarkwebProgramCost(a) - ns.singularity.getDarkwebProgramCost(b))
    for (let p of progs) {
        ns.print('Purchasing ' + p)
        while(!ns.fileExists(p, "home")) {
            if (!ns.singularity.purchaseProgram(p)) {
                await ns.sleep(1000)
            }
        }
    }
    ns.writePort(3, "Done")
}
