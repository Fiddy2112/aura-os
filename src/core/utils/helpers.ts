/**
 * 
 * @param fn call promise
 * @param retries call again
 * @returns function call
 */
export async function safeRpcCall<T>(fn: ()=> Promise<T>, retries = 2):Promise<T>{
    try{
        return await fn();
    }catch(err){
        if(retries <=0) throw err;
        await new Promise(r => setTimeout(r,500));
        return safeRpcCall(fn, retries - 1);
    }
}

export function formatSupply(supply: bigint, decimals: number){
    const divisor = 10n ** BigInt(decimals);
    const whole = supply / divisor;
    const fraction = supply % divisor;

    const fractionStr = fraction.toString().padStart(decimals, '0').slice(0,4);

    return `${whole.toLocaleString()}.${fractionStr}`;
}