import { NS } from "@ns";
import { getAllServers, Server, calculateGrowThreadsNeeded } from "utils";

const prepping: {server: Server, preppedAt: number}[] = []
const scheduled: {server: Server, scheduledUntil: number}[] = []

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL')
    // ns.enableLog('exec')
    while (true) {
        await cycler(ns)
        await ns.asleep(2000)
    }
}

export async function cycler(ns: NS): Promise<void> {
    const servers = getAllServers(ns)
    const hosts = servers.filter((s) => (s.isRooted || s.canRoot) && s.maxRAM > 0)
    hosts.forEach((h) => { if (!h.isRooted) h.root() })
    const totalRAM = hosts.reduce((ram, h) => (ram + h.maxRAM), 0)
    let targets = []
    targets = servers.filter((s) => s.canHack && ns.getWeakenTime(s.name) < 300000)
    // ns.tprint("WARNING: Manually setting target")
    // targets = [new Server(ns, "joesguns")]
    hosts.sort((a, b) => b.availableRAM - a.availableRAM)
    hosts.map((s) => { if (!ns.fileExists('weaken-target.js', s.name)) ns.scp(["hack-target.js", "grow-target.js", "weaken-target.js"], s.name, "home") })
    targets.sort((a, b) => {
        // +maxMoney, -minSec, +growrate, minSec means less as hackLevel grows, growrate means less as RAM grows
        // (money ^ x) * (growth ^ RAM/(RAM + y)) * (minSec ^ (hack/(hack + z))
        const moneyCoeff = (x: Server) => x.maxMoney * 0.001
        const growCoeff = (x: Server) => (Math.pow(Math.min(ns.getServerGrowth(x.name), 100), (totalRAM / (totalRAM + 1000))))
        const secCoeff = (x: Server) => Math.pow(x.minSecurity, 1 / ns.getHackingLevel())
        const scoreA = (moneyCoeff(a) * growCoeff(a) / secCoeff(a))
        const scoreB = (moneyCoeff(b) * growCoeff(b) / secCoeff(b))
        
        return scoreB - scoreA
    })

    // Update prepping array
    for (let i = 0; i < prepping.length; i++) {
        if (prepping[i].preppedAt < Date.now()) {
            prepping.splice(i, 1)
            i--
        }
    }
    // Update scheduled array
    for (let i = 0; i < scheduled.length; i++) {
        if (scheduled[i].scheduledUntil < Date.now()) {
            scheduled.splice(i, 1)
            i--
        }
    }
    // Prep and schedule targets
    let targetAvailable = false
    const prepped = []
    for (const target of targets) {
        if (scheduled.map(a => a.server.name).includes(target.name)) {
            //Do Nothing
        }
        else if (target.isPrepped) {
            prepped.push(target.name)
            if (canSchedule(ns, target, hosts)) {
                targetAvailable = true
                target.scheduledUntil = await scheduleBatch(ns, target, hosts)
                scheduled.push({server:target, scheduledUntil: target.scheduledUntil})
            }
        }
        else if (canPrep(ns, target, hosts) && !prepping.map(a => a.server.name).includes(target.name)) {
            target.preppedAt = prepServer(ns, target, hosts)
            prepping.push({server:target, preppedAt: target.preppedAt})
        }
    }
    // Batch prep a server if needed
    if (prepping.length == 0 && !targetAvailable) {
        targets[0].preppedAt = prepServer(ns, targets[0], hosts)
        prepping.push({server: targets[0], preppedAt: targets[0].preppedAt})
    }

    ns.clearLog()
    const totalThreads = hosts.reduce((acc, host) => (acc + Math.floor(host.maxRAM / 1.7)), 0)
    const availableThreads = hosts.reduce((acc, host) => (acc + Math.floor(host.availableRAM / 1.7)), 0)
    ns.print(`Threads Available: ${availableThreads} of ${totalThreads}`)
    ns.print(`Targets: ${targets.map(t => '\n    ' + t.name)}`)
    ns.print(`Prepping: ${prepping.map(a => '\n    ' + a.server.name)}`)
    ns.print(`Prepped: ${prepped.map(a => '\n    ' + a)}`)
    ns.print(`Scheduled: ${scheduled.map(a => '\n    ' + a.server.name)}`)
}

