const { exec } = require('child_process');
const os = require('os');
const config = require('../config');

const gpuCommands = {
  win32: 'powershell -command "Get-CimInstance -ClassName Win32_VideoController | Select-Object -ExpandProperty Name"',
  linux: 'lspci | grep -i vga'
};

const vendorKeywords = { nvidia: 'NVIDIA', amd: 'AMD', radeon: 'AMD', intel: 'INTEL' };

const encoderMap = [
  { vendor: 'NVIDIA', check: 'h264_nvenc', result: { codec: 'h264_nvenc', hwaccel: 'cuda', type: 'NVIDIA GPU' } },
  { vendor: 'AMD',    platform: 'win32', check: 'h264_amf',   result: { codec: 'h264_amf', hwaccel: 'd3d11va', type: 'AMD GPU (Windows)' } },
  { vendor: 'AMD',    platform: 'linux', check: 'h264_vaapi', result: { codec: 'h264_vaapi', hwaccel: 'vaapi',  type: 'AMD GPU (Linux)' } },
  { vendor: 'INTEL',  platform: 'win32', check: 'h264_qsv',   result: { codec: 'h264_qsv', hwaccel: 'qsv',     type: 'Intel GPU (Windows)' } },
  { vendor: 'INTEL',  platform: 'linux', check: 'h264_vaapi', result: { codec: 'h264_vaapi', hwaccel: 'vaapi',  type: 'Intel GPU (Linux)' } }
];

function getGpuVendor() {
  return new Promise((resolve) => {
    const command = gpuCommands[os.platform()];
    if (!command) return resolve(null);

    exec(command, (err, stdout) => {
      if (err) return resolve(null);
      const output = stdout.toLowerCase();
      const found = Object.entries(vendorKeywords).find(([key]) => output.includes(key));
      resolve(found ? found[1] : null);
    });
  });
}

const getFfmpegEncoders = () => new Promise((resolve, reject) =>
  exec('ffmpeg -encoders', (err, stdout) => err ? reject(new Error('ffmpeg -encoders failed')) : resolve(stdout))
);

async function detectGpuAndEncoder() {
  if (!config.useGpu) return { codec: 'libx264', hwaccel: null, type: 'CPU (Software Encode)' };

  const vendor = await getGpuVendor();
  if (!vendor) return { codec: 'libx264', hwaccel: null, type: 'CPU' };

  try {
    const ffmpegEncoders = await getFfmpegEncoders();
    const platform = os.platform();

    const match = encoderMap.find(
      e => e.vendor === vendor &&
      (!e.platform || e.platform === platform) &&
      ffmpegEncoders.includes(e.check)
    );

    if (match) return match.result;

  } catch (err) {
    console.error('[Encoder Detection] Error:', err.message);
  }

  return { codec: 'libx264', hwaccel: null, type: 'CPU' };
}

module.exports = { detectGpuAndEncoder };