export const sensors = [
  {
    label: 'pH Value',
    value: '7.12',
    sub: 'Neutral Range • Optimal',
    icon: 'water_drop',
    tone: 'green' as const,
    badge: 'Online',
  },
  {
    label: 'EC (Cond.)',
    value: '2.35',
    sub: 'mS/cm • Within Limit',
    icon: 'electric_bolt',
    tone: 'green' as const,
    badge: 'Normal',
  },
  {
    label: 'Turbidity',
    value: '14.8',
    sub: 'NTU • Rising Trend',
    icon: 'opacity',
    tone: 'orange' as const,
    badge: 'Attention',
  },
  {
    label: 'Temperature',
    value: '29.6',
    sub: '°C • Heat Exchanger On',
    icon: 'thermostat',
    tone: 'green' as const,
    badge: 'Stable',
  },
  {
    label: 'Flow Rate',
    value: '28.6',
    sub: 'm³/hr • Target: 30.0',
    icon: 'speed',
    tone: 'green' as const,
    badge: 'Online',
  },
]

export const telemetry = {
  xLabels: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
  series: [
    {
      name: 'pH',
      color: '#004ac6',
      area: true,
      data: [7.05, 7.16, 7.02, 7.12, 7.08, 7.2, 7.14],
    },
    {
      name: 'EC',
      color: '#712ae2',
      dashed: true,
      data: [2.45, 2.3, 2.5, 2.35, 2.42, 2.28, 2.31],
    },
    {
      name: 'Flow',
      color: '#f59e0b',
      dashed: true,
      data: [27.5, 28.1, 29.2, 28.6, 29.8, 28.9, 28.6],
    },
  ],
}

export const tanks = [
  { label: 'Equalization Tank', pct: 85, color: '#2563eb' },
  { label: 'Primary Tank', pct: 60, color: '#2563eb' },
  { label: 'Secondary Tank', pct: 45, color: '#f59e0b' },
  { label: 'Reuse Tank', pct: 92, color: '#10b981' },
]

export const gateway = {
  uptime: '42D 12H',
  model: 'ESP32-S3 WROOM',
  wifi: '-64 dBm (Excellent)',
  mqtt: 'Connected (TLS)',
  firmware: 'v2.4.1-stable',
}

export const iotAlerts = [
  {
    tone: 'red' as const,
    time: '14:22:15',
    title: 'High pH Detected',
    desc: 'Level exceeded 8.5 threshold at Secondary Tank Inlet.',
  },
  {
    tone: 'orange' as const,
    time: '12:05:40',
    title: 'Sensor Failure',
    desc: 'Turbidity sensor reading null/out of bounds. Check probe.',
  },
  {
    tone: 'orange' as const,
    time: '10:45:01',
    title: 'Communication Failure',
    desc: 'Gateway lost MQTT heartbeat for 120ms. Restored.',
  },
  {
    tone: 'blue' as const,
    time: '08:00:00',
    title: 'System Calibration',
    desc: 'Daily auto-calibration cycle completed successfully.',
  },
]
