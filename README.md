# Sega X Encode Hack by Abdul
![SEGA Unleashed Demo](./SEGA-UNLEASHED-gif.gif)
<!-- Badges -->

[![Release](https://img.shields.io/badge/release-v1.0.0-blue.svg)](https://github.com/yourusername/your-repo/releases) [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE) [![Built with Next.js](https://img.shields.io/badge/built%20with-Next.js-black?logo=next.js)](https://nextjs.org/) [![Polygon](https://img.shields.io/badge/blockchain-Polygon-purple)](https://polygon.technology/)

## Project Overview

A decentralized, narrative-driven trading card web game combining NFTs on Polygon with ChatGPT-powered storytelling. Players mint randomized character packs, own verifiable on-chain assets, and engage in dynamic GPT-based battles for an ever-evolving play experience.


https://sega-x-encode-hack-by-abdul.vercel.app

![oaicite:6](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=Ethereum&logoColor=white)
![oaicite:6](https://img.shields.io/badge/microsoft%20azure-0089D6?style=for-the-badge&logo=microsoft-azure&logoColor=white)
![oaicite:12](https://img.shields.io/badge/web3%20js-F16822?style=for-the-badge&logo=web3.js&logoColor=white)
![oaicite:14](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=white)
![oaicite:16](https://img.shields.io/badge/next%20js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![oaicite:18](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![oaicite:20](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![oaicite:22](https://img.shields.io/badge/Solidity-e6e6e6?style=for-the-badge&logo=solidity&logoColor=black)



![oaicite:22](https://github.com/AbdulAaqib/Sega-X-Encode-Hack-by-Abdul/blob/main/Comfyui.png?raw=true)

![oaicite:22](https://github.com/AbdulAaqib/Sega-X-Encode-Hack-by-Abdul/blob/main/metamask.png?raw=true)

![oaicite:22](https://github.com/Junaid2005/keychain-app/blob/main/polygon.png?raw=true)



## Table of Contents

* [Problem Statement](#problem-statement)
* [Target Audience](#target-audience)
* [Solution](#solution)
* [Features](#features)
* [Architecture](#architecture)
* [Data Flow](#data-flow)
* [Getting Started](#getting-started)

  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [Usage](#usage)
* [Challenges & Learnings](#challenges--learnings)
* [Future Roadmap](#future-roadmap)


## Problem Statement

Traditional digital trading-card games lock ownership within centralized servers, hindering peer-to-peer markets and real asset value exchange. Gameplay often lacks dynamic narrative guidance, making onboarding steep for new players, and counterfeit cards pose authenticity risks.

## Target Audience

* **Collectors & Traders** seeking provable digital ownership and open-market liquidity.
* **Casual Gamers** desiring narrative-driven progression with personalized guidance.
* **Web3 Enthusiasts** looking for engaging on-chain experiences beyond pure finance apps.

## Solution

We deliver a web game where each “card pack” is an NFT mint transaction on Polygon, blending blockchain verifiability with GPT-4-driven storytelling. A ChatGPT API integration serves as in-game tutor and narrator, adapting to player skill and choices for replayability.

## Features

* **True Ownership**: NFTs minted via `safeMint()` on a Solidity contract; metadata hosted on IPFS/Pinata. Secondary trading enabled on OpenSea.
* **Dynamic Onboarding**: GPT-guided tutorials and flavor text adapt to user queries.
* **Replayable Economy**: Randomized NFT packs sustain secondary markets and organic growth.
* **Narrative Battles**: ChatGPT “Game Master” crafts unique battle logs and events per match.

## Architecture

### Frontend

* Next.js + React + TypeScript for UI and routing.
* Three.js for animated card-battle scenes.
* Vercel deployment for global edge performance.
* Wallet auth via MetaMask and ethers.js.

### Backend

* Node.js server handling mint logic, off-chain simulations, and GPT calls.
* REST API endpoints:

  * `/api/mint` → triggers NFT mint.
  * `/api/battle` → simulates matches and logs events.
  * `/api/leaderboard` → aggregates stats.

### Database & Storage

* Supabase (Postgres) tables: `user_data`, `nft_data`.
* IPFS via Pinata for metadata JSON (images, attributes, lore links).

### Blockchain

* Solidity contract on Polygon with `safeMint()` and metadata URI pointer.

### AI Integration

* GPT-4 API for narrative, coaching tips, and dynamic event generation. Context includes player roster and battle history.

## Data Flow

1. **Buy Pack**: Frontend → `POST /api/mint` → Contract `safeMint()` → on-chain tx → Supabase writes `nft_data`.
2. **Battle**: Frontend → `POST /api/battle` → simulate → log to Supabase → GPT-4 narration → return battle log.
3. **Leaderboard**: Query Supabase for ranking by wins, rarity, token rewards.

## Getting Started

### Prerequisites

* Node.js >= 16
* Yarn or npm
* MetaMask wallet
* Polygon testnet/mainnet access

### Installation

```bash
# Clone repo
git clone https://github.com/yourusername/your-repo.git
cd your-repo
# Install deps
npm install
# Env variables
cp .env.example .env
# Run locally
npm run dev
```

## Usage

1. Connect wallet via MetaMask.
2. Purchase NFT card packs.
3. View roster, engage in GPT-narrated battles.
4. Trade cards on OpenSea.

## Challenges & Learnings

* **Solidity Edge Cases**: Implemented reentrancy guards and learned rigorous on-chain testing.
* **TypeScript Rigidity**: Built custom type wrappers for ethers.js and Supabase, improving DX.
* **Three.js Performance**: Profiled and optimized scenes for frame-rate consistency on low-end devices.
* **Schema Migrations**: Employed shadow columns and atomic switchovers for zero-downtime migrations.

## Future Roadmap

* **Staking & Rewards**: Lock NFTs for in-game currency and governance rights.
* **Multiplayer Tournaments**: Scheduled PvP brackets with on-chain prize pools.
* **Contract Upgrades**: ERC-1155 support and upgradability proxies.
* **Type-Safe Backend**: Migrate server to full TypeScript and GraphQL.
* **Fine-Tuned AI**: Custom GPT model trained on game lore for richer narratives.
* **Analytics Dashboard**: Integrate BI tools for drop-rate heatmaps and churn analysis.

