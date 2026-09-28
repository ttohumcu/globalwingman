export const droneMakers: Record<string, string[]> = {
  "DJI": [
    "Neo", "Air 3S", "Mini 5 Pro", "Mini 4K", "Mini 4 Pro", "Mini 3 Pro", "Mini 3", "Mini 2 SE", "Mini 2", "Mini SE", "Mavic Mini",
    "Mavic 3 Pro", "Mavic 3 Pro Cine", "Mavic 3", "Mavic 3 Cine", "Mavic 3 Classic", "Mavic 3 Enterprise", "Mavic 3 Thermal", "Mavic 3 Multispectral",
    "Mavic 2 Pro", "Mavic 2 Zoom", "Mavic 2 Enterprise", "Mavic 2 Enterprise Dual", "Mavic 2 Enterprise Advanced",
    "Mavic Pro", "Mavic Pro Platinum", "Spark", "Ryze Tello",
    "Air 3", "Air 2S", "Mavic Air 2", "Mavic Air",
    "Avata 2", "Avata", "FPV",
    "Inspire 3", "Inspire 2", "Inspire 1", "Inspire 1 Pro", "Inspire 1 RAW",
    "Phantom 4 Pro V2.0", "Phantom 4 Pro", "Phantom 4 Advanced", "Phantom 4 RTK", "Phantom 4 Multispectral", "Phantom 4",
    "Phantom 3 Professional", "Phantom 3 Advanced", "Phantom 3 Standard", "Phantom 3 4K", "Phantom 3 SE",
    "Matrice 350 RTK", "Matrice 300 RTK", "Matrice 30", "Matrice 30T", "Matrice 3D", "Matrice 3TD", "Matrice 210 RTK V2", "Matrice 210 V2", "Matrice 200 V2", "Matrice 600 Pro",
    "Agras T50", "Agras T40", "Agras T30", "Agras T25", "Agras T20P", "Agras T20", "Agras T16", "Agras T10", "Agras MG-1",
    "FlyCart 30"
  ],
  "Autel Robotics": [
    "EVO Max 4T", "EVO Max 4N", "Alpha", "Titan",
    "EVO II Pro V3", "EVO II Dual 640T V3", "EVO II RTK V3", "EVO II Enterprise V3",
    "EVO II Pro V2", "EVO II Dual 640T V2", "EVO II V2", "EVO",
    "EVO Lite+", "EVO Lite", "EVO Lite Enterprise",
    "EVO Nano+", "EVO Nano",
    "Dragonfish Standard", "Dragonfish Lite", "Dragonfish Pro",
    "X-Star Premium"
  ],
  "Skydio": [
    "Skydio X10", "Skydio X10D", "Skydio X2", "Skydio X2E", "Skydio X2D", 
    "Skydio 2+", "Skydio 2", "Skydio R1"
  ],
  "Parrot": [
    "ANAFI Ai", "ANAFI USA", "ANAFI Thermal", "ANAFI Work", "ANAFI FPV", "ANAFI",
    "Bebop 2", "Bebop", "Mambo", "Swing", "Disco", "AR.Drone 2.0"
  ],
  "Holy Stone": [
    "HS600", "HS720G", "HS720E", "HS720", "HS710", "HS700E", "HS700D", 
    "HS360S", "HS175D", "HS120D", "HS110D", "HS440"
  ],
  "BetaFPV": [
    "Meteor65", "Meteor65 Pro", "Meteor75", "Meteor75 Pro", "Meteor85", 
    "Pavo Pico", "Pavo Pico 2", "Pavo20", "Pavo25", "Pavo30", "Pavo35",
    "Cetus X", "Cetus Pro", "Cetus", "Aquila16", "HX115"
  ],
  "iFlight": [
    "Nazgul5", "Nazgul Evoque F5", "Nazgul Evoque F6",
    "Protek25", "Protek35", 
    "Chimera7", "Chimera7 Pro", "XL5",
    "AOS 3.5", "AOS 5", "AOS 7",
    "Defender 16", "Defender 20", "Defender 25",
    "Mach R5", "Taurus X8"
  ],
  "Custom/FPV": ["Custom Build 5-inch", "Custom Build 3-inch", "Custom Build 7-inch", "Cinewhoop", "Tinywhoop", "Freestyle", "Long Range"],
  "Other": ["Other"]
};

export const makerList = Object.keys(droneMakers);
