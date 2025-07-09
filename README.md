# ✨ Videra Video Compressor

An ultra-modern, professional-grade video compression tool, built for performance, security, and scalability

---

## 🔍 Preview

<img src="https://files.catbox.moe/0f3iy9.gif" alt="App Preview" width="600">

---

## ✨ Features

* 🎯 **Smart Target Compression**: Achieve your desired file size without compromising quality. Videra uses two-pass FFmpeg encoding to intelligently calculate the optimal bitrate, delivering excellent results with minimal file size
  
* 🚀 **GPU Acceleration**: Enjoy lightning-fast performance with support for NVIDIA (NVENC), AMD (AMF/VA-API), and Intel (QSV/VA-API) hardware encoders. Videra automatically falls back to CPU if no GPU is available, ensuring universal compatibility
  
* 💻 **Modern UI**: A sleek, single-purpose interface built with HTML5, CSS3, and vanilla JavaScript. Videra emphasizes usability and clarity with a dark theme and responsive layout that works across devices
  
* 📊 **Live Progress Feedback**: Users can track compression in real time, thanks to direct integration with FFmpeg's logging output during both Pass 1 (analysis) and Pass 2 (compression)
  
* 🐳 **Docker Optimized**: Built for portability and security, Videra is deployed using a multi-stage Dockerfile that produces a lean production image, running as a non-root user by default
  
* 🧹 **Auto Cleanup**: To protect user privacy and save disk space, all compressed files are automatically deleted after 1 hour. In addition, orphaned files in uploads, compressed, and logs directories are cleaned at every server startup

---

## 🚀 Installation and Usage Guide

Follow these steps to download and run the project on your machine

### 🔧 Prerequisites

* Docker & Docker Compose
* Node.js *(Optional for development)*
* FFmpeg *(Only required for local runs without Docker)*

### ▶️ Run with Docker (Recommended)

```yaml
services:
  videra:
    image: ghcr.io/raw-network/videra:latest
    container_name: videra
    ports:
      - 3000:3000
    devices:
      - /dev/dri
    volumes:
      - ./compressed:/compressed
      - ./uploads:/uploads
      - ./logs:/logs
    environment:
      - MAX_VIDEO_UPLOAD_SIZE=1024M
      - FORCE_CPU_ENCODER=false
      - TZ=UTC
    restart: unless-stopped
```

2. Run the application:

```bash
docker compose up -d
```

3. Access the application at:

```
http://localhost:3000
```

4. To stop the application:

```bash
docker compose down
```

---

## 💡 Hardware Acceleration (VA-API)

To enable GPU acceleration, you must pass your host machine's DRI devices to the container

> ⚠️ Ensure the Docker user has permission to access `/dev/dri` (typically by being in the `render` or `video` group)

---

## ⚙️ Configuration

Customize the application using environment variables in `docker-compose.yml`

| Variable                | Description                              | Default |
| ----------------------- | ---------------------------------------- | ------- |
| `MAX_VIDEO_UPLOAD_SIZE` | Maximum allowed size for uploads         | 1024M   |
| `FORCE_CPU_ENCODER`     | Set to `true` to force software encoding | false   |
| `TZ`                    | Sets the container's timezone            | UTC     |

Example:

```yaml
environment:
  - MAX_VIDEO_UPLOAD_SIZE=1G
  - FORCE_CPU_ENCODER=true
  - TZ=Asia/Makassar
```

---

## 💻 Option 2: Run Locally with Node.js (Development)

1. Make sure FFmpeg is installed and available globally:

```bash
ffmpeg -version
```

2. Clone the repository:

```bash
git clone https://github.com/raw-network/videra.git
cd videra
```

3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm run dev
```

5. Open your browser at:
   [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Tech Stack

* **Backend**: Node.js, Express.js
* **Frontend**: HTML5, CSS3, Vanilla JavaScript
* **Video Processing**: FFmpeg (VA-API supported)
* **Real-time UI**: Server-Sent Events (SSE)
* **Containerization**: Docker, Docker Compose
* **File Handling**: Multer

---

## 📂 Project Structure

```
/
├── public/                       # Frontend assets (HTML, CSS, JS)
├── src/                          # Backend source code
│   ├── app.js                    # Express application setup and middleware
│   ├── index.js                  # Server entry point
│   ├── config/
│   │   └── index.js              # Centralized configuration
│   ├── controllers/
│   │   └── upload.controller.js  # Handles request/response logic
│   ├── middleware/
│   │   └── upload.middleware.js  # Multer file upload middleware
│   ├── routes/
│   │   └── upload.routes.js      # API route definitions
│   ├── services/
│   │   └── ffmpeg.service.js     # Core business logic for FFmpeg
│   └── utils/
│       ├── cleanup.util.js       # File cleanup logic
│       └── gpu.util.js           # GPU detection logic
├── .gitignore
├── .dockerignore
├── docker-compose.yaml
├── Dockerfile
├── entrypoint.sh
├── package-lock.json
├── package.json
├── LICENSE
└── README.md
```

## 📄 License

This project is licensed under the **MIT License**.
See the [LICENSE](./LICENSE) file for details.
