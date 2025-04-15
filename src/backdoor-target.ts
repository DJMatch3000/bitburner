import { NS } from "@ns";
import { goToServer } from "./connector";

export async function main(ns: NS): Promise<void> {
    if (ns.args.length < 1 || typeof ns.args[0] != "string") {
        ns.tprint("No target provided")
        return
    }
    if (ns.getServer(ns.args[0]) == undefined) {
        ns.tprint("Invalid target")
        return
    }
    if (ns.getServer(ns.args[0]).backdoorInstalled) {
        ns.tprint("Target already backdoored")
        return
    }
    await crackTarget(ns, ns.args[0])
}

export async function crackTarget(ns: NS, target: string): Promise<void> {
    const portsNeeded = ns.getServerNumPortsRequired(target)
    let hacksApplied = 0
    if (ns.fileExists("BruteSSH.exe")) {
        ns.brutessh(target)
        hacksApplied++
    }
    if (ns.fileExists("FTPCrack.exe")) {
        ns.ftpcrack(target)
        hacksApplied++
    }
    if (ns.fileExists("relaySMTP.exe")) {
        ns.relaysmtp(target)
        hacksApplied++
    }
    if (ns.fileExists("HTTPWorm.exe")) {
        ns.httpworm(target)
        hacksApplied++
    }
    if (ns.fileExists("SQLInject.exe")) {
        ns.sqlinject(target)
        hacksApplied++
    }

    if (hacksApplied >= portsNeeded) {
        goToServer(ns, target)
        ns.nuke(target)
        await ns.singularity.installBackdoor()
        ns.singularity.connect("home")
    }
    else {
        ns.tprint("ERROR: Not enough ports open to backdoor " + target)
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: any, args: any): string[] {
    return data.servers;
}
