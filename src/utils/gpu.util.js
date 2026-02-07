const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('../config');

const CPU_PROFILE = { codec: 'libx264', hwaccel: null, type: 'CPU (Software Encode)' };

const SYSTEM_COMMANDS = {
  win32: 'powershell -command "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name"',
  linux: 'lspci | grep -i vga'
};

const VENDOR_MAP = {
  nvidia: 'NVIDIA',
  amd: 'AMD',
  radeon: 'AMD',
  intel: 'INTEL'
};

const PROFILES = [
  { vendor: 'NVIDIA', check: 'h264_nvenc', result: { codec: 'h264_nvenc', hwaccel: 'cuda', type: 'NVIDIA GPU' } },
  { vendor: 'AMD', platform: 'win32', check: 'h264_amf', result: { codec: 'h264_amf', hwaccel: 'd3d11va', type: 'AMD GPU (Windows)' } },
  { vendor: 'AMD', platform: 'linux', check: 'h264_vaapi', result: { codec: 'h264_vaapi', hwaccel: 'vaapi', type: 'AMD GPU (Linux)' } },
  { vendor: 'INTEL', platform: 'win32', check: 'h264_qsv', result: { codec: 'h264_qsv', hwaccel: 'qsv', type: 'Intel GPU (Windows)' } },
  { vendor: 'INTEL', platform: 'linux', check: 'h264_vaapi', result: { codec: 'h264_vaapi', hwaccel: 'vaapi', type: 'Intel GPU (Linux)' } },
  { vendor: 'GENERIC', platform: 'linux', check: 'h264_vaapi', result: { codec: 'h264_vaapi', hwaccel: 'vaapi', type: 'VAAPI Device' } }
];

const execAsync = (cmd) => new Promise((resolve) => {
  if (!cmd) return resolve(null);
  exec(cmd, (err, stdout) => resolve(err || !stdout ? null : stdout.toLowerCase()));
});

const hasAccess = (p) => {
  try {
    fs.accessSync(p, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const getEncoders = async () => {
  const out = await execAsync('ffmpeg -encoders');
  return out || '';
};

const getVendor = async () => {
  const out = await execAsync(SYSTEM_COMMANDS[os.platform()]);
  if (!out) return null;
  const key = Object.keys(VENDOR_MAP).find((k) => out.includes(k));
  return key ? VENDOR_MAP[key] : null;
};

const getSortedRenderDevices = () => {
  const base = '/dev/dri';
  if (!fs.existsSync(base)) return [];
  
  try {
    return fs.readdirSync(base)
      .filter((f) => f.startsWith('renderD'))
      .map((f) => ({
        path: path.join(base, f),
        index: parseInt(f.replace('renderD', ''), 10)
      }))
      .sort((a, b) => b.index - a.index)
      .map(item => item.path)
      .filter(hasAccess);
  } catch {
    return [];
  }
};

async function detectGpuAndEncoder() {
  if (!config.useGpu) return CPU_PROFILE;

  const platform = os.platform();

  try {
    const encoders = await getEncoders();

    if (platform === 'linux') {
      for (let i = 0; i < 4; i++) {
        const nvPath = `/dev/nvidia${i}`;
        if (hasAccess(nvPath) && encoders.includes('h264_nvenc')) {
          const profile = PROFILES.find(p => p.vendor === 'NVIDIA').result;
          return { ...profile, type: `NVIDIA GPU (${nvPath})` };
        }
      }

      const renderDevices = getSortedRenderDevices();
      for (const devPath of renderDevices) {
         if (encoders.includes('h264_vaapi')) {
             const profile = PROFILES.find(p => p.vendor === 'GENERIC').result;
             return { ...profile, type: `${profile.type} (${devPath})` };
         }
      }
    }

    const vendor = await getVendor();
    if (vendor) {
      const match = PROFILES.find(
        (p) =>
          p.vendor === vendor &&
          (!p.platform || p.platform === platform) &&
          encoders.includes(p.check)
      );
      if (match) return match.result;
    }

  } catch (err) {
    console.error('[GPU Detect] Error:', err.message);
  }

  return CPU_PROFILE;
}

module.exports = { detectGpuAndEncoder };