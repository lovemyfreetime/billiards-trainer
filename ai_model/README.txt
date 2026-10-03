Billiards Trainer 4.12 AI model files

This folder holds the trained local pool-ball detector and identity classifier used by the GitHub/PWA build.

Required runtime files:
- pool_ball_detector.part1.bin
- pool_ball_detector.part2.bin
- pool_ball_classifier.onnx

The detector is split into two files so each part can be uploaded through GitHub's browser uploader. The app rejoins both parts in memory before starting ONNX Runtime Web.
