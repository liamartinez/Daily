export const APP_CONFIG = {
  title: "Find My",

  map: {
    center: [-122.4194, 37.7749], // San Francisco
    zoom: 13,
    style: "https://tiles.openfreemap.org/styles/positron",
  },

  // Categories become tabs. Add/remove to change what's tracked.
  categories: [
    {
      id: "ducks",
      label: "Ducks",
      icon: "🦆",
      color: "#FF9500",
    },
    {
      id: "trucks",
      label: "Trucks",
      icon: "🚧",
      color: "#34C759",
    },
    {
      id: "friends",
      label: "Friends",
      icon: "👤",
      color: "#007AFF",
    },
  ],

  me: {
    name: "Liam",
    initials: "LM",
    color: "#5856D6",
    position: [-122.4194, 37.7749],
  },

  // Simulation bounds — entities stay within this box
  bounds: {
    north: 37.81,
    south: 37.74,
    east: -122.38,
    west: -122.52,
  },
};

export const ENTITIES = [
  // Ducks — a few blocks from "Me" (Civic Center area)
  {
    id: "duck-1",
    category: "ducks",
    name: "Mallard Steve",
    subtitle: "Civic Center Plaza",
    initials: "MS",
    icon: "🦆",
    color: "#FF9500",
    position: [-122.4182, 37.7786],
    movement: { pattern: "random-walk", speed: 0.00003 },
  },
  {
    id: "duck-2",
    category: "ducks",
    name: "Pekin Donna",
    subtitle: "UN Plaza Fountain",
    initials: "PD",
    icon: "🦆",
    color: "#FF9F0A",
    position: [-122.4170, 37.7798],
    movement: { pattern: "circular", speed: 0.00002, radius: 0.0005 },
  },
  {
    id: "duck-3",
    category: "ducks",
    name: "Rubber Duck #7",
    subtitle: "Hayes Valley",
    initials: "R7",
    icon: "🛁",
    color: "#FFCC00",
    position: [-122.4230, 37.7760],
    movement: { pattern: "random-walk", speed: 0.00002 },
  },
  {
    id: "duck-4",
    category: "ducks",
    name: "Wood Duck Larry",
    subtitle: "Tenderloin Sidewalk",
    initials: "WL",
    icon: "🦆",
    color: "#FF6723",
    position: [-122.4145, 37.7825],
    movement: { pattern: "random-walk", speed: 0.00004 },
  },

  // Trucks — construction vehicles, 10-15 min walk (~0.8-1.2 km) from "Me"
  {
    id: "truck-1",
    category: "trucks",
    name: "Bulldozer #12",
    subtitle: "Van Ness Construction",
    initials: "BD",
    icon: "🚜",
    color: "#34C759",
    position: [-122.4222, 37.7850],
    movement: { pattern: "linear", speed: 0.00004, heading: 90 },
  },
  {
    id: "truck-2",
    category: "trucks",
    name: "Cement Mixer",
    subtitle: "SoMa Site",
    initials: "CM",
    icon: "🏗️",
    color: "#30D158",
    position: [-122.4050, 37.7780],
    movement: { pattern: "linear", speed: 0.00003, heading: 270 },
  },
  {
    id: "truck-3",
    category: "trucks",
    name: "Dump Truck",
    subtitle: "Market St Project",
    initials: "DT",
    icon: "🚧",
    color: "#63E6BE",
    position: [-122.4120, 37.7710],
    movement: { pattern: "waypoints", speed: 0.00005, waypoints: [
      [-122.4120, 37.7710],
      [-122.4170, 37.7720],
      [-122.4140, 37.7740],
      [-122.4120, 37.7710],
    ]},
  },
  {
    id: "truck-4",
    category: "trucks",
    name: "Crane Unit 5",
    subtitle: "Mid-Market",
    initials: "C5",
    icon: "🏗️",
    color: "#34C759",
    position: [-122.4100, 37.7790],
    movement: { pattern: "stationary" },
  },

  // Friends
  {
    id: "friend-1",
    category: "friends",
    name: "Alex Chen",
    subtitle: "Castro",
    initials: "AC",
    color: "#007AFF",
    position: [-122.4350, 37.7609],
    movement: { pattern: "random-walk", speed: 0.00006 },
  },
  {
    id: "friend-2",
    category: "friends",
    name: "Jordan Kim",
    subtitle: "Haight-Ashbury",
    initials: "JK",
    color: "#5856D6",
    position: [-122.4477, 37.7694],
    movement: { pattern: "random-walk", speed: 0.00004 },
  },
  {
    id: "friend-3",
    category: "friends",
    name: "Sam Rivera",
    subtitle: "North Beach",
    initials: "SR",
    color: "#AF52DE",
    position: [-122.4078, 37.8005],
    movement: { pattern: "stationary" },
  },
];