function canPrep(ns: NS, target: Server, hosts: Server[]) {
    const scriptMem = ns.getScriptRam("weaken-target.js")
    const weakenNeeded = target.security - target.minSecurity
    let weakenThreadsNeeded = 0
    while (ns.weakenAnalyze(weakenThreadsNeeded) < weakenNeeded) {
        weakenThreadsNeeded++
    }
    const growMultNeeded = target.maxMoney / Math.max(target.money, 1)
    let growThreadsNeeded = 0
    let weakenNeededAfterGrow = 0
    let weakenThreadsNeededAfterGrow = 0
    if (growMultNeeded > 1) {
        growThreadsNeeded = Math.ceil(calculateGrowThreadsNeeded(ns, target, (-1 / growMultNeeded) + 1) * 1.5)
        weakenNeededAfterGrow = Math.ceil(ns.growthAnalyzeSecurity(growThreadsNeeded))
        while (ns.weakenAnalyze(weakenThreadsNeededAfterGrow) < weakenNeededAfterGrow) {
            weakenThreadsNeededAfterGrow++
        }
    }
    const totalThreadsAvailable = hosts.reduce((acc, host) => (acc + Math.floor(host.availableRAM / scriptMem)), 0)
    
    return weakenThreadsNeeded + growThreadsNeeded + weakenThreadsNeededAfterGrow < totalThreadsAvailable * 5// && ns.getWeakenTime(target.name) < 300000
}

function canSchedule(ns: NS, target: Server, hosts: Server[]) {
    const scriptMem = ns.getScriptRam("weaken-target.js")
    const totalThreadsAvailable = hosts.reduce((acc, host) => (acc + Math.floor(host.availableRAM / scriptMem)), 0)
    const minBatches = 1
    const maxBatches = 10
    let targetBatches = maxBatches
    let scheduling = true
    let hackRatio = 0.75
    let hackThreads = Math.floor(hackRatio / ns.hackAnalyze(target.name))
    let weakenThreadsAfterHack = Math.ceil(ns.hackAnalyzeSecurity(hackThreads, target.name) / ns.weakenAnalyze(1) * 3)
    let growThreadsAfterHack = calculateGrowThreadsNeeded(ns, target, hackRatio)
    let tempTarget
    if (ns.fileExists("Formulas.exe")) {
        tempTarget = ns.getServer(target.name)
        tempTarget.moneyAvailable = target.maxMoney * (1 - hackRatio)
        growThreadsAfterHack = Math.ceil(ns.formulas.hacking.growThreads(tempTarget, ns.getPlayer(), target.maxMoney) * 2)
    }
    let totalThreadsNeeded
    let weakenThreadsAfterGrow = Math.ceil(ns.growthAnalyzeSecurity(growThreadsAfterHack) / ns.weakenAnalyze(1) * 1.25)

    while (scheduling && hackRatio > 0.01) {
        targetBatches = maxBatches

        hackThreads = Math.max(Math.floor(hackRatio / (ns.hackAnalyze(target.name) * ns.hackAnalyzeChance(target.name))), 1)
        weakenThreadsAfterHack = Math.ceil(ns.hackAnalyzeSecurity(hackThreads, target.name) / ns.weakenAnalyze(1) * 3)
        if (ns.fileExists("Formulas.exe")) {
            tempTarget = ns.getServer(target.name)
            tempTarget.moneyAvailable = target.maxMoney * (1 - hackRatio)
            growThreadsAfterHack = Math.ceil(ns.formulas.hacking.growThreads(tempTarget, ns.getPlayer(), target.maxMoney))
        }
        weakenThreadsAfterGrow = Math.ceil(ns.growthAnalyzeSecurity(growThreadsAfterHack) / ns.weakenAnalyze(1) * 1.25)
        totalThreadsNeeded = hackThreads + weakenThreadsAfterHack + growThreadsAfterHack + weakenThreadsAfterGrow
        targetBatches = Math.min(targetBatches, Math.floor(totalThreadsAvailable / totalThreadsNeeded))
        if (targetBatches < minBatches) {
            hackRatio -= 0.01
        }
        else {
            scheduling = false
        }
    }
    // ns.print(`${target.name} needs ${totalThreadsNeeded} to schedule`)
    return hackRatio > 0.01
}
/**
 * @param ns NS
 * @param target server to prep
 * @param hosts host servers
 * @returns time to prep in ms
 */
