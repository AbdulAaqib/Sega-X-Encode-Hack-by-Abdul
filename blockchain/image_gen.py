import os
import json
import requests

# === Configuration ===
COMFYUI_URL = "http://127.0.0.1:8188/prompt"
IMAGE_DIR = r"C:\Users\AImageGenerationGPU\Documents\GitHub\Sega-X-Encode-Hack-by-Abdul\images2"
LOAD_NODE_KEY = "1"      # LoadImage node key in your JSON
SAVE_NODE_KEY = "11"     # SaveImage node key in your JSON

# === Workflow JSON (embedded) ===
workflow = {
  "1": {
    "inputs": {
      "image": "b9f7e65fdbc2a1aea95564c45e714828.png",
      "upload": "image"
    },
    "class_type": "LoadImage",
    "_meta": {"title": "Load Image"}
  },
  "2": {
    "inputs": {
      "pixel_size": 5,
      "image": ["1", 0]
    },
    "class_type": "Pixelization",
    "_meta": {"title": "Pixelization"}
  },
  "3": {
    "inputs": {
      "images": ["4", 0]
    },
    "class_type": "PreviewImage",
    "_meta": {"title": "Preview Image"}
  },
  "4": {
    "inputs": {
      "pixel_size": 5,
      "image": ["2", 0]
    },
    "class_type": "Pixelization",
    "_meta": {"title": "Pixelization"}
  },
  "11": {
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": ["4", 0]
    },
    "class_type": "SaveImage",
    "_meta": {"title": "Save Image"}
  }
}

# === Iterate images and dispatch ===
for fname in os.listdir(IMAGE_DIR):
    if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
        continue

    full_path = os.path.join(IMAGE_DIR, fname)
    base_name, _ = os.path.splitext(fname)

    # Inject this image path into LoadImage node
    workflow[LOAD_NODE_KEY]["inputs"]["image"] = full_path

    # Set a descriptive filename_prefix for saving
    workflow[SAVE_NODE_KEY]["inputs"]["filename_prefix"] = base_name

    # Wrap under "prompt" and send
    payload = {"prompt": workflow}
    print(f"→ Sending workflow with image: {full_path}")
    resp = requests.post(COMFYUI_URL, json=payload)

    if resp.ok:
        data = resp.json()
        pid = data.get("prompt_id") or data.get("id")
        print(f"   ✔ Enqueued as prompt_id = {pid} (prefix: {base_name})")
    else:
        print(f"   ✖ Error {resp.status_code}: {resp.text}")
