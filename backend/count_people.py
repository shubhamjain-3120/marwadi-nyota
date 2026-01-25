#!/usr/bin/env python3
"""
Count people in an image using YOLOv8.
Usage: python count_people.py <base64_image_path>
Output: JSON with person count
"""
import sys
import json
import base64
import tempfile
import os

def count_people(image_path):
    from ultralytics import YOLO

    # Load YOLOv8 model (downloads automatically on first use)
    model = YOLO('yolov8n.pt')  # nano model, fast and good enough

    # Run detection
    results = model(image_path, verbose=False)

    # Count persons (class 0 in COCO dataset)
    person_count = 0
    for result in results:
        for box in result.boxes:
            if int(box.cls[0]) == 0:  # class 0 = person
                conf = float(box.conf[0])
                if conf > 0.5:  # confidence threshold
                    person_count += 1

    return person_count

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided", "count": 0}))
        sys.exit(1)

    input_path = sys.argv[1]

    try:
        # Check if input is a file with base64 content or direct image
        if input_path.endswith('.b64'):
            # Read base64 content and decode
            with open(input_path, 'r') as f:
                b64_data = f.read()

            # Write to temp image file
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                tmp.write(base64.b64decode(b64_data))
                image_path = tmp.name

            count = count_people(image_path)
            os.unlink(image_path)  # cleanup
        else:
            # Direct image file
            count = count_people(input_path)

        print(json.dumps({"count": count, "error": None}))

    except Exception as e:
        print(json.dumps({"error": str(e), "count": 0}))
        sys.exit(1)

if __name__ == "__main__":
    main()
