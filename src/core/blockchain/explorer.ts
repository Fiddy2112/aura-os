import axios from "axios";


export class BlockchainExplorer {
    private apiKey = process.env.ETHERSCAN_API_KEY;
    private baseUrl = 'https://api.etherscan.io/v2/api';

    async getTransactions(address:string){
        try{
            const response = await axios.get(this.baseUrl,{
                params:{
                    module:"account",
                    action: 'txlist',
                    address,
                    startblock: 0,
                    endblock: 99999999,
                    page: 1,
                    offset: 5,
                    sort: 'desc',
                    apikey:this.apiKey
                }
            })
            if (response.data.status !== '1') return [];
            return response.data.result;
        }catch(error){
            console.error('Error fetching transactions:', error);
            return [];
        }
    }
    
}
