import os
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from PIL import Image
import numpy as np
import easyocr
from decode import decode

app = FastAPI(title="ParkPulse Sign AI Server", version="1.0.0")

# Initialize EasyOCR English reader once at startup
reader = easyocr.Reader(['en'], gpu=False)

# Optional YOLOv8 detector
model = None
weights_path = os.getenv("SIGN_WEIGHTS", "runs/detect/signs/weights/best.pt")

try:
    if os.path.exists(weights_path):
        from ultralytics import YOLO
        model = YOLO(weights_path)
        print(f"[SignAI] Loaded custom sign weights from {weights_path}")
    else:
        print(f"[SignAI] Weights not found at {weights_path}, using whole-image fallback.")
except Exception as e:
    print(f"[SignAI] Could not initialize YOLO: {e}")
    model = None


@app.post("/detect")
async def detect_sign(file: UploadFile = File(...)):
    """
    Receives an image file, detects parking signs with YOLO (if weights present),
    runs EasyOCR on detected sign crops (or the whole image fallback),
    and decodes the plain-English parking rules and active verdict.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    contents = await file.read()
    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    w, h = pil_image.size
    crops = []
    used_detector = False

    if model is not None:
        try:
            results = model.predict(pil_image, conf=0.35)
            if results and len(results) > 0 and len(results[0].boxes) > 0:
                used_detector = True
                for box in results[0].boxes:
                    cls_id = int(box.cls[0])
                    cls_name = results[0].names.get(cls_id, f"class_{cls_id}")
                    confidence = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()
                    x1, y1, x2, y2 = max(0, int(xyxy[0])), max(0, int(xyxy[1])), min(w, int(xyxy[2])), min(h, int(xyxy[3]))
                    crop_img = pil_image.crop((x1, y1, x2, y2))
                    crops.append({
                        "image": crop_img,
                        "class": cls_name,
                        "confidence": round(confidence, 3),
                    })
        except Exception as e:
            print(f"[SignAI] Model prediction error: {e}")

    # Fallback to whole image if no detector or no boxes found
    if not crops:
        crops.append({
            "image": pil_image,
            "class": "whole_image",
            "confidence": 1.0,
        })

    signs_result = []
    for item in crops:
        np_img = np.array(item["image"])
        ocr_results = reader.readtext(np_img, detail=0)
        raw_text = " ".join(ocr_results).strip()
        rule = decode(raw_text)

        signs_result.append({
            "class": item["class"],
            "confidence": item["confidence"],
            "text": raw_text,
            "rule": rule,
        })

    return {
        "signs": signs_result,
        "used_detector": used_detector,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
