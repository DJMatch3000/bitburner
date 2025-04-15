import { NS } from "@ns";
import { recursiveScan } from "./find-server";

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL')
    if (ns.args.length < 1) {
        ns.tprint("Target not provided")
        return
    }
    let target = ns.args[0].toString()
    goToServer(ns, target)
}

export function goToServer(ns: NS, target: string) {
    let path: string[] = []
    ns.singularity.connect("home")
    recursiveScan(ns, '', 'home', target, path)
    if (path === undefined) {
        ns.tprint("Path not found")
        return
    }
    // ns.tprint(JSON.stringify(path))

    for (let s of path) {
        ns.singularity.connect(s)
    }
}

export function autocomplete(data: any, args: any) {
    return data.servers;
}
