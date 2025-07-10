# ✨ Videra Video Compressor

Videra is a modern and powerful video compression tool made for speed privacy and ease of use
It works great for both casual users and professionals giving smooth results with a simple experience

---

## 🔍 Preview

<img src="https://files.catbox.moe/0f3iy9.gif" alt="App Preview" width="600">

---

## ✨ Features

* 🎯 **Target File Size**
Choose how small you want your video and Videra will keep the quality while reducing the size

* 🚀 **Faster with GPU Support**
Speeds up the process using your graphics card when available but still works well without it

* 💻 **Simple Clean Modern Interface**
Easy to use with a dark theme that looks great on computers tablets and phones

* 📊 **Live Progress Tracking**
Shows you the compression progress in real time so you always know what’s going on

* 🐳 **Runs Anywhere Without Setup**
Videra is ready to use in different environments with no extra steps or configurations

* 🧹 **Automatic Cleanup for Privacy and Space**
Your videos are deleted after one hour and unused files are removed when the app starts

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
