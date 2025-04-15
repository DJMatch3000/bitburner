import { NS } from "@ns";

/**
 * @param {NS} ns
 */
export async function main(ns: NS) {
    var startingNode = ns.getHostname();
    
    var hostsToScan = [];
    hostsToScan.push(startingNode);
    var serverList: string[] = [];

    let target = ns.args.length > 0 ? ns.args[0].toString() : 'None'
    
    // assemble a server list.
    while (hostsToScan.length > 0) {
        var hostName = hostsToScan.pop();
        if (hostName === undefined) {
            break
        }
        if (!serverList.includes(hostName)) {
            var connectedHosts = ns.scan(hostName);
            for (var i = 0; i < connectedHosts.length; i++) {
                hostsToScan.push(connectedHosts[i]);
            }
            serverList.push(hostName);
        }
    }
    
    for (var s = 0; s < serverList.length; s++) {
        // skip if this host, we save it for last
        if (serverList[s] == startingNode)
            continue;
            
        // skip if not running anything
        if (ns.ps(serverList[s]).length === 0)
            continue;
            
        // kill all scripts
        if (target === 'None') {
            ns.killall(serverList[s]);
        }
        else {
            ns.scriptKill(target, serverList[s])
        }
    }
    
    // idle for things to die
    for (var x = 0; x < serverList.length; x++) {
        // skip if this host, we save it for last
        if (serverList[x] == startingNode)
            continue;
        // idle until they're dead, this is to avoid killing the cascade before it's finished.
        while (ns.ps(serverList[x]).length > 0) {
            await ns.sleep(20);
        }
    }
    
    // wait to kill these. This kills itself, obviously.
    if (target === 'None') {
        ns.killall(startingNode);
    }
    else {
        ns.scriptKill(target, startingNode)
    }
}