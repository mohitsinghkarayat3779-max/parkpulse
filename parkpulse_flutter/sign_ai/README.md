# ParkPulse Sign AI: Detection & Rule Decoding Server

This subsystem provides computer vision and NLP intelligence for ParkPulse. It detects street parking signs, runs Optical Character Recognition (OCR), and parses complex parking restrictions into structured rules and real-time verdicts.

## Architecture

- **Detector (Optional YOLOv8)**: Detects bounding boxes for `no_parking`, `time_limit`, `paid_meter`, `permit_only`, and `other_sign`.
- **OCR Engine (EasyOCR)**: Reads text from detected sign crops (or the fallback whole image).
- **Rule Decoder (`decode.py`)**: Parses schedules, day windows, time spans, exceptions (e.g. `EXCEPT SUN`), and generates plain-English summaries and instantaneous verdicts ("Don’t park here now.", "You can park now, but move within 2 hours.", etc.).

## Training a Custom YOLOv8 Sign Detector

1. **Collect Images**:
   - Collect 300 to 500 clear, varied photos of street parking signs under different lighting, angles, and distances.
2. **Label the Dataset**:
   - Upload images to Roboflow or CVAT.
   - Annotate bounding boxes using the classes defined in `data.yaml`:
     - `0: no_parking`
     - `1: time_limit`
     - `2: paid_meter`
     - `3: permit_only`
     - `4: other_sign`
   - Use an **80/20 train/validation split**.
3. **Train on GPU**:
   - Open a free Google Colab notebook with GPU runtime.
   - Run `python train.py` (trains `yolov8n.pt` for 60 epochs with `imgsz=640`).
   - Aim for an **mAP50 above 0.8**.
4. **Deploy Weights**:
   - Copy `runs/detect/signs/weights/best.pt` next to `server.py` or specify the `SIGN_WEIGHTS` environment variable.

## Running the Server

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Launch the FastAPI server:
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8000
   ```
3. Deploy over HTTPS to Google Cloud Run, Render, or a VPS:
   - For Cloud Run, containerize using Docker (`FROM python:3.11-slim`).
   - Point your mobile app's `kSignApi` to your secure endpoint `https://<YOUR-RUN-URL>`.
