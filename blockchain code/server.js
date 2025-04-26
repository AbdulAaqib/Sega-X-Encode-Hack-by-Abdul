import express from "express";
import cors from "cors";
import axios from "axios";
import FormData from "form-data";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import hre from "hardhat";

dotenv.config({ path: ".env" });

const app = express();
const port = process.env.PORT || 5111;
app.use(cors());
app.use(express.json());

const BASE_DIR = path.resolve();
const UPLOADS_DIR = path.join(BASE_DIR, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const upload = multer({ dest: UPLOADS_DIR });

app.post("/mint", upload.single("file"), async (req, res) => {
  try {
    const { contractName, contractAddress, recipient, tokenId, traits } = req.body;
    if (!contractName || !contractAddress || !recipient || !tokenId || !traits) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // ─── Parse incoming traits JSON ───────────────────────────────────────────────
    let traitsData;
    try {
      traitsData = typeof traits === "string" ? JSON.parse(traits) : traits;
    } catch (parseErr) {
      return res.status(400).json({ error: "Invalid traits JSON" });
    }

    // 1️⃣ Build on-chain metadata
    const metadata = {
      name: `Trading Card #${tokenId}`,
      description: "A Sonic trading card NFT.",
      image: null,
      attributes: [
        { trait_type: "Character", value: traitsData.Character },
        { trait_type: "Background",   value: traitsData.Background },
        { trait_type: "Aura",         value: traitsData.Aura },
        { trait_type: "Gear",         value: traitsData.Gear },
        { trait_type: "Rarity",       value: traitsData.Rarity }
      ]
    };

    // 2️⃣ Upload image to Pinata
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    const pinataKey    = process.env.PINATA_API_KEY;
    const pinataSecret = process.env.PINATA_SECRET_API_KEY;
    if (!pinataKey || !pinataSecret) throw new Error("Missing Pinata credentials");

    const fileForm = new FormData();
    fileForm.append("file", fs.createReadStream(req.file.path), req.file.originalname);
    const fileRes = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      fileForm,
      { headers: { ...fileForm.getHeaders(), pinata_api_key: pinataKey, pinata_secret_api_key: pinataSecret } }
    );
    const imageUri = `https://gateway.pinata.cloud/ipfs/${fileRes.data.IpfsHash}`;
    metadata.image = imageUri;

    // 3️⃣ Write & upload metadata JSON
    const metaPath = path.join(BASE_DIR, `${tokenId}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
    const metaForm = new FormData();
    metaForm.append("file", fs.createReadStream(metaPath), `${tokenId}.json`);
    metaForm.append("pinataMetadata", JSON.stringify({ name: `metadata_${tokenId}` }));
    const metaRes = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      metaForm,
      { headers: { ...metaForm.getHeaders(), pinata_api_key: pinataKey, pinata_secret_api_key: pinataSecret } }
    );
    const metadataUri = `https://gateway.pinata.cloud/ipfs/${metaRes.data.IpfsHash}`;

    // 4️⃣ Cleanup temp files
    fs.unlinkSync(req.file.path);
    fs.unlinkSync(metaPath);

    // 5️⃣ Mint NFT on-chain
    async function mintOnContract() {
      // Configure provider & signer for Mumbai
      const provider = new hre.ethers.JsonRpcProvider(process.env.POLYGON_MUMBAI_RPC_URL);
      const signer   = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);

      // Attach your deployed contract
      const ContractFactory  = await hre.ethers.getContractFactory("SegaUNLEASHED", signer);
      const contractInstance = await ContractFactory.attach("0xa23869069bc8079B74a03eb62806D6e2E892D9Fe");

      // Validate recipient
      if (!recipient || !hre.ethers.isAddress(recipient)) {
        throw new Error("Invalid recipient address.");
      }

      // Execute mint transaction
      const tx = await contractInstance.safeMint(recipient, parseInt(tokenId), metadataUri);
      await tx.wait();

      console.log(`Minted NFT #${tokenId} to ${recipient}`);
      console.log(`Transaction hash: ${tx.hash}`);
      console.log(`Polygonscan: https://polygonscan.com/tx/${tx.hash}`);
      return tx.hash;
    }

    const txHash = await mintOnContract();

    // 6️⃣ Return success response
    res.json({
      message:         "NFT minted successfully",
      tokenId,
      transactionHash: txHash,
      explorer:        `https://mumbai.polygonscan.com/tx/${txHash}`,
      image:           imageUri,
      metadata:        metadataUri
    });
  }
  catch (err) {
    console.error("Mint error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
