/* src/components/TxList.tsx */
'use client';

import React from 'react';
import type { TransactionResponse } from 'ethers';

interface TxListProps {
  txs: TransactionResponse[];
}

const TxList: React.FC<TxListProps> = ({ txs }) => {
  if (txs.length === 0) return null;

  return (
    <>
      {txs.map((tx) => (
        <div key={tx.hash} className="alert alert-info mt-5">
          <div className="flex-1">
            <label>{tx.hash}</label>
          </div>
        </div>
      ))}
    </>
  );
};

export default TxList;
