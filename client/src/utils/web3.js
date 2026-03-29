import { ethers } from 'ethers';
import GovernanceABI from '../abis/Governance.json';
import ContractAddress from '../abis/contract-address.json';

export const connectWallet = async () => {
    if (window.ethereum) {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            return { provider, signer, address };
        } catch (error) {
            console.error("User rejected connection", error);
            throw error;
        }
    } else {
        throw new Error("MetaMask not found");
    }
};

export const switchNetwork = async () => {
    if (window.ethereum) {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x7A69' }], // 31337
            });
        } catch (error) {
            // This error code indicates that the chain has not been added to MetaMask.
            if (error.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: '0x7A69',
                                chainName: 'Localhost 8545',
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18,
                                },
                                rpcUrls: ['http://127.0.0.1:8545/'],
                            },
                        ],
                    });
                } catch (addError) {
                    console.error("Failed to add network", addError);
                }
            } else {
                console.error("Failed to switch network", error);
            }
        }
    }
};

export const getContract = async (signerOrProvider) => {
    return new ethers.Contract(ContractAddress.address, GovernanceABI, signerOrProvider);
};
