"""
Telegram Bot Data Ingestion Pipeline for Robin Hood Architecture.

This script polls for updates from a specific Telegram bot token.
For any images sent to the bot, it runs pytesseract to extract the Gross Total Value.
If multiple different users submit the same value (within 5% margin) for a given constituency,
it appends the verified data to `representatives.json`.

Expects TELEGRAM_UPLOAD_BOT_TOKEN environment variable.
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


def levenshtein_distance(s1, s2):
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def string_similarity(s1, s2):
    if len(s1) == 0 and len(s2) == 0: return 1.0
    dist = levenshtein_distance(s1, s2)
    max_len = max(len(s1), len(s2))
    return 1 - (dist / max_len)

def fuzzy_match(line_text, kw, threshold=0.82):
    window_size = len(kw)
    if len(line_text) < window_size:
        return string_similarity(line_text, kw) >= threshold
    for i in range(len(line_text) - window_size + 1):
        substring = line_text[i:i+window_size]
        if string_similarity(substring, kw) >= threshold:
            return True
    return False


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
        
        match_found = False
        for kw in TOTAL_KEYWORDS:
            if fuzzy_match(line_text, kw):
                match_found = True
                break
                
        if match_found:
            numbers = CURRENCY_REGEX.findall(" ".join(words))
            for num_str in numbers:
                clean = num_str.replace(",", "")
                try:
                    val = float(clean)
                    if val > 0 and (best_value is None or val > best_value):
                        best_value = val
                except ValueError:
                    pass
    return best_value


async def process_updates():
    token = os.getenv("TELEGRAM_UPLOAD_BOT_TOKEN")
    if not token:
        logger.warning("TELEGRAM_UPLOAD_BOT_TOKEN not set. Skipping ingestion.")
        return

    registry = load_registry()
    if "user_constituencies" not in registry:
        registry["user_constituencies"] = {}
    if "submissions" not in registry:
        registry["submissions"] = []
    if "last_run_timestamp" not in registry:
        registry["last_run_timestamp"] = 0.0

    bot = Bot(token)
    try:
        updates = await bot.get_updates(timeout=10)
    except Exception as e:
        logger.error(f"Failed to fetch updates: {e}")
        return

    if not updates:
        logger.info("No new messages.")
        evaluate_consensus(registry)
        return

    last_update_id = 0

    for update in updates:
        last_update_id = update.update_id
        if not update.message:
            continue

        msg_time = update.message.date.timestamp()
        
        user_id = update.message.from_user.id
        salt = os.getenv("SALT_KEY", "")
        user_hash = hashlib.sha256((str(user_id) + salt).encode()).hexdigest()
        admin_hash = os.getenv("ADMIN_HASH", "")

        text = update.message.text or ""
        
        # Admin Approval Logic
        if text.startswith("/approve"):
            if user_hash != admin_hash:
                logger.warning(f"SECURITY ALERT: Unauthorized /approve from {user_hash}")
                continue
            parts = text.split()
            if len(parts) >= 3:
                try:
                    c_id = int(parts[1])
                    val = float(parts[2])
                    
                    reps_data = load_reps()
                    found = False
                    val_in_cr = val / 10000000.0
                    for r in reps_data:
                        if r.get("constituency_id") == c_id:
                            r["declared_assets_current_cr"] = float(round(val_in_cr, 2))
                            r["verified_by_admin"] = True
                            found = True
                            break
                            
                    if not found:
                        reps_data.append({
                            "constituency_id": c_id,
                            "rep_name": "Unknown (Admin-Verified)",
                            "declared_assets_current_cr": float(round(val_in_cr, 2)),
                            "declared_assets_previous_cr": 0.0,
                            "pending_criminal_cases": 0,
                            "affidavit_url": "",
                            "verified_by_admin": True
                        })
                    save_reps(reps_data)
                    
                    for sub in registry["submissions"]:
                        if sub["constituency_id"] == c_id and sub.get("status") == "pending":
                            sub["status"] = "approved"
                    logger.info(f"ADMIN COMMAND: Approved {val} for constituency {c_id}")
                except Exception as e:
                    logger.error(f"Failed admin command: {e}")
            continue

        if text.startswith("/start"):
            parts = text.split()
            if len(parts) > 1 and parts[1].startswith("c_"):
                try:
                    c_id = int(parts[1].split("_")[1])
                    registry["user_constituencies"][user_hash] = c_id
                    logger.info(f"Associated user {user_hash[:8]}... with constituency {c_id}")
                except (ValueError, IndexError):
                    pass

        if update.message.photo:
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

            photo = update.message.photo[-1]
            file = await bot.get_file(photo.file_id)

            img_path = BASE_DIR / f"temp_{photo.file_id}.jpg"
            try:
                await file.download_to_drive(img_path)
                img = Image.open(img_path)
                data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
                val = structural_parse(data)
                if val:
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

    registry["last_run_timestamp"] = time.time()

    evaluate_consensus(registry)
    save_registry(registry)

    if last_update_id > 0:
        try:
            await bot.get_updates(offset=last_update_id + 1, timeout=1)
        except Exception as e:
            logger.error(f"Failed to acknowledge updates: {e}")


def evaluate_consensus(registry):
    pending_subs = [sub for sub in registry["submissions"] if sub.get("status", "pending") == "pending"]
    if not pending_subs:
        return

    constituency_groups = defaultdict(list)
    for sub in pending_subs:
        constituency_groups[sub["constituency_id"]].append(sub)

    reps_data = load_reps()
    updated = False

    for c_id, subs in constituency_groups.items():
        user_latest = {}
        for sub in subs:
            user_latest[sub["user_hash"]] = sub

        unique_subs = list(user_latest.values())
        if len(unique_subs) < CONSENSUS_THRESHOLD:
            continue

        unique_subs.sort(key=lambda x: x["extracted_assets"])

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

            for sub in registry["submissions"]:
                if sub["constituency_id"] == c_id and sub["user_hash"] in matched_hashes and sub.get("status", "pending") == "pending":
                    sub["status"] = "verified"

    if updated:
        save_reps(reps_data)


if __name__ == "__main__":
    asyncio.run(process_updates())
