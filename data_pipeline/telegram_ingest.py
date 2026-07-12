"""
Telegram Bot Data Ingestion Pipeline for Robin Hood Architecture.

This script polls for updates from a specific Telegram bot token.
For any images sent to the bot, it runs pytesseract to extract the Gross Total Value.
If multiple different users submit the same value (within 5% margin) for a given constituency,
it appends the verified data to `representatives.json`.

Expects TELEGRAM_BOT_TOKEN environment variable.
"""

import os
import json
import re
import asyncio
import logging
import hashlib
import time
import sys
from pathlib import Path
from collections import defaultdict

from telegram import Bot
import pytesseract
from PIL import Image

# Extract the updated environment variable
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_UPLOAD_BOT_TOKEN')

if not TELEGRAM_BOT_TOKEN:
    print("CRITICAL ERROR: TELEGRAM_UPLOAD_BOT_TOKEN environment variable is missing.")
    sys.exit(1)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
TOTAL_KEYWORDS = ["gross total value", "gross total", "grand total", "total value", "total"]
CURRENCY_REGEX = re.compile(r"[\d,]+(?:\.\d{1,2})?")
CONSENSUS_THRESHOLD = 3
MARGIN = 0.05

BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "data_pipeline" / "representatives.json"
REGISTRY_FILE = BASE_DIR / "data_pipeline" / "pending_registry.json"


def load_reps():
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_reps(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_registry():
    if REGISTRY_FILE.exists():
        with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "last_run_timestamp": 0.0,
        "user_constituencies": {},
        "submissions": []
    }


def save_registry(registry):
    with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)


def structural_parse(text_data) -> float | None:
    lines = {}
    n_items = len(text_data.get("text", []))

    for i in range(n_items):
        t = text_data["text"][i].strip()
        if not t:
            continue
        key = (text_data["block_num"][i], text_data["par_num"][i], text_data["line_num"][i])
        lines.setdefault(key, []).append(t)

    best_value = None
    for _key, words in lines.items():
        line_text = " ".join(words).lower()
        for kw in TOTAL_KEYWORDS:
            if kw in line_text:
                numbers = CURRENCY_REGEX.findall(" ".join(words))
                for num_str in numbers:
                    clean = num_str.replace(",", "")
                    try:
                        val = float(clean)
                        if val > 0 and (best_value is None or val > best_value):
                            best_value = val
                    except ValueError:
                        pass
                break
    return best_value


async def process_updates():
    token = os.getenv("TELEGRAM_UPLOAD_BOT_TOKEN")
    if not token:
        logger.warning("TELEGRAM_UPLOAD_BOT_TOKEN not set. Skipping ingestion.")
        return

    registry = load_registry()
    # If user_constituencies is missing (older format), initialize it
    if "user_constituencies" not in registry:
        registry["user_constituencies"] = {}
    if "submissions" not in registry:
        registry["submissions"] = []
    if "last_run_timestamp" not in registry:
        registry["last_run_timestamp"] = 0.0

    bot = Bot(token)
    try:
        # We fetch updates. Use offset to avoid fetching already acknowledged updates.
        updates = await bot.get_updates(timeout=10)
    except Exception as e:
        logger.error(f"Failed to fetch updates: {e}")
        return

    if not updates:
        logger.info("No new messages.")
        evaluate_consensus(registry)
        return

    last_run_timestamp = registry["last_run_timestamp"]

    last_update_id = 0

    # Process all updates in chronological order to correctly capture state (/start then photo)
    for update in updates:
        last_update_id = update.update_id
        if not update.message:
            continue

        msg_time = update.message.date.timestamp()
        
        # Extract user_id and compute hash
        user_id = update.message.from_user.id
        user_hash = hashlib.sha256(str(user_id).encode()).hexdigest()

        # Parse text messages for deep links (e.g. /start c_1)
        text = update.message.text or ""
        if text.startswith("/start"):
            parts = text.split()
            if len(parts) > 1 and parts[1].startswith("c_"):
                try:
                    c_id = int(parts[1].split("_")[1])
                    registry["user_constituencies"][user_hash] = c_id
                    logger.info(f"Associated user {user_hash[:8]}... with constituency {c_id}")
                except (ValueError, IndexError):
                    pass

        # Parse image messages
        if update.message.photo:

            # Identify the constituency
            # Priority 1: Stored user constituency from deep link
            # Priority 2: Fallback to caption if it contains c_1 or is just digits
            constituency_id = registry["user_constituencies"].get(user_hash)
            caption = update.message.caption or ""
            if not constituency_id:
                if caption.isdigit():
                    constituency_id = int(caption)
                else:
                    match = re.search(r"c_(\d+)", caption)
                    if match:
                        constituency_id = int(match.group(1))

            if not constituency_id:
                logger.info(f"Ignoring image from {user_hash[:8]}...: No constituency ID found.")
                continue

            photo = update.message.photo[-1]  # highest resolution
            file = await bot.get_file(photo.file_id)

            # Download
            img_path = BASE_DIR / f"temp_{photo.file_id}.jpg"
            try:
                await file.download_to_drive(img_path)
                # OCR
                img = Image.open(img_path)
                data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
                val = structural_parse(data)
                if val:
                    # Append record to registry
                    registry["submissions"].append({
                        "user_hash": user_hash,
                        "constituency_id": constituency_id,
                        "extracted_assets": val,
                        "timestamp": msg_time,
                        "status": "pending"
                    })
                    logger.info(f"Extracted {val} for constituency {constituency_id} from user {user_hash[:8]}...")
            except Exception as e:
                logger.error(f"OCR or Download Failed: {e}")
            finally:
                if img_path.exists():
                    img_path.unlink()

    # Update last run timestamp to now
    registry["last_run_timestamp"] = now

    # Evaluate consensus
    evaluate_consensus(registry)

    # Save registry
    save_registry(registry)

    # Acknowledge updates with Telegram
    if last_update_id > 0:
        try:
            await bot.get_updates(offset=last_update_id + 1, timeout=1)
        except Exception as e:
            logger.error(f"Failed to acknowledge updates: {e}")


