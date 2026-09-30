// Geospatial Dataset for Indian Coal Mines (SIH 26024)
// Provides accurate geographic coordinates, polygonal leasehold boundaries, 
// active excavation pits, overburden dump zones, and live IoT telemetry sensors.

export const MINE_POLYGONS = {
  // 1. Gevra Opencast Project (SECL) - Asia's largest coal mine
  gevra: {
    mineId: 'gevra',
    name: 'Gevra OCP',
    subsidiary: 'SECL',
    state: 'Chhattisgarh',
    center: [22.338, 82.593],
    totalAreaHa: 4184.5,
    annualCapacityMT: 52.5,
    leasehold: [
      [22.362, 82.565],
      [22.368, 82.618],
      [22.342, 82.635],
      [22.315, 82.620],
      [22.310, 82.570],
      [22.335, 82.555]
    ],
    activePit: [
      [22.348, 82.578],
      [22.355, 82.605],
      [22.338, 82.615],
      [22.328, 82.588]
    ],
    obDump: [
      [22.320, 82.565],
      [22.325, 82.585],
      [22.312, 82.595],
      [22.308, 82.575]
    ]
  },

  // 2. Kusmunda Opencast Project (SECL)
  kusmunda: {
    mineId: 'kusmunda',
    name: 'Kusmunda OCP',
    subsidiary: 'SECL',
    state: 'Chhattisgarh',
    center: [22.321, 82.684],
    totalAreaHa: 3450.0,
    annualCapacityMT: 45.0,
    leasehold: [
      [22.345, 82.660],
      [22.348, 82.710],
      [22.312, 82.722],
      [22.298, 82.685],
      [22.305, 82.650]
    ],
    activePit: [
      [22.332, 82.672],
      [22.338, 82.700],
      [22.318, 82.708],
      [22.312, 82.680]
    ],
    obDump: [
      [22.305, 82.660],
      [22.310, 82.678],
      [22.300, 82.682],
      [22.296, 82.665]
    ]
  },

  // 3. Dipka Opencast Project (SECL)
  dipka: {
    mineId: 'dipka',
    name: 'Dipka OCP',
    subsidiary: 'SECL',
    state: 'Chhattisgarh',
    center: [22.316, 82.547],
    totalAreaHa: 2890.2,
    annualCapacityMT: 35.0,
    leasehold: [
      [22.338, 82.525],
      [22.340, 82.570],
      [22.310, 82.580],
      [22.292, 82.555],
      [22.298, 82.520]
    ],
    activePit: [
      [22.325, 82.535],
      [22.330, 82.562],
      [22.312, 82.568],
      [22.305, 82.542]
    ],
    obDump: [
      [22.300, 82.525],
      [22.304, 82.540],
      [22.294, 82.545],
      [22.290, 82.530]
    ]
  },

  // 4. Moonidih Underground Project (BCCL - Jharia Coalfield)
  moonidih: {
    mineId: 'moonidih',
    name: 'Moonidih UG',
    subsidiary: 'BCCL',
    state: 'Jharkhand',
    center: [23.738, 86.353],
    totalAreaHa: 1950.0,
    annualCapacityMT: 5.2,
    leasehold: [
      [23.755, 86.335],
      [23.760, 86.375],
      [23.730, 86.382],
      [23.718, 86.350],
      [23.725, 86.330]
    ],
    activePit: [
      // Longwall extraction panel boundaries underground projection
      [23.745, 86.345],
      [23.750, 86.365],
      [23.735, 86.370],
      [23.730, 86.348]
    ],
    obDump: [
      // Surface shaft complex and pithead baths
      [23.728, 86.338],
      [23.732, 86.348],
      [23.724, 86.352],
      [23.720, 86.342]
    ]
  },

  // 5. Rajmahal Opencast Project (ECL)
  rajmahal: {
    mineId: 'rajmahal',
    name: 'Rajmahal OCP',
    subsidiary: 'ECL',
    state: 'Jharkhand',
    center: [25.048, 87.351],
    totalAreaHa: 3120.0,
    annualCapacityMT: 20.0,
    leasehold: [
      [25.070, 87.330],
      [25.075, 87.380],
      [25.040, 87.390],
      [25.025, 87.360],
      [25.032, 87.325]
    ],
    activePit: [
      [25.058, 87.342],
      [25.064, 87.370],
      [25.045, 87.375],
      [25.038, 87.348]
    ],
    obDump: [
      [25.032, 87.332],
      [25.038, 87.348],
      [25.028, 87.352],
      [25.022, 87.338]
    ]
  },

  // 6. Lakhanpur Opencast Project (MCL)
  lakhanpur: {
    mineId: 'lakhanpur',
    name: 'Lakhanpur OCP',
    subsidiary: 'MCL',
    state: 'Odisha',
    center: [21.761, 83.826],
    totalAreaHa: 2780.0,
    annualCapacityMT: 21.0,
    leasehold: [
      [21.785, 83.805],
      [21.790, 83.850],
      [21.755, 83.860],
      [21.740, 83.830],
      [21.748, 83.800]
    ],
    activePit: [
      [21.772, 83.818],
      [21.778, 83.842],
      [21.758, 83.848],
      [21.752, 83.822]
    ],
    obDump: [
      [21.748, 83.808],
      [21.754, 83.822],
      [21.744, 83.828],
      [21.738, 83.814]
    ]
  }
};

