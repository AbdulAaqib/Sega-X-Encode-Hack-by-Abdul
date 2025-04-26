import express from "express";
import cors from "cors";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import hre from "hardhat";

dotenv.config({ path: ".env" });

const app = express();
const port = process.env.PORT || 5111;
app.use(cors());
app.use(express.json());

// Fixed image path used for all mints
const IMAGE_PATH = "C:/Users/AImageGenerationGPU/Downloads/b9f7e65fdbc2a1aea95564c45e714828.png";

// Token ID tracker file functions
const BASE_DIR = path.resolve();
const TOKEN_TRACKER_PATH = path.join(BASE_DIR, "token_id_tracker.json");
function peekCurrentTokenId() {
  if (!fs.existsSync(TOKEN_TRACKER_PATH)) return 0;
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_TRACKER_PATH, "utf8"));
    return data.current || 0;
  } catch {
    return 0;
  }
}
function updateTokenId(current) {
  fs.writeFileSync(TOKEN_TRACKER_PATH, JSON.stringify({ current }, null, 2));
}

// Trait pools
const TRAITS = {
  characters: ["Sonic", "Tails", "Knuckles", "Amy"],
  backgrounds: ["Green Hill", "Chemical Plant", "Sky Sanctuary", "Mystic Cave"],
  auras: ["Red Glow", "Blue Glow", "Yellow Glow", "Purple Glow"],
  gear: ["Speed Shoes", "Dash Gloves", "Power Ring", "Shield Booster"]
};

// Pack distributions
const PACKS = {
  Bronze: { size: 3, distribution: { Common: 2, Rare: 1, Epic: 0, Legendary: 0 } },
  Silver: { size: 5, distribution: { Common: 3, Rare: 1, Epic: 1, Legendary: 0 } },
  Gold:   { size: 7, distribution: { Common: 3, Rare: 2, Epic: 1, Legendary: 1 } }
};

// Mint on-chain helper
async function mintOnContract(recipient, tokenId, metadataUri) {
  console.log(`Minting on-chain: token ${tokenId} to ${recipient}`);
  const provider = new hre.ethers.JsonRpcProvider(process.env.POLYGON_MUMBAI_RPC_URL);
  const signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const ContractFactory = await hre.ethers.getContractFactory("SegaUNLEASHED", signer);
  const contract = await ContractFactory.attach(process.env.CONTRACT_ADDRESS);
  if (!hre.ethers.isAddress(recipient)) throw new Error("Invalid recipient address.");
  const tx = await contract.safeMint(recipient, tokenId, metadataUri);
  await tx.wait();
  console.log(`Transaction complete: ${tx.hash}`);
  return tx.hash;
}

app.post("/mint", async (req, res) => {
  try {
    const { recipient, traits } = req.body;
    if (!recipient || !traits?.packType) {
      return res.status(400).json({ error: "Missing recipient or packType" });
    }

    const packType = traits.packType;
    const pack = PACKS[packType];
    if (!pack) {
      return res.status(400).json({ error: `Unknown packType: ${packType}` });
    }

    console.log(`Starting mint of ${packType} pack for recipient ${recipient}`);

    // Ensure fixed image exists and pin once
    console.log("Pinning pack image to IPFS...");
    if (!fs.existsSync(IMAGE_PATH)) {
      console.error("Fixed image file not found on server.");
      return res.status(500).json({ error: "Fixed image file not found on server." });
    }
    const pinataKey = process.env.PINATA_API_KEY;
    const pinataSecret = process.env.PINATA_SECRET_API_KEY;
    if (!pinataKey || !pinataSecret) throw new Error("Missing Pinata credentials");

    const imageForm = new FormData();
    imageForm.append("file", fs.createReadStream(IMAGE_PATH), path.basename(IMAGE_PATH));
    const imageRes = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      imageForm,
      { headers: { ...imageForm.getHeaders(), pinata_api_key: pinataKey, pinata_secret_api_key: pinataSecret } }
    );
    const imageUri = `https://gateway.pinata.cloud/ipfs/${imageRes.data.IpfsHash}`;
    console.log(`Image pinned: ${imageUri}`);

    // Prepare minting loop
    const minted = [];
    let currentId = peekCurrentTokenId();

    for (const [rarity, count] of Object.entries(pack.distribution)) {
      for (let i = 0; i < count; i++) {
        console.log(`Minting ${rarity} card ${i + 1}/${count}`);
        currentId += 1;

        // Randomize other traits
        const character = TRAITS.characters[Math.floor(Math.random() * TRAITS.characters.length)];
        const background = TRAITS.backgrounds[Math.floor(Math.random() * TRAITS.backgrounds.length)];
        const aura = TRAITS.auras[Math.floor(Math.random() * TRAITS.auras.length)];
        const gear = TRAITS.gear[Math.floor(Math.random() * TRAITS.gear.length)];

        // Build metadata
        const metadata = {
          name: `SegaUNLEASHED #${currentId}`,
          description: `A ${packType} pack Sonic trading card NFT (token ${currentId}).`, 
          image: imageUri,
          attributes: [
            { trait_type: "Character", value: character },
            { trait_type: "Background", value: background },
            { trait_type: "Aura", value: aura },
            { trait_type: "Gear", value: gear },
            { trait_type: "Rarity", value: rarity }
          ]
        };

        console.log(`Pinning metadata for token ${currentId}...`);
        // Pin metadata
        const metaForm = new FormData();
        metaForm.append("file", JSON.stringify(metadata, null, 2), { filename: `${currentId}.json` });
        metaForm.append("pinataMetadata", JSON.stringify({ name: `metadata_${currentId}` }));
        const metaRes = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          metaForm,
          { headers: { ...metaForm.getHeaders(), pinata_api_key: pinataKey, pinata_secret_api_key: pinataSecret } }
        );
        const metadataUri = `https://gateway.pinata.cloud/ipfs/${metaRes.data.IpfsHash}`;
        console.log(`Metadata pinned: ${metadataUri}`);

        // Mint NFT on-chain
        const txHash = await mintOnContract(recipient, currentId, metadataUri);
        updateTokenId(currentId);
        console.log(`Minted token ${currentId} (${rarity}) -> tx: ${txHash}`);

        minted.push({ tokenId: currentId, metadata: metadataUri, image: imageUri, transactionHash: txHash });
      }
    }

    console.log(`Completed minting pack for ${recipient}`);
    res.json({ message: "NFT pack minted successfully", packType, minted });
  } catch (err) {
    console.error("Mint error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));