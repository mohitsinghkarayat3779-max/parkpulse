from ultralytics import YOLO

# Train YOLOv8n detector on parking signs dataset
if __name__ == '__main__':
    model = YOLO('yolov8n.pt')
    model.train(
        data='data.yaml',
        epochs=60,
        imgsz=640,
        batch=16,
        name='signs'
    )
