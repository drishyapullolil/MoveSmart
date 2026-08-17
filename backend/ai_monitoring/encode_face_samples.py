#!/usr/bin/env python3
"""
MoveSmart Biometric Face Samples Encoder Bridge
=================================================
Reads JSON with 20 base64 JPEG samples from stdin, extracts 128-d biometric feature
encodings using FaceProfileManager / face_rec, validates detection thresholds (>= 10),
averages and L2-normalizes, and outputs JSON to stdout.
"""

import sys
import os
import json
import base64
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform == "win32":
    for _stream in (sys.stdout, sys.stderr):
        _reconf = getattr(_stream, "reconfigure", None)
        if callable(_reconf):
            try:
                _reconf(encoding="utf-8")
            except Exception:
                pass

# Add current directory to sys.path to import ai_monitoring_service
_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

import io
_orig_stdout = sys.stdout
sys.stdout = sys.stderr
try:
    from ai_monitoring_service import face_rec, cv2
except ImportError:
    try:
        from backend.ai_monitoring.ai_monitoring_service import face_rec, cv2
    except ImportError:
        face_rec = None
        cv2 = None
finally:
    sys.stdout = _orig_stdout


def decode_base64_image(b64_string: Optional[str]) -> Optional[np.ndarray]:
    """Decodes a base64 JPEG string into an RGB numpy image array."""
    if not b64_string:
        return None
    
    # Strip data URL prefix if present
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    
    try:
        img_bytes = base64.b64decode(b64_string)
        if cv2 is not None:
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    except Exception as e:
        sys.stderr.write(f"[WARN] Failed to decode base64 image: {e}\n")
    return None


def process_samples(samples: Any) -> Tuple[bool, Dict[str, Any], int]:
    """
    Processes an array of base64 images.
    Returns (success, result_dict, status_code).
    """
    if not isinstance(samples, list) or len(samples) != 20:
        return False, {
            "success": False,
            "message": f"Expected exactly 20 sample images, received {len(samples) if isinstance(samples, list) else 0}."
        }, 400

    valid_encodings = []
    failed_count = 0

    for idx, b64_sample in enumerate(samples):
        rgb_img = decode_base64_image(b64_sample)
        if rgb_img is None:
            failed_count += 1
            continue

        if face_rec is None:
            failed_count += 1
            continue

        try:
            locations = face_rec.face_locations(rgb_img)
            if len(locations) == 1:
                encs = face_rec.face_encodings(rgb_img, locations)
                if encs and len(encs) > 0:
                    enc_arr = np.array(encs[0], dtype=np.float64)
                    norm = np.linalg.norm(enc_arr)
                    if norm > 1e-6:
                        enc_arr = enc_arr / norm
                    valid_encodings.append(enc_arr)
                else:
                    failed_count += 1
            else:
                # 0 faces or more than 1 face detected
                failed_count += 1
        except Exception as e:
            sys.stderr.write(f"[WARN] Sample {idx+1} encoding error: {e}\n")
            failed_count += 1

    valid_count = len(valid_encodings)
    sys.stderr.write(f"[INFO] Face detected and encoded in {valid_count}/20 samples.\n")

    # Minimum 10 successful detections required out of 20 samples
    if valid_count < 10:
        return False, {
            "success": False,
            "validCount": valid_count,
            "totalCount": len(samples),
            "message": f"Face not detected in enough samples ({valid_count}/20). Please ensure good lighting, face the camera directly, and ensure only one person is in view."
        }, 422

    # Average all valid encodings
    avg_encoding = np.mean(valid_encodings, axis=0).astype(np.float64)
    avg_norm = np.linalg.norm(avg_encoding)
    if avg_norm > 1e-6:
        avg_encoding = avg_encoding / avg_norm

    return True, {
        "success": True,
        "validCount": valid_count,
        "totalCount": len(samples),
        "encoding": [round(float(v), 8) for v in avg_encoding]
    }, 200


def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"success": False, "message": "Empty payload received on stdin."}))
            sys.exit(1)

        payload = json.loads(raw_input)
        samples = payload.get("samples", [])

        success, result, code = process_samples(samples)
        result["statusCode"] = code
        print(json.dumps(result))
        sys.exit(0 if success else 1)

    except Exception as e:
        sys.stderr.write(f"[FATAL] Error in encode_face_samples.py: {e}\n")
        print(json.dumps({"success": False, "statusCode": 500, "message": f"Server processing error: {str(e)}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
