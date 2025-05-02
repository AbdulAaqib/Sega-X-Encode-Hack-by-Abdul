// MintPack/index.js

const axios    = require("axios");
const FormData = require("form-data");
const fs       = require("fs");
const path     = require("path");
const { createClient } = require("@supabase/supabase-js");
const hre      = require("hardhat");

// Hardcoded credentials and settings
const PINATA_API_KEY        = "6ce4fd653d6458fa8bc6";
const PINATA_SECRET_API_KEY = "f9de446bb998f36fcc62e5e38593489037889a96a5cf850231e3733b6c199676";
const SUPABASE_URL          = "https://ggiievredpxistkndfuw.supabase.co";
const SUPABASE_KEY          = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const POLYGON_MUMBAI_RPC_URL = "https://polygon-mainnet.infura.io/v3/0006bbd7c83346e79019f7fbdd74fde5";
const PRIVATE_KEY           = "ca53f115c234ce09c26f14dc1170fc1769d6b0db3489bcb1f4761b6145223edd";
const CONTRACT_ADDRESS      = "0xa23869069bc8079B74a03eb62806D6e2E892D9Fe";

// Resolve directories relative to this file
const IMAGES_DIR   = path.resolve(__dirname, "../final_images");
const TRACKER_PATH = path.resolve(__dirname, "../token_id_tracker.json");

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function peekCurrentTokenId(context) {
  context.log("peekCurrentTokenId > TRACKER_PATH:", TRACKER_PATH);
  if (!fs.existsSync(TRACKER_PATH)) {
    context.log("peekCurrentTokenId > no tracker file, returning 0");
    return 0;
  }
  try {
    const raw    = fs.readFileSync(TRACKER_PATH, "utf8");
    const parsed = JSON.parse(raw);
    context.log("peekCurrentTokenId > parsed JSON:", parsed);
    return parsed.current || 0;
  } catch (err) {
    context.log.error("peekCurrentTokenId > JSON parse error:", err);
    return 0;
  }
}

function updateTokenId(context, current) {
  context.log("updateTokenId > current:", current);
  fs.mkdirSync(path.dirname(TRACKER_PATH), { recursive: true });
  fs.writeFileSync(TRACKER_PATH, JSON.stringify({ current }, null, 2), "utf8");
  context.log("updateTokenId > file written");
}

// Trait pools
const TRAITS = {
  characters:   ["Sonic","Tails","Knuckles","Amy"],
  backgrounds:  ["Green Hill","Blue Space"],
  lightning:    ["Red Lightning","Blue Lightning"],
  gear:         ["Speed Shoes","Dash Gloves","Power Ring","Shield Booster"],
};

// Pack distributions
const PACKS = {
  Bronze: { size: 3, distribution: { Common: 2, Rare: 1, Epic: 0, Legendary: 0 } },
  Silver: { size: 5, distribution: { Common: 3, Rare: 1, Epic: 1, Legendary: 0 } },
  Gold:   { size: 7, distribution: { Common: 3, Rare: 2, Epic: 1, Legendary: 1 } },
};

function buildImagePath(context, character, background, lightning) {
  context.log("buildImagePath > IMAGES_DIR:", IMAGES_DIR);
  const files = fs.readdirSync(IMAGES_DIR);
  context.log("buildImagePath > directory files:", files);

  const charKey = character.toLowerCase();
  const bgKey   = background.toLowerCase().includes("green") ? "green_hill" : "blue_hill";
  const ltKey   = lightning.toLowerCase().includes("blue")   ? "bluelightning" : "redlightning";

  const match = files.find(f => {
    const l = f.toLowerCase();
    return l.includes(charKey) && l.includes(bgKey) && l.includes(ltKey);
  });

  if (!match) {
    const errMsg = `No image file matching ${character}, ${background}, ${lightning}`;
    context.log.error("buildImagePath >", errMsg);
    throw new Error(errMsg);
  }

  return path.join(IMAGES_DIR, match);
}