def evaluate_consensus(registry):
    # Group pending submissions by constituency_id
    pending_subs = [sub for sub in registry["submissions"] if sub.get("status", "pending") == "pending"]
    if not pending_subs:
        return

    constituency_groups = defaultdict(list)
    for sub in pending_subs:
        constituency_groups[sub["constituency_id"]].append(sub)

    reps_data = load_reps()
    updated = False

    for c_id, subs in constituency_groups.items():
        # Only keep the latest submission per user_hash to prevent double counting
        user_latest = {}
        for sub in subs:
            user_latest[sub["user_hash"]] = sub

        unique_subs = list(user_latest.values())
        if len(unique_subs) < CONSENSUS_THRESHOLD:
            continue

        # Sort by extracted assets
        unique_subs.sort(key=lambda x: x["extracted_assets"])

        # Check for window of size 3 (CONSENSUS_THRESHOLD)
        consensus_found = False
        consensus_val = None
        matched_hashes = set()

        for i in range(len(unique_subs) - CONSENSUS_THRESHOLD + 1):
            subset = unique_subs[i:i + CONSENSUS_THRESHOLD]
            val_min = subset[0]["extracted_assets"]
            val_max = subset[-1]["extracted_assets"]

            if (val_max - val_min) / val_min <= MARGIN:
                consensus_found = True
                consensus_val = sum(s["extracted_assets"] for s in subset) / CONSENSUS_THRESHOLD
                matched_hashes = {s["user_hash"] for s in subset}
                break

        if consensus_found:
            logger.info(f"Consensus reached for constituency {c_id}: {consensus_val} INR")
            # Update representatives.json
            found = False
            val_in_cr = consensus_val / 10000000.0
            
            for r in reps_data:
                if r.get("constituency_id") == c_id:
                    r["declared_assets_current_cr"] = float(round(val_in_cr, 2))
                    r["verified_by_consensus"] = True
                    found = True
                    break

            if not found:
                reps_data.append({
                    "constituency_id": c_id,
                    "rep_name": "Unknown (Auto-Verified)",
                    "declared_assets_current_cr": float(round(val_in_cr, 2)),
                    "declared_assets_previous_cr": 0.0,
                    "pending_criminal_cases": 0,
                    "affidavit_url": "",
                    "verified_by_consensus": True
                })
            
            updated = True

            # Mark matched submissions as verified in registry
            for sub in registry["submissions"]:
                if sub["constituency_id"] == c_id and sub["user_hash"] in matched_hashes and sub.get("status", "pending") == "pending":
                    sub["status"] = "verified"

    if updated:
        save_reps(reps_data)


if __name__ == "__main__":
    asyncio.run(process_updates())