function prepServer(ns: NS, target: Server | undefined, hosts: Server[]): number {
    if (target === undefined) {
        ns.tprint('ERROR: No valid targets')
        ns.exit()
    }
    if (!target.isRooted) target.root()
    const scriptMem = ns.getScriptRam('weaken-target.js')

    const weakenNeeded = target.security - target.minSecurity
    let weakenThreadsNeeded = 0
    while (ns.weakenAnalyze(weakenThreadsNeeded) < weakenNeeded) {
        weakenThreadsNeeded++
    }
    const growMultNeeded = target.maxMoney / Math.max(target.money, 1)
    let growThreadsNeeded = 0
    let weakenNeededAfterGrow = 0
    let weakenThreadsNeededAfterGrow = 0
    if (growMultNeeded > 1) {
        growThreadsNeeded = Math.ceil(calculateGrowThreadsNeeded(ns, target, (-1 / growMultNeeded) + 1) * 1.5)
        weakenNeededAfterGrow = Math.ceil(ns.growthAnalyzeSecurity(growThreadsNeeded))
        while (ns.weakenAnalyze(weakenThreadsNeededAfterGrow) < weakenNeededAfterGrow) {
            weakenThreadsNeededAfterGrow++
        }
    }
    weakenThreadsNeededAfterGrow *= 2

    // Weaken the target to minimum security
    for (const host of hosts) {
        const threads = Math.min(Math.floor(host.availableRAM / scriptMem), weakenThreadsNeeded)
        if (threads <= 0) {
            continue
        }
        ns.exec("weaken-target.js", host.name, {threads: threads, temporary: true}, target.name, 0, "prep")
        weakenThreadsNeeded -= threads
    }

    // Grow the target to maximum money
    let totalThreadsAvailable = hosts.reduce((acc, host) => (acc + Math.floor(host.availableRAM / scriptMem)), 0)
    const growSleepTime = Date.now() + target.weakenTime - target.growTime - 400
    const weakenSleepTime = Date.now() + target.growTime - target.weakenTime
    while (weakenThreadsNeeded > 0 && totalThreadsAvailable > 0) {
        for (const host of hosts) {
            const threads = Math.min(Math.floor(host.availableRAM / scriptMem), weakenThreadsNeededAfterGrow)
            if (threads <= 0) {
                continue
            }
            ns.exec("weaken-target.js", host.name, {threads: threads, temporary: true}, target.name, weakenSleepTime, "prep")
            weakenThreadsNeededAfterGrow -= threads
            totalThreadsAvailable -= threads
            if (weakenThreadsNeededAfterGrow <= 0) {
                break
            }
        }
    }
    while (growThreadsNeeded > 0 && totalThreadsAvailable > 0) {
        for (const host of hosts) {
            const threads = Math.ceil(Math.min(Math.floor(host.availableRAM / scriptMem), growThreadsNeeded))
            if (threads <= 0) {
                continue
            }
            ns.exec("grow-target.js", host.name, {threads: threads, temporary: true}, target.name, growSleepTime, "prep")
            growThreadsNeeded -= threads
            totalThreadsAvailable -= threads
            if (growThreadsNeeded <= 0) {
                break
            }
        }
    }
    while (weakenThreadsNeededAfterGrow > 0 && totalThreadsAvailable > 0) {
        for (const host of hosts) {
            const threads = Math.min(Math.floor(host.availableRAM / scriptMem), weakenThreadsNeededAfterGrow)
            if (threads <= 0) {
                continue
            }
            ns.exec("weaken-target.js", host.name, {threads: threads, temporary: true}, target.name, weakenSleepTime, "prep")
            weakenThreadsNeededAfterGrow -= threads
            totalThreadsAvailable -= threads
            if (weakenThreadsNeededAfterGrow <= 0) {
                break
            }
        }
    }
    return Date.now() + Math.max(target.growTime, target.weakenTime) + 1000
}

