import { Server } from "utils.js"
import { crackTarget } from "backdoor-target.js";
import { CityName, FactionName, Task } from "@ns";
import { goToServer } from "connector.js";

export async function main(ns: NS) : Promise<void> {
    ns.disableLog('ALL')
    await factionctl(ns);
}

async function factionctl(ns: NS) {
    // Before loop:
    // -Determine appropriate faction list
    // -Determine target faction
    // -Exclude conflicting factions
    
    // Main loop:
    // -get invites
    // -join factions
    // -install augs

    const fnames = ns.enums.FactionName;
    const cityNames = ns.enums.CityName
    const factionList = [
        new Faction(ns, fnames.CyberSec, "hack", "CSEC"),
        new Faction(ns, fnames.Sector12, "city", "", cityNames.Sector12),
        new Faction(ns, fnames.TianDiHui, "city", "", cityNames.Chongqing),
        new Faction(ns, fnames.Aevum, "city", "", cityNames.Aevum),
        new Faction(ns, fnames.NiteSec, "hack", "avmnite-02h"),
        new Faction(ns, fnames.TheBlackHand, "hack", "I.I.I.I"),
        new Faction(ns, fnames.BitRunners, "hack", "run4theh1llz"),
        new Faction(ns, fnames.Daedalus, "Daedalus"),
        new Faction(ns, fnames.NWO, "work", "", cityNames.Volhaven),
        new Faction(ns, fnames.OmniTekIncorporated, "work", "", cityNames.Volhaven),
        new Faction(ns, fnames.MegaCorp, "work", cityNames.Sector12)
    ]

    const finishedFactions = ns.read("factions_joined.txt").split("\n")
    let targetFaction
    for (const f of factionList) {
        if (!finishedFactions.includes(f.name)) {
            ns.print(`Target faction is ${f.name}`)
            targetFaction = f
            break
        }
    }
    if (targetFaction === undefined) {
        ns.print("ERROR: no target factions")
        ns.exit()
    }
    if (!ns.getPlayer().factions.includes(targetFaction.name)) {
        await getInvite(ns, targetFaction)
    }
    joinFactions(ns);
    await ns.asleep(100)
    await workFaction(ns, targetFaction)
    if (!checkWorldDaemon(ns)) {
        await purchaseAugsAndReset(ns, targetFaction)
    }
}

function joinFactions(ns: NS) {
    ns.singularity.checkFactionInvitations().map((f) => (ns.singularity.joinFaction(f)));
}

async function getInvite(ns: NS, faction: Faction) {
    ns.print(`Getting invite for ${faction.name}`)
    if (faction.type === "hack" && faction.server !== undefined) {
        while (true) {
            if (faction.server.canRoot) {
                faction.server.root()
                await crackTarget(ns, faction.server.name);
                ns.print(`Faction server hacked`)
                break
            }
            else {
                await ns.asleep(50)
            }
        }
    }
    else if (faction.type === "city" && faction.location !== undefined) {
        if (ns.getPlayer().city !== faction.location) {
            while (!ns.singularity.travelToCity(faction.location)) {
                await ns.asleep(50)
            }
        }
    }
    while (!ns.singularity.checkFactionInvitations().includes(faction.name)) {
        await ns.sleep(100)
    }
}

async function workFaction(ns: NS, faction: Faction) {
    /**
     * -Bail if already 150 favor
     * -Check if already working
     * -Get rep req for all augs or 150 favor
     * -Work until req rep
     */
    const augs = ns.singularity.getAugmentationsFromFaction(faction.name)
    const reqRep = Math.max(...augs.map(aug => (ns.singularity.getAugmentationRepReq(aug))))
    ns.print(`Required reputation is ${reqRep}`)
    if (ns.singularity.getFactionFavor(faction.name) >= 150) {
        ns.print(`Donating $${reqRep * 1e6} to faction`)
        while (ns.getPlayer().money < reqRep * 1e6) {
            await ns.asleep(100)
        }
        ns.singularity.donateToFaction(faction.name, reqRep * 1e6)
        return
    }
    ns.singularity.workForFaction(faction.name, "hacking")
    while (ns.singularity.getFactionRep(faction.name) < reqRep && ns.singularity.getFactionFavor(faction.name) + ns.singularity.getFactionFavorGain(faction.name) < 150) {
        await ns.asleep(100)
    }
    ns.print("Done working for faction")
}

