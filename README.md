# ✨ Videra Video Compressor

Videra is a modern and powerful video compression tool made for speed privacy and ease of use
It works great for both casual users and professionals giving smooth results with a simple experience

---

## 🔍 Preview

<img src="https://files.catbox.moe/15eq8w.gif" alt="App Preview" width="600">

---

## ✨ Features

* 🎯 Choose how small you want your video and Videra will keep the quality while reducing the size
* 🚀 Speeds up the process using your graphics card when available but still works well without it
* 💻 Easy to use with simple ui that looks great on computers tablets and phones
* 📊 Shows you the compression progress in real time so you always know what’s going on
* 🐳 Videra is ready to use in different environments with no extra steps or configurations
* 🧹 Your videos are deleted after one hour and unused files are removed when the app starts

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
      - /dev/dri:/dev/dri
    volumes:
      - ./compressed:/compressed
      - ./uploads:/uploads
      - ./logs:/logs
    environment:
      - MAX_VIDEO_UPLOAD_SIZE=1G
      - GPU=true
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

| Variable                | Description                              | Default  |
| ----------------------- | ---------------------------------------- | -------  |
| `MAX_VIDEO_UPLOAD_SIZE` | Maximum allowed size for uploads         | No Limit |
| `GPU`                   | Set to `true` to use GPU for proccesing  | false    |
| `TZ`                    | Sets the container's timezone            | UTC      |


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

## 📄 License

This project is licensed under the **MIT License**.
See the [LICENSE](./LICENSE) file for details.