// Real-Time IoT Sensors Array (SIH26024 Telemetry)
export const IOT_SENSORS = [
  // Gevra OCP Sensors
  {
    id: 'SENS-GEV-01',
    mineId: 'gevra',
    mineName: 'Gevra OCP',
    type: 'methane',
    name: 'Main Sump Methane Sniffer',
    coords: [22.345, 82.590],
    value: '0.22%',
    unit: 'CH4 Vol',
    status: 'safe',
    threshold: '< 0.50%',
    battery: '94%',
    lastPing: '2 mins ago',
    description: 'Continuous optical NDIR methane gas detector near coal seam bench 4.'
  },
  {
    id: 'SENS-GEV-02',
    mineId: 'gevra',
    mineName: 'Gevra OCP',
    type: 'dust',
    name: 'In-Pit CAAQMS Dust Station',
    coords: [22.352, 82.601],
    value: '142 µg/m³',
    unit: 'PM10',
    status: 'warning',
    threshold: '< 100 µg/m³',
    battery: '100% (Solar)',
    lastPing: '1 min ago',
    description: 'Continuous Ambient Air Quality station. Water mist canons activated.'
  },
  {
    id: 'SENS-GEV-03',
    mineId: 'gevra',
    mineName: 'Gevra OCP',
    type: 'weighbridge',
    name: 'Silo 2 RFID Dispatch Gate',
    coords: [22.325, 82.610],
    value: '14,820 Tonnes',
    unit: 'Today Dispatched',
    status: 'safe',
    threshold: '18,000 T Target',
    battery: 'Mains Powered',
    lastPing: 'Live (ANPR)',
    description: 'Automated gross weight laser scanner & overload prevention barrier.'
  },

  // Moonidih Underground Sensors (Critical Methane Zone)
  {
    id: 'SENS-MOON-01',
    mineId: 'moonidih',
    mineName: 'Moonidih UG',
    type: 'methane',
    name: 'Longwall Panel 3 Return Airway',
    coords: [23.742, 86.355],
    value: '1.18%',
    unit: 'CH4 Vol',
    status: 'critical',
    threshold: '< 0.80% (CMR 133)',
    battery: 'FLPO Mains',
    lastPing: '30s ago',
    description: 'Flameproof infrared firedamp monitor. Auxiliary ventilation fan boost active!'
  },
  {
    id: 'SENS-MOON-02',
    mineId: 'moonidih',
    mineName: 'Moonidih UG',
    type: 'water',
    name: 'Deep Mine Sump Effluent Sensor',
    coords: [23.731, 86.360],
    value: 'pH 7.1',
    unit: 'Acid Mine Drainage',
    status: 'safe',
    threshold: 'pH 6.5 - 8.5',
    battery: '88%',
    lastPing: '5 mins ago',
    description: 'Electrochemical pH & Total Dissolved Solids probe monitoring dewatering.'
  },

  // Kusmunda OCP Sensors
  {
    id: 'SENS-KUS-01',
    mineId: 'kusmunda',
    mineName: 'Kusmunda OCP',
    type: 'dust',
    name: 'Haul Road Dust Monitor B',
    coords: [22.328, 82.688],
    value: '88 µg/m³',
    unit: 'PM10',
    status: 'safe',
    threshold: '< 100 µg/m³',
    battery: '96%',
    lastPing: '3 mins ago',
    description: 'Laser nephelometer monitoring dust suppression from automated sprinklers.'
  },
  {
    id: 'SENS-KUS-02',
    mineId: 'kusmunda',
    mineName: 'Kusmunda OCP',
    type: 'weighbridge',
    name: 'East Wharf Rail Siding Gate',
    coords: [22.310, 82.705],
    value: '9,450 Tonnes',
    unit: 'Today Dispatched',
    status: 'safe',
    threshold: '12,000 T Target',
    battery: 'Mains Powered',
    lastPing: 'Live (ANPR)',
    description: 'Box-N coal rake automated loading and dispatch weight logger.'
  },

  // Dipka OCP Sensors
  {
    id: 'SENS-DIP-01',
    mineId: 'dipka',
    mineName: 'Dipka OCP',
    type: 'methane',
    name: 'Bottom Seam Extraction Telemetry',
    coords: [22.320, 82.552],
    value: '0.15%',
    unit: 'CH4 Vol',
    status: 'safe',
    threshold: '< 0.50%',
    battery: '91%',
    lastPing: '4 mins ago',
    description: 'Opencast deep bench floor gas probe.'
  },

  // Rajmahal OCP Sensors
  {
    id: 'SENS-RAJ-01',
    mineId: 'rajmahal',
    mineName: 'Rajmahal OCP',
    type: 'dust',
    name: 'NTPC Farakka Conveyor Dust Sensor',
    coords: [22.052, 87.355],
    value: '108 µg/m³',
    unit: 'PM10',
    status: 'warning',
    threshold: '< 100 µg/m³',
    battery: '98%',
    lastPing: '2 mins ago',
    description: 'Overland belt conveyor transfer point dust monitor.'
  },

  // Lakhanpur OCP Sensors
  {
    id: 'SENS-LAK-01',
    mineId: 'lakhanpur',
    mineName: 'Lakhanpur OCP',
    type: 'water',
    name: 'Ib River Discharge Monitor',
    coords: [21.758, 83.835],
    value: 'pH 6.8',
    unit: 'Effluent Quality',
    status: 'safe',
    threshold: 'pH 6.5 - 8.5',
    battery: '95%',
    lastPing: '5 mins ago',
    description: 'Settling pond effluent discharge telemetry meeting CPCB effluent standards.'
  }
];

// Base Map Tile Providers (Free, Zero API Key)
export const TILE_LAYERS = {
  satellite: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  },
  street: {
    name: 'Topographic Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  dark: {
    name: 'Night Canvas (High Contrast)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  }
};
