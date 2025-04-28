import express from "express";
import cors from "cors";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import hre from "hardhat";
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: ".env" });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase configuration in .env");
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = process.env.PORT || 5111;
app.use(cors());
app.use(express.json());

// Paths
const BASE_DIR = path.resolve();
const IMAGES_DIR = "C:\\Users\\AImageGenerationGPU\\Documents\\GitHub\\Sega-X-Encode-Hack-by-Abdul\\final_images";
const TOKEN_TRACKER_PATH = path.join(BASE_DIR, "token_id_tracker.json");

// Token ID tracker functions
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
  backgrounds: ["Green Hill", "Blue Space"],
  lightning: ["Red Lightning", "Blue Lightning"],
  gear: ["Speed Shoes", "Dash Gloves", "Power Ring", "Shield Booster"]
};

// Pack distributions
const PACKS = {
  Bronze: { size: 3, distribution: { Common: 2, Rare: 1, Epic: 0, Legendary: 0 } },
  Silver: { size: 5, distribution: { Common: 3, Rare: 1, Epic: 1, Legendary: 0 } },
  Gold:   { size: 7, distribution: { Common: 3, Rare: 2, Epic: 1, Legendary: 1 } }
};

/**
 * Build the image path by matching the actual filename in final_images
 * to ensure exact filenames are used (including .jpeg_ in names)
 */
function buildImagePath(character, background, lightning) {
  const charKey = character.toLowerCase();
  const bgKey = background.toLowerCase().includes("green") ? "green_hill" : "blue_hill";
  const ltKey = lightning.toLowerCase().includes("blue") ? "bluelightning" : "redlightning";
  const files = fs.readdirSync(IMAGES_DIR);
  const match = files.find((fname) => {
    const lower = fname.toLowerCase();
    return lower.includes(`${charKey}_`) && lower.includes(`${bgKey}_`) && lower.includes(`${ltKey}`);
  });
  if (!match) {
    throw new Error(`No image file matching ${character}, ${background}, ${lightning}`);
  }
  return path.join(IMAGES_DIR, match);
}

// Mint on-chain helper
async function mintOnContract(recipient, tokenId, metadataUri) {
  console.log(`Minting on-chain: token ${tokenId} to ${recipient}`);
  const provider = new hre.ethers.JsonRpcProvider(process.env.POLYGON_MUMBAI_RPC_URL);
  const signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const Factory = await hre.ethers.getContractFactory("SegaUNLEASHED", signer);
  const contract = Factory.attach(process.env.CONTRACT_ADDRESS);
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

    // Normalize recipient address to lowercase for database
    const recipientAddress = recipient.toLowerCase();

    const packType = traits.packType;
    const pack = PACKS[packType];
    if (!pack) return res.status(400).json({ error: `Unknown packType: ${packType}` });

    console.log(`Minting ${packType} pack for ${recipientAddress}`);

    // Pinata credentials
    const pinataKey = process.env.PINATA_API_KEY;
    const pinataSecret = process.env.PINATA_SECRET_API_KEY;
    if (!pinataKey || !pinataSecret) throw new Error("Missing Pinata credentials");

    let currentId = peekCurrentTokenId();
    const mintedIds = [];

    for (const [rarity, count] of Object.entries(pack.distribution)) {
      for (let i = 0; i < count; i++) {
        currentId++;
        const character = TRAITS.characters[Math.floor(Math.random() * TRAITS.characters.length)];
        const background = TRAITS.backgrounds[Math.floor(Math.random() * TRAITS.backgrounds.length)];
        const lightning = TRAITS.lightning[Math.floor(Math.random() * TRAITS.lightning.length)];
        const gear = TRAITS.gear[Math.floor(Math.random() * TRAITS.gear.length)];

        // Build and pin the correct image
        const imagePath = buildImagePath(character, background, lightning);
        const imageForm = new FormData();
        imageForm.append("file", fs.createReadStream(imagePath), path.basename(imagePath));
        const pinImage = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          imageForm,
          { headers: { ...imageForm.getHeaders(), pinata_api_key: pinataKey, pinata_secret_api_key: pinataSecret } }
        );
        const imageUri = `https://gateway.pinata.cloud/ipfs/${pinImage.data.IpfsHash}`;

        // Metadata payload
        const metadata = {
          name: `SegaUNLEASHED #${currentId}`,
          description: `A ${packType} pack Sonic trading card NFT (token ${currentId}).`, 
          image: imageUri,
          attributes: [
            { trait_type: "Character", value: character },
            { trait_type: "Background", value: background },
            { trait_type: "Lightning", value: lightning },
            { trait_type: "Gear", value: gear },
            { trait_type: "Rarity", value: rarity }
          ]
        };

        // Pin metadata
        const metaForm = new FormData();
        metaForm.append("file", JSON.stringify(metadata, null, 2), { filename: `${currentId}.json` });
        metaForm.append("pinataMetadata", JSON.stringify({ name: `metadata_${currentId}` }));
        const pinMeta = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          metaForm,
          { headers: { ...metaForm.getHeaders(), pinata_api_key: pinataKey, pinata_secret_api_key: pinataSecret } }
        );
        const metadataUri = `https://gateway.pinata.cloud/ipfs/${pinMeta.data.IpfsHash}`;

        // On-chain mint
        const txHash = await mintOnContract(recipientAddress, currentId, metadataUri);
        updateTokenId(currentId);

        // Database inserts: use lowercase address
        await supabase.from('nfts').insert({ nft_id: currentId, nft_data: metadata }).single();
        const { data: existing } = await supabase
          .from('user_data')
          .select('data')
          .eq('wallet_address', recipientAddress)
          .single();
        const userTokenIds = (existing?.data || []);
        userTokenIds.push(currentId);
        await supabase.from('user_data').upsert({ wallet_address: recipientAddress, data: userTokenIds });

        mintedIds.push(currentId);
      }
    }

    console.log(`Completed ${mintedIds.length} mints for ${recipientAddress}`);
    res.json(mintedIds);
  } catch (err) {
    console.error("Mint error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
