// components/NFTCharactersPage.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useWallet } from '@/context/WalletContext';
import styles from './nft_characters.module.css';

interface NFTData {
  name: string;
  description: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
}

type NFTItem = {
  nft_id: number;
  nft_data: NFTData;
};

export default function NFTCharactersPage() {
  const { account } = useWallet();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) return;

    setLoading(true);
    setError(null);
    fetch(`/api/nft_characters?wallet_address=${account}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setNfts(data.nfts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [account]);

  if (!account)
    return <p className={styles.message}>Please connect your wallet to view NFTs.</p>;
  if (loading) return <p className={styles.message}>Loading NFTs…</p>;
  if (error) return <p className={styles.message}>Error: {error}</p>;

  return (
    <main className={styles.mainContainer}>
      <div className={styles.nftGrid}>
        {nfts.map(({ nft_id, nft_data }) => {
          const openseaUrl = `https://opensea.io/item/matic/0xa23869069bc8079b74a03eb62806d6e2e892d9fe/${nft_id}`;
          return (
            <div key={nft_id} className={styles.nftCard}>
              <div className={styles.imageWrapper}>
                <Image
                  src={nft_data.image}
                  alt={nft_data.name}
                  width={300}
                  height={300}
                  className={styles.nftImage}
                  unoptimized={
                    nft_data.image.startsWith('ipfs://') ||
                    !nft_data.image.startsWith('http')
                  }
                />
              </div>
              <h2 className={styles.nftName}>{nft_data.name}</h2>
              <p className={styles.nftDescription}>{nft_data.description}</p>
              <ul className={styles.attributesList}>
                {nft_data.attributes.map((attr) => (
                  <li key={attr.trait_type} className={styles.attributeItem}>
                    <strong>{attr.trait_type}:</strong> {attr.value}
                  </li>
                ))}
              </ul>

              {/* OpenSea Link */}
              <a
                href={openseaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.openseaLink}
              >
                <Image
                  src="/opensea.png"
                  alt="OpenSea Logo"
                  width={24}
                  height={24}
                  className={styles.openseaLogo}
                />
                <span className={styles.openseaText}>Open NFT in OpenSea</span>
              </a>
            </div>
          );
        })}
      </div>
    </main>
  );
}