async function mintOnContract(context, recipient, tokenId, metadataUri) {
  context.log("mintOnContract >", { recipient, tokenId, metadataUri });
  const provider = new hre.ethers.JsonRpcProvider(POLYGON_MUMBAI_RPC_URL);
  const signer   = new hre.ethers.Wallet(PRIVATE_KEY, provider);
  const Factory  = await hre.ethers.getContractFactory("SegaUNLEASHED", signer);
  const contract = Factory.attach(CONTRACT_ADDRESS);

  if (!hre.ethers.isAddress(recipient)) {
    throw new Error("Invalid recipient address.");
  }

  const tx = await contract.safeMint(recipient, tokenId, metadataUri);
  await tx.wait();
  return tx.hash;
}

module.exports = async function (context, req) {
  context.log("---- MintPack function invoked ----");
  const { recipient, traits } = req.body || {};
  if (!recipient || !traits?.packType) {
    context.res = { status: 400, body: { error: "Missing recipient or packType" } };
    return;
  }

  const pack = PACKS[traits.packType];
  if (!pack) {
    context.res = { status: 400, body: { error: `Unknown packType: ${traits.packType}` } };
    return;
  }

  let currentId = peekCurrentTokenId(context);
  const mintedIds = [];

  for (const [rarity, count] of Object.entries(pack.distribution)) {
    for (let i = 0; i < count; i++) {
      currentId++;
      const character  = TRAITS.characters[Math.floor(Math.random()*TRAITS.characters.length)];
      const background = TRAITS.backgrounds[Math.floor(Math.random()*TRAITS.backgrounds.length)];
      const lightning  = TRAITS.lightning[Math.floor(Math.random()*TRAITS.lightning.length)];
      const gear       = TRAITS.gear[Math.floor(Math.random()*TRAITS.gear.length)];

      const imagePath = buildImagePath(context, character, background, lightning);
      const imageForm = new FormData();
      imageForm.append("file", fs.createReadStream(imagePath));
      const pinImageRes = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", imageForm, {
        headers: { ...imageForm.getHeaders(), pinata_api_key: PINATA_API_KEY, pinata_secret_api_key: PINATA_SECRET_API_KEY }
      });
      const imageUri = `https://gateway.pinata.cloud/ipfs/${pinImageRes.data.IpfsHash}`;

      const metadata = {
        name:        `SegaUNLEASHED #${currentId}`,
        description: `A ${traits.packType} pack Sonic trading card NFT (token ${currentId}).`,
        image:       imageUri,
        attributes:  [
          { trait_type: "Character", value: character },
          { trait_type: "Background", value: background },
          { trait_type: "Lightning", value: lightning },
          { trait_type: "Gear", value: gear },
          { trait_type: "Rarity", value: rarity },
        ],
      };

      const metaForm = new FormData();
      metaForm.append("file", JSON.stringify(metadata, null, 2), { filename: `${currentId}.json` });
      metaForm.append("pinataMetadata", JSON.stringify({ name: `metadata_${currentId}` }));
      const pinMetaRes = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", metaForm, {
        headers: { ...metaForm.getHeaders(), pinata_api_key: PINATA_API_KEY, pinata_secret_api_key: PINATA_SECRET_API_KEY }
      });
      const metadataUri = `https://gateway.pinata.cloud/ipfs/${pinMetaRes.data.IpfsHash}`;

      const txHash = await mintOnContract(context, recipient.toLowerCase(), currentId, metadataUri);

      updateTokenId(context, currentId);
      await supabase.from("nfts").insert({ nft_id: currentId, nft_data: metadata });

      const { data: existing } = await supabase.from("user_data").select("data").eq("wallet_address", recipient.toLowerCase()).single();
      const list = Array.isArray(existing?.data) ? existing.data : [];
      list.push(currentId);
      await supabase.from("user_data").upsert({ wallet_address: recipient.toLowerCase(), data: list });

      mintedIds.push(currentId);
    }
  }

  context.res = { status: 200, body: mintedIds };
};
