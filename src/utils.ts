import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.tprint("This is where all utility functions are")
}

export function getAllServers(ns: NS): Server[] {
    const toScan = ["home"]
    const scanned: string[] = []

    while (toScan.length > 0) {
        const server = toScan.pop()
        if (server === undefined) {
            break
        }
        for (const s of ns.scan(server)) {
            if (!scanned.includes(s)) {
                toScan.push(s)
            }
        }
        scanned.push(server)
    }

    return scanned.map((s) => new Server(ns, s))
}

export class Server {
    ns: NS
    name: string
    preppedAt = 0
    scheduledUntil = 0

    constructor(ns: NS, serverName: string) {
        this.ns = ns
        this.name = serverName
    }

    //Host-related properties
    get portsNeeded() {
        return this.ns.getServerNumPortsRequired(this.name)
    }

    get isRooted() {
        return this.ns.hasRootAccess(this.name)
    }

    get canRoot() {
        let numCracks = 0
        if (this.ns.fileExists("BruteSSH.exe")) numCracks++
        if (this.ns.fileExists("FTPCrack.exe")) numCracks++
        if (this.ns.fileExists("relaySMTP.exe")) numCracks++
        if (this.ns.fileExists("httpWorm.exe")) numCracks++
        if (this.ns.fileExists("SQLInject.exe")) numCracks++

        return numCracks >= this.portsNeeded
    }

    get maxRAM() {
        if (this.name === "home") {
            return Math.floor(this.ns.getServerMaxRam(this.name) * 0.8)
        }
        return this.ns.getServerMaxRam(this.name)
    }

    get usedRAM() {
        return this.ns.getServerUsedRam(this.name)
    }

    get availableRAM() {
        if (this.name === "home") {
            //return Math.floor((this.maxRAM - this.usedRAM) * 0.8 * 100) / 100
            return Math.max(0, this.maxRAM - this.usedRAM - 100)
        }
        return Math.max(this.maxRAM - this.usedRAM, 0)
    }


    //Target-related properties
    get canHack() {
        return this.ns.getHackingLevel() >= this.ns.getServerRequiredHackingLevel(this.name) && this.canRoot && this.maxMoney > 0 && this.name !== "home"
    }

    get minSecurity() {
        return this.ns.getServerMinSecurityLevel(this.name)
    }

    get security() {
        return this.ns.getServerSecurityLevel(this.name)
    }

    get maxMoney() {
        return this.ns.getServerMaxMoney(this.name)
    }

    get money() {
        return this.ns.getServerMoneyAvailable(this.name)
    }

    get hackTime() {
        return this.ns.getHackTime(this.name)
    }

    get growTime() {
        return this.ns.getGrowTime(this.name)
    }

    get weakenTime() {
        return this.ns.getWeakenTime(this.name)
    }

    get isPrepped() {
        return this.security == this.minSecurity && this.money == this.maxMoney
    }

    get isPrepping() {
        return this.preppedAt > Date.now()
    }

    //Methods
    root(): boolean {
        const cracks: any[] = [this.ns.brutessh, this.ns.ftpcrack, this.ns.relaysmtp, this.ns.httpworm, this.ns.sqlinject]
        for (let i = 0; i < this.portsNeeded; i++) {
            cracks[i](this.name)
        }
        this.ns.nuke(this.name)
        return true
    }
}

export function getMults(ns: NS) {
    const mults = ns.getPlayer().mults
    const bnMults = undefined
    // Uncomment line after getting SF-5
    // bnMults = ns.getBitNodeMultipliers()
    if (bnMults !== undefined) {
        // TODO: Implement BN mults
    }
    return mults
}

export function calculateGrowThreadsNeeded(ns: NS, serv: Server, hackRatio: number): number {
    const growRate = ns.getServerGrowth(serv.name)
    const hackDifficulty = serv.minSecurity
    const baseGrowth = 0.03
    const maxGrowthLog = 0.00349389 
    const adjGrowthLog = Math.min(Math.log1p(baseGrowth / hackDifficulty), maxGrowthLog)
    const playerMult = 1.1268
    const serverGrowth = 1 / (1 - hackRatio)
    return Math.ceil((Math.log(serverGrowth) / (adjGrowthLog * (growRate / 100) * playerMult)) * 2)
}

export function numberWithCommas(x: number) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}