async function scheduleBatch(ns: NS, target: Server | undefined, hosts: Server[]) {
    if (target === undefined) {
        return 0
    }
    const maxBatches = 10
    let targetBatches = maxBatches
    let scheduling = true
    let hackRatio = 0.75
    const scheduleBuffer = 1000
    let hackThreads = Math.floor(hackRatio / ns.hackAnalyze(target.name))
    let weakenThreadsAfterHack = Math.ceil(ns.hackAnalyzeSecurity(hackThreads, target.name) / ns.weakenAnalyze(1) * 3)
    let growThreadsAfterHack = calculateGrowThreadsNeeded(ns, target, hackRatio)
    let tempTarget
    if (ns.fileExists("Formulas.exe")) {
        tempTarget = ns.getServer(target.name)
        tempTarget.moneyAvailable = target.maxMoney * (1 - hackRatio)
        growThreadsAfterHack = Math.ceil(ns.formulas.hacking.growThreads(tempTarget, ns.getPlayer(), target.maxMoney) * 2)
    }
    
    let weakenThreadsAfterGrow = Math.ceil(ns.growthAnalyzeSecurity(growThreadsAfterHack) / ns.weakenAnalyze(1) * 1.25)

    while (scheduling && hackRatio > 0.01) {
        targetBatches = maxBatches
        const totalThreadsAvailable = hosts.reduce((acc, host) => (acc + Math.floor(host.availableRAM / 1.75)), 0)

        hackThreads = Math.max(Math.floor(hackRatio / (ns.hackAnalyze(target.name) * ns.hackAnalyzeChance(target.name))), 1)
        weakenThreadsAfterHack = Math.ceil(ns.hackAnalyzeSecurity(hackThreads, target.name) / ns.weakenAnalyze(1) * 3)
        if (ns.fileExists("Formulas.exe")) {
            tempTarget = ns.getServer(target.name)
            tempTarget.moneyAvailable = target.maxMoney * (1 - hackRatio)
            growThreadsAfterHack = Math.ceil(ns.formulas.hacking.growThreads(tempTarget, ns.getPlayer(), target.maxMoney))
        }
        weakenThreadsAfterGrow = Math.ceil(ns.growthAnalyzeSecurity(growThreadsAfterHack) / ns.weakenAnalyze(1) * 1.25)
        const totalThreadsNeeded = hackThreads + weakenThreadsAfterHack + growThreadsAfterHack + weakenThreadsAfterGrow
        targetBatches = Math.min(targetBatches, Math.floor(totalThreadsAvailable / totalThreadsNeeded))
        if (targetBatches < 1) {
            hackRatio -= 0.01
        }
        else {
            scheduling = false
        }
    }

    if (hackRatio < 0.01) {
        ns.print("ERROR: Failed to schedule even a single batch")
        return 0
    }

    const firstWeakenDelay = scheduleBuffer
    const hackDelay = target.weakenTime - target.hackTime - scheduleBuffer + firstWeakenDelay
    const growDelay = firstWeakenDelay + target.weakenTime - target.growTime + scheduleBuffer
    const secondWeakenDelay = growDelay + target.growTime - target.weakenTime + scheduleBuffer
    const batchDelay = secondWeakenDelay + scheduleBuffer

    for (let i = 0; i < targetBatches; i++) {
        const batchHackDelay = hackDelay + batchDelay * i
        const batchFirstWeakDelay = firstWeakenDelay + batchDelay * i
        const batchGrowDelay = growDelay + batchDelay * i
        const batchSecondWeakDelay = secondWeakenDelay + batchDelay * i
        let batchHackThreads = hackThreads
        let batchFirstWeakenThreads = weakenThreadsAfterHack
        let batchGrowThreads = growThreadsAfterHack
        let batchSecondWeakenThreads = weakenThreadsAfterGrow

        const startTime = Date.now()

        while (batchHackThreads > 0) {
            for (const host of hosts) {
                const threads = Math.min(Math.floor(host.availableRAM / 1.7), batchHackThreads)
                if (threads <= 0) {
                    continue
                }
                const ret = ns.exec("hack-target.js", host.name, {threads: threads, temporary: true}, target.name, batchHackDelay + startTime, i)
                if (ret === 0) {
                    ns.print("ERROR: Hack not scheduled")
                }
                batchHackThreads -= threads
                if (batchHackThreads <= 0) {
                    break
                }
            }
            await ns.asleep(10)
        }
        while (batchFirstWeakenThreads > 0) {
            for (const host of hosts) {
                const threads = Math.min(Math.floor(host.availableRAM / 1.75), batchFirstWeakenThreads)
                if (threads <= 0) {
                    continue
                }
                const ret = ns.exec("weaken-target.js", host.name, {threads: threads, temporary: true}, target.name, batchFirstWeakDelay + startTime, i)
                if (ret === 0) {
                    ns.print("ERROR: Weaken not scheduled")
                }
                batchFirstWeakenThreads -= threads
                if (batchFirstWeakenThreads <= 0) {
                    break
                }
            }
            await ns.asleep(10)
        }
        while (batchGrowThreads > 0) {
            for (const host of hosts) {
                const threads = Math.min(Math.floor(host.availableRAM / 1.75), batchGrowThreads)
                if (threads <= 0) {
                    continue
                }
                const ret = ns.exec("grow-target.js", host.name, {threads: threads, temporary: true}, target.name, batchGrowDelay + startTime, i)
                if (ret === 0) {
                    ns.print("ERROR: Grow not scheduled")
                }
                batchGrowThreads -= threads
                if (batchGrowThreads <= 0) {
                    break
                }
            }
            await ns.asleep(10)
        }
        while (batchSecondWeakenThreads > 0) {
            for (const host of hosts) {
                const threads = Math.min(Math.floor(host.availableRAM / 1.75), batchSecondWeakenThreads)
                if (threads <= 0) {
                    continue
                }
                const ret = ns.exec("weaken-target.js", host.name, {threads: threads, temporary: true}, target.name, batchSecondWeakDelay + startTime, i)
                if (ret === 0) {
                    ns.print("ERROR: Second weaken not scheduled")
                }
                batchSecondWeakenThreads -= threads
                if (batchSecondWeakenThreads <= 0) {
                    break
                }
            }
            await ns.asleep(10)
        }
    }

    return Date.now() + secondWeakenDelay + target.weakenTime + (batchDelay * targetBatches) + scheduleBuffer + 1000
}