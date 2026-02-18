import { scanContract } from "../core/engine/scanner.js";

export default function (args){
    const {address} = args;
    const result = scanContract(address);
    console.log(`Risk: ${result.riskScore}`);
}