export async function purchaseAugsAndReset(ns: NS, faction: Faction) {
    /**
     * -Get faction augs
     * -Filter NeuroFlux
     * -Filter augs we don't have rep for
     * -Sort by cost descending
     * -Reorder prereqs first
     */
    const augs = ns.singularity.getAugmentationsFromFaction(faction.name)
    const filteredAugs = []
    for (const aug of augs) {
        if (
            aug !== "NeuroFlux Governor" && 
            ns.singularity.getFactionRep(faction.name) >= ns.singularity.getAugmentationRepReq(aug) && 
            !ns.singularity.getOwnedAugmentations(true).includes(aug)
        ) {
            filteredAugs.push(aug)
        }
    }
    filteredAugs.sort((a, b) => (ns.singularity.getAugmentationPrice(b) - ns.singularity.getAugmentationPrice(a)))
    for (let i = 0; i < filteredAugs.length; i++) {
        const prereqs = ns.singularity.getAugmentationPrereq(filteredAugs[i])
        for (let j = 0; j < prereqs.length; j++) {
            if (ns.singularity.getOwnedAugmentations(true).includes(prereqs[j])) {
                prereqs.splice(j, 1)
                j--
            }
        }
        if (prereqs.length > 0) {
            const firstPrereq = prereqs[0]
            if (filteredAugs.slice(i).includes(firstPrereq)) {
                const j = filteredAugs.indexOf(firstPrereq);
                [filteredAugs[i], filteredAugs[j]] = [filteredAugs[j], filteredAugs[i]]
            }
            else if (!filteredAugs.includes(firstPrereq)){
                filteredAugs.splice(i, 1)
                i--
            }
        }
    }

    ns.print(`Purchasing augs: ${JSON.stringify(filteredAugs)}`)
    for (const aug of filteredAugs) {
        while (ns.getPlayer().money < ns.singularity.getAugmentationPrice(aug)) {
            await ns.asleep(100)
        }
        ns.print(`Purchasing ${aug}`)
        while (!ns.singularity.purchaseAugmentation(faction.name, aug)) {
            await ns.asleep(100)
        }
    }

    ns.print("Purchasing NeuroFlux")
    while (ns.singularity.getAugmentationPrice("NeuroFlux Governor") <= ns.getPlayer().money && ns.singularity.getFactionRep(faction.name) >= ns.singularity.getAugmentationRepReq("NeuroFlux Governor")) {
        ns.singularity.purchaseAugmentation(faction.name, "NeuroFlux Governor")
    }

    ns.print("Installing Augmentations")
    if (ns.singularity.getOwnedAugmentations(true).length > ns.singularity.getOwnedAugmentations(false).length) {
        if (ns.singularity.getAugmentationsFromFaction(faction.name).every((a) => (ns.singularity.getOwnedAugmentations(true).includes(a)))) {
            ns.write("factions_joined.txt", `${faction.name}\n`, "a")
        }
        ns.singularity.installAugmentations("daemon.js")
    }
    else {
        ns.print("ERROR: No augmentations purchased")
    }
}

function checkWorldDaemon(ns: NS) {
    if (ns.serverExists("w0rld_d43m0n")) {
        const wd = new Server(ns, "w0rld_d43m0n")
        if (wd.canHack) {
            wd.root()
            goToServer(ns, wd.name)
            ns.tprint("Backdoor to destroy node")
            return true
        }
    }
    return false
}

export class Faction {
    ns: NS;
    name: FactionName;
    server?: Server;
    type: string;
    location?: CityName;
    constructor(ns: NS, name: FactionName, type: string, server = "", location?: CityName) {
        this.ns = ns;
        this.name = name;
        if (server !== "") {
            this.server = new Server(ns, server);
        }
        if (location !== undefined) {
            this.location = location
        }
        this.type = type;
    }
}