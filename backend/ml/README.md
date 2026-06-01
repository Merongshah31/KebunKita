# KebunKita ML Assets

This folder is for local AI/YOLOv8 development assets.

Recommended local path for trained YOLOv8 weights:

```text
backend/ml/models/plant.pt
```

Do not commit real model weights or raw training datasets to GitHub. They can be large and should be stored in Supabase Storage, cloud object storage, or the dedicated AI inference service.

The current backend calls YOLOv8 through `YOLOV8_ENDPOINT`. For production, deploy a separate YOLO inference service that loads `plant.pt`, then set the backend `YOLOV8_ENDPOINT` to that service URL.

