import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.disableLog('sleep')
    /*
    still need to:
    join factions
    purchase augs and reset
    */

    /**
     * -Initialize BN stats
     * -Start cycler
     * -Determine faction to join
     * -Start process to join faction
     * -Once joined, work faction
     * -Purchase augs and reset
     * -Clear BN stats and hack w0rld_d43m0n
     */

    if (!ns.fileExists("BN_mults.json")) {
        ns.write("BN_mults.json", JSON.stringify(ns.getBitNodeMultipliers(), null, 2), "w")
    }

    if (!ns.fileExists("factions_joined.txt")) {
        ns.write("factions_joined.txt")
    }

    const SCRIPTS = [
        'cycler.js', 
        'memoryctl.js', 
        'serverctl.js', 
        'programctl.js', 
        // 'hacknetctl.js',
        'factionctl.js'
    ]

    for (const s of SCRIPTS) {
        while (ns.run(s) === 0) {
            await ns.asleep(100)
        }
    }
}
