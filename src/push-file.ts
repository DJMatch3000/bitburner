import { NS } from "@ns";
import { getAllServers, Server } from "utils";

export async function main(ns: NS): Promise<void> {
    let servs = getAllServers(ns)
    if (ns.args.length <= 0) {
        ns.tprint("No filename given")
        ns.exit()
    }
    let filename = ns.args[0].toString()
    for (let serv of servs) {
        if (serv.name === "home") {
            continue
        }
        if (ns.fileExists(filename, serv.name)) {
            ns.rm(filename, serv.name)
            ns.scp(filename, serv.name, "home")
        }
    }
}
