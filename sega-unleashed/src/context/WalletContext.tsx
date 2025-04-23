'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import detectEthereumProvider from '@metamask/detect-provider';
import { BrowserProvider, formatEther, Network } from 'ethers';

interface WalletContextType {
  provider: BrowserProvider | null;
  account: string;
  balance: string;
  chainId: number;
  error: string;
  connectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [chainId, setChainId] = useState<number>(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let ethProvider: any;
    const initialize = async () => {
      ethProvider = await detectEthereumProvider();
      if (!ethProvider) {
        setError('MetaMask not found. Please install the MetaMask extension.');
        return;
      }
      const browserProvider = new BrowserProvider(ethProvider);
      setProvider(browserProvider);
      ethProvider.on('accountsChanged', handleAccountsChanged);
      ethProvider.on('chainChanged', handleChainChanged);
    };
    initialize();
    return () => {
      if (ethProvider?.removeListener) {
        ethProvider.removeListener('accountsChanged', handleAccountsChanged);
        ethProvider.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount('');
      setBalance('');
      setChainId(0);
    } else {
      const addr = accounts[0];
      setAccount(addr);
      if (provider) {
        const bal = await provider.getBalance(addr);
        setBalance(formatEther(bal));
      }
    }
  };

  const handleChainChanged = async (chainHex: string) => {
    const id = parseInt(chainHex, 16);
    setChainId(id);
    if (provider && account) {
      const bal = await provider.getBalance(account);
      setBalance(formatEther(bal));
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Ethereum provider not found.');
      return;
    }
    try {
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await handleAccountsChanged(accounts);
      if (provider) {
        const net: Network = await provider.getNetwork();
        setChainId(net.chainId);
      }
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  return (
    <WalletContext.Provider value={{ provider, account, balance, chainId, error, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within a WalletProvider');
  return context;
};