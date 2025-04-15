import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.disableLog('sleep')
    /*
    still need to:
    join factions
    purchase augs and reset
    */
    const SCRIPTS = ['cycler.js', 'server-buyer.js', 'programctl.js', 'memoryctl.js', 'hacknetctl.js']

    for (const s of SCRIPTS) {
        if (!ns.isRunning(s)) {
            ns.run(s)
        }
    }
}
