import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL')
    await test(ns)
}

async function test(ns: NS): Promise<void> {
    const faction = "CyberSec"
    const augs = ns.singularity.getAugmentationsFromFaction(faction)
    const filteredAugs = []
    /**
     * -Get faction augs
     * -Filter NeuroFlux
     * -Filter augs we don't have rep for
     * -Sort by cost descending
     * -Reorder prereqs first
     */
    for (const aug of augs) {
        if (aug !== "NeuroFlux Governor" /*&& ns.singularity.getFactionRep(faction) >= ns.singularity.getAugmentationRepReq(aug)*/) {
            filteredAugs.push(aug)
        }
    }
    filteredAugs.sort((a, b) => (ns.singularity.getAugmentationPrice(b) - ns.singularity.getAugmentationPrice(a)))
    for (let i = 0; i < filteredAugs.length; i++) {
        const prereqs = ns.singularity.getAugmentationPrereq(filteredAugs[i])
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
    ns.tprint(filteredAugs)
}