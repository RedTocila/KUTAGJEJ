/** Server-side vehicle catalog (mirrors src/lib/vehicle-catalog.ts). */

const VEHICLE_TYPES = [
  {
    "value": "car",
    "label": "Vetura"
  },
  {
    "value": "suv",
    "label": "SUV"
  },
  {
    "value": "van",
    "label": "Furgon"
  },
  {
    "value": "truck",
    "label": "Kamion"
  },
  {
    "value": "motorcycle",
    "label": "Motor"
  },
  {
    "value": "boat",
    "label": "Varkë"
  }
];

const VEHICLE_TYPE_VALUES = VEHICLE_TYPES.map((t) => t.value);

const VEHICLE_CATALOG = {
  "car": {
    "Alfa Romeo": [
      "Giulia",
      "Giulietta",
      "Stelvio",
      "Tonale",
      "MiTo",
      "159",
      "147",
      "156",
      "Other"
    ],
    "Aston Martin": [
      "DB11",
      "DB12",
      "Vantage",
      "DBS",
      "DBX",
      "Other"
    ],
    "Audi": [
      "A1",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "A8",
      "Q2",
      "Q3",
      "Q5",
      "Q7",
      "Q8",
      "TT",
      "e-tron",
      "RS3",
      "RS4",
      "RS6",
      "S3",
      "S4",
      "Other"
    ],
    "Bentley": [
      "Continental GT",
      "Flying Spur",
      "Bentayga",
      "Other"
    ],
    "BMW": [
      "1 Series",
      "2 Series",
      "3 Series",
      "4 Series",
      "5 Series",
      "6 Series",
      "7 Series",
      "8 Series",
      "X1",
      "X2",
      "X3",
      "X4",
      "X5",
      "X6",
      "X7",
      "Z4",
      "i3",
      "i4",
      "iX",
      "M3",
      "M4",
      "M5",
      "Other"
    ],
    "Bugatti": [
      "Chiron",
      "Veyron",
      "Other"
    ],
    "Cadillac": [
      "CT4",
      "CT5",
      "Escalade",
      "XT4",
      "XT5",
      "Other"
    ],
    "Chevrolet": [
      "Aveo",
      "Cruze",
      "Spark",
      "Captiva",
      "Orlando",
      "Camaro",
      "Corvette",
      "Other"
    ],
    "Chrysler": [
      "300",
      "Pacifica",
      "Other"
    ],
    "Citroën": [
      "C1",
      "C3",
      "C3 Aircross",
      "C4",
      "C4 Cactus",
      "C5",
      "C5 Aircross",
      "Berlingo",
      "DS3",
      "DS4",
      "Other"
    ],
    "Dacia": [
      "Sandero",
      "Logan",
      "Duster",
      "Jogger",
      "Spring",
      "Lodgy",
      "Dokker",
      "Other"
    ],
    "Dodge": [
      "Challenger",
      "Charger",
      "Durango",
      "Other"
    ],
    "Ferrari": [
      "Roma",
      "Portofino",
      "F8",
      "SF90",
      "296",
      "812",
      "Other"
    ],
    "Fiat": [
      "500",
      "500X",
      "500L",
      "Panda",
      "Punto",
      "Tipo",
      "Bravo",
      "Doblo",
      "Grande Punto",
      "Other"
    ],
    "Ford": [
      "Fiesta",
      "Focus",
      "Mondeo",
      "Puma",
      "Kuga",
      "EcoSport",
      "Mustang",
      "Galaxy",
      "S-Max",
      "Ka",
      "Other"
    ],
    "Honda": [
      "Civic",
      "Accord",
      "Jazz",
      "CR-V",
      "HR-V",
      "City",
      "Insight",
      "Other"
    ],
    "Hyundai": [
      "i10",
      "i20",
      "i30",
      "Elantra",
      "Tucson",
      "Santa Fe",
      "Kona",
      "Ioniq",
      "Ioniq 5",
      "Bayon",
      "Other"
    ],
    "Infiniti": [
      "Q30",
      "Q50",
      "QX50",
      "QX60",
      "QX80",
      "Other"
    ],
    "Jaguar": [
      "XE",
      "XF",
      "XJ",
      "F-Type",
      "E-Pace",
      "F-Pace",
      "I-Pace",
      "Other"
    ],
    "Jeep": [
      "Renegade",
      "Compass",
      "Cherokee",
      "Grand Cherokee",
      "Wrangler",
      "Avenger",
      "Other"
    ],
    "Kia": [
      "Picanto",
      "Rio",
      "Ceed",
      "Sportage",
      "Sorento",
      "Niro",
      "Stonic",
      "XCeed",
      "EV6",
      "Proceed",
      "Other"
    ],
    "Lamborghini": [
      "Huracán",
      "Urus",
      "Revuelto",
      "Other"
    ],
    "Land Rover": [
      "Defender",
      "Discovery",
      "Discovery Sport",
      "Range Rover",
      "Range Rover Sport",
      "Range Rover Evoque",
      "Range Rover Velar",
      "Other"
    ],
    "Lexus": [
      "CT",
      "IS",
      "ES",
      "GS",
      "LS",
      "UX",
      "NX",
      "RX",
      "LX",
      "Other"
    ],
    "Lincoln": [
      "Navigator",
      "Aviator",
      "Corsair",
      "Other"
    ],
    "Maserati": [
      "Ghibli",
      "Quattroporte",
      "Levante",
      "Grecale",
      "MC20",
      "Other"
    ],
    "Mazda": [
      "2",
      "3",
      "6",
      "CX-3",
      "CX-30",
      "CX-5",
      "CX-60",
      "MX-5",
      "Other"
    ],
    "Mercedes-Benz": [
      "A-Class",
      "B-Class",
      "C-Class",
      "CLA",
      "CLS",
      "E-Class",
      "S-Class",
      "GLA",
      "GLB",
      "GLC",
      "GLE",
      "GLS",
      "G-Class",
      "SL",
      "AMG GT",
      "EQC",
      "EQA",
      "EQB",
      "EQE",
      "EQS",
      "Other"
    ],
    "Mini": [
      "Cooper",
      "Cooper S",
      "Clubman",
      "Countryman",
      "Cabrio",
      "John Cooper Works",
      "Other"
    ],
    "Mitsubishi": [
      "Space Star",
      "ASX",
      "Eclipse Cross",
      "Outlander",
      "Lancer",
      "Pajero",
      "Other"
    ],
    "Nissan": [
      "Micra",
      "Note",
      "Leaf",
      "Juke",
      "Qashqai",
      "X-Trail",
      "Navara",
      "370Z",
      "GT-R",
      "Other"
    ],
    "Opel": [
      "Corsa",
      "Astra",
      "Insignia",
      "Mokka",
      "Crossland",
      "Grandland",
      "Adam",
      "Meriva",
      "Zafira",
      "Other"
    ],
    "Peugeot": [
      "108",
      "208",
      "308",
      "408",
      "508",
      "2008",
      "3008",
      "5008",
      "RCZ",
      "Other"
    ],
    "Porsche": [
      "911",
      "Cayman",
      "Boxster",
      "Panamera",
      "Macan",
      "Cayenne",
      "Taycan",
      "Other"
    ],
    "Renault": [
      "Clio",
      "Megane",
      "Captur",
      "Kadjar",
      "Austral",
      "Scenic",
      "Talisman",
      "Zoe",
      "Arkana",
      "Twingo",
      "Other"
    ],
    "Rolls-Royce": [
      "Ghost",
      "Phantom",
      "Cullinan",
      "Spectre",
      "Other"
    ],
    "Seat": [
      "Ibiza",
      "Leon",
      "Arona",
      "Ateca",
      "Tarraco",
      "Toledo",
      "Alhambra",
      "Other"
    ],
    "Skoda": [
      "Fabia",
      "Scala",
      "Octavia",
      "Superb",
      "Kamiq",
      "Karoq",
      "Kodiaq",
      "Enyaq",
      "Rapid",
      "Other"
    ],
    "Smart": [
      "ForTwo",
      "ForFour",
      "#1",
      "#3",
      "Other"
    ],
    "Subaru": [
      "Impreza",
      "Legacy",
      "Outback",
      "Forester",
      "XV",
      "BRZ",
      "Other"
    ],
    "Suzuki": [
      "Swift",
      "Ignis",
      "Baleno",
      "Vitara",
      "S-Cross",
      "Jimny",
      "SX4",
      "Other"
    ],
    "Tesla": [
      "Model 3",
      "Model S",
      "Model X",
      "Model Y",
      "Other"
    ],
    "Toyota": [
      "Aygo",
      "Yaris",
      "Corolla",
      "Camry",
      "Prius",
      "C-HR",
      "RAV4",
      "Highlander",
      "Land Cruiser",
      "Supra",
      "bZ4X",
      "Auris",
      "Other"
    ],
    "Volkswagen": [
      "Polo",
      "Golf",
      "Passat",
      "Arteon",
      "T-Roc",
      "Tiguan",
      "Touareg",
      "ID.3",
      "ID.4",
      "ID.7",
      "up!",
      "Touran",
      "T-Cross",
      "Scirocco",
      "Other"
    ],
    "Volvo": [
      "S60",
      "S90",
      "V60",
      "V90",
      "XC40",
      "XC60",
      "XC90",
      "C40",
      "EX30",
      "EX90",
      "Other"
    ],
    "Other": [
      "Other"
    ]
  },
  "suv": {
    "Alfa Romeo": [
      "Stelvio",
      "Tonale",
      "Other"
    ],
    "Audi": [
      "Q2",
      "Q3",
      "Q5",
      "Q7",
      "Q8",
      "e-tron",
      "Other"
    ],
    "Bentley": [
      "Bentayga",
      "Other"
    ],
    "BMW": [
      "X1",
      "X2",
      "X3",
      "X4",
      "X5",
      "X6",
      "X7",
      "iX",
      "XM",
      "Other"
    ],
    "Chevrolet": [
      "Captiva",
      "Trax",
      "Equinox",
      "Tahoeoe",
      "Other"
    ],
    "Citroën": [
      "C3 Aircross",
      "C5 Aircross",
      "Other"
    ],
    "Cupra": [
      "Formentor",
      "Ateca",
      "Tavascan",
      "Other"
    ],
    "Dacia": [
      "Duster",
      "Bigster",
      "Other"
    ],
    "DS": [
      "DS 3 Crossback",
      "DS 7",
      "Other"
    ],
    "Fiat": [
      "500X",
      "Other"
    ],
    "Ford": [
      "EcoSport",
      "Puma",
      "Kuga",
      "Explorer",
      "Bronco",
      "Other"
    ],
    "Honda": [
      "CR-V",
      "HR-V",
      "ZR-V",
      "Other"
    ],
    "Hyundai": [
      "Tucson",
      "Santa Fe",
      "Kona",
      "Ioniq 5",
      "Bayon",
      "Other"
    ],
    "Infiniti": [
      "QX50",
      "QX60",
      "QX80",
      "Other"
    ],
    "Jaguar": [
      "E-Pace",
      "F-Pace",
      "I-Pace",
      "Other"
    ],
    "Jeep": [
      "Renegade",
      "Compass",
      "Cherokee",
      "Grand Cherokee",
      "Wrangler",
      "Avenger",
      "Other"
    ],
    "Kia": [
      "Sportage",
      "Sorento",
      "Niro",
      "Stonic",
      "EV6",
      "EV9",
      "Other"
    ],
    "Lamborghini": [
      "Urus",
      "Other"
    ],
    "Land Rover": [
      "Defender",
      "Discovery",
      "Discovery Sport",
      "Range Rover",
      "Range Rover Sport",
      "Range Rover Evoque",
      "Range Rover Velar",
      "Other"
    ],
    "Lexus": [
      "UX",
      "NX",
      "RX",
      "LX",
      "Other"
    ],
    "Maserati": [
      "Levante",
      "Grecale",
      "Other"
    ],
    "Mazda": [
      "CX-3",
      "CX-30",
      "CX-5",
      "CX-60",
      "CX-90",
      "Other"
    ],
    "Mercedes-Benz": [
      "GLA",
      "GLB",
      "GLC",
      "GLE",
      "GLS",
      "G-Class",
      "EQA",
      "EQB",
      "EQC",
      "EQE SUV",
      "EQS SUV",
      "Other"
    ],
    "Mini": [
      "Countryman",
      "Other"
    ],
    "Mitsubishi": [
      "ASX",
      "Eclipse Cross",
      "Outlander",
      "Pajero",
      "Other"
    ],
    "Nissan": [
      "Juke",
      "Qashqai",
      "X-Trail",
      "Ariya",
      "Other"
    ],
    "Opel": [
      "Mokka",
      "Crossland",
      "Grandland",
      "Other"
    ],
    "Peugeot": [
      "2008",
      "3008",
      "5008",
      "Other"
    ],
    "Porsche": [
      "Macan",
      "Cayenne",
      "Other"
    ],
    "Renault": [
      "Captur",
      "Kadjar",
      "Austral",
      "Arkana",
      "Scenic E-Tech",
      "Other"
    ],
    "Seat": [
      "Arona",
      "Ateca",
      "Tarraco",
      "Other"
    ],
    "Skoda": [
      "Kamiq",
      "Karoq",
      "Kodiaq",
      "Enyaq",
      "Other"
    ],
    "SsangYong": [
      "Tivoli",
      "Korando",
      "Rexton",
      "Other"
    ],
    "Subaru": [
      "Forester",
      "Outback",
      "XV",
      "Solterra",
      "Other"
    ],
    "Suzuki": [
      "Vitara",
      "S-Cross",
      "Jimny",
      "Across",
      "Other"
    ],
    "Tesla": [
      "Model X",
      "Model Y",
      "Other"
    ],
    "Toyota": [
      "C-HR",
      "RAV4",
      "Highlander",
      "Land Cruiser",
      "bZ4X",
      "Yaris Cross",
      "Other"
    ],
    "Volkswagen": [
      "T-Roc",
      "Tiguan",
      "Touareg",
      "T-Cross",
      "ID.4",
      "ID.5",
      "Taigo",
      "Other"
    ],
    "Volvo": [
      "XC40",
      "XC60",
      "XC90",
      "C40",
      "EX30",
      "EX90",
      "Other"
    ],
    "Other": [
      "Other"
    ]
  },
  "van": {
    "Citroën": [
      "Berlingo",
      "Jumpy",
      "Jumper",
      "SpaceTourer",
      "Other"
    ],
    "Fiat": [
      "Doblo",
      "Scudo",
      "Ducato",
      "Talento",
      "Other"
    ],
    "Ford": [
      "Transit",
      "Transit Custom",
      "Transit Connect",
      "Tourneo Custom",
      "Tourneo Connect",
      "Other"
    ],
    "Hyundai": [
      "H350",
      "Staria",
      "Other"
    ],
    "Iveco": [
      "Daily",
      "Other"
    ],
    "MAN": [
      "TGE",
      "Other"
    ],
    "Maxus": [
      "Deliver 9",
      "eDeliver 3",
      "Other"
    ],
    "Mercedes-Benz": [
      "Vito",
      "V-Class",
      "Sprinter",
      "Citan",
      "Other"
    ],
    "Nissan": [
      "NV200",
      "NV300",
      "NV400",
      "Townstar",
      "Primastar",
      "Other"
    ],
    "Opel": [
      "Combo",
      "Vivaro",
      "Movano",
      "Zafira Life",
      "Other"
    ],
    "Peugeot": [
      "Partner",
      "Expert",
      "Boxer",
      "Traveller",
      "Rifter",
      "Other"
    ],
    "Renault": [
      "Kangoo",
      "Trafic",
      "Master",
      "Express",
      "Other"
    ],
    "Toyota": [
      "Proace",
      "Proace City",
      "HiAce",
      "Other"
    ],
    "Volkswagen": [
      "Caddy",
      "Transporter",
      "Caravelle",
      "Multivan",
      "Crafter",
      "California",
      "Other"
    ],
    "Other": [
      "Other"
    ]
  },
  "truck": {
    "DAF": [
      "XF",
      "XG",
      "XD",
      "CF",
      "LF",
      "Other"
    ],
    "Ford": [
      "Transit Chassis",
      "F-Max",
      "Other"
    ],
    "Foton": [
      "Aumark",
      "Auman",
      "Other"
    ],
    "Isuzu": [
      "N-Series",
      "F-Series",
      "Other"
    ],
    "Iveco": [
      "Daily",
      "Eurocargo",
      "S-Way",
      "T-Way",
      "X-Way",
      "Other"
    ],
    "MAN": [
      "TGL",
      "TGM",
      "TGS",
      "TGX",
      "TGE",
      "Other"
    ],
    "Mercedes-Benz": [
      "Atego",
      "Actros",
      "Arocs",
      "Antos",
      "Sprinter Chassis",
      "Other"
    ],
    "Mitsubishi Fuso": [
      "Canter",
      "Other"
    ],
    "Renault Trucks": [
      "T",
      "C",
      "K",
      "D",
      "Master",
      "Other"
    ],
    "Scania": [
      "R-Series",
      "S-Series",
      "G-Series",
      "P-Series",
      "L-Series",
      "Other"
    ],
    "Volkswagen": [
      "Crafter Chassis",
      "Other"
    ],
    "Volvo": [
      "FH",
      "FM",
      "FMX",
      "FE",
      "FL",
      "Other"
    ],
    "Other": [
      "Other"
    ]
  },
  "motorcycle": {
    "Aprilia": [
      "RS 125",
      "RS 660",
      "Tuono 660",
      "RSV4",
      "SX 125",
      "Other"
    ],
    "Benelli": [
      "TNT",
      "TRK",
      "Leoncino",
      "502C",
      "Other"
    ],
    "BMW": [
      "R 1250 GS",
      "R 1300 GS",
      "F 750 GS",
      "F 850 GS",
      "F 900 R",
      "S 1000 RR",
      "S 1000 XR",
      "G 310 R",
      "CE 04",
      "Other"
    ],
    "CFMoto": [
      "300NK",
      "650NK",
      "700CL-X",
      "800MT",
      "Other"
    ],
    "Ducati": [
      "Monster",
      "Panigale V2",
      "Panigale V4",
      "Multistrada",
      "Scrambler",
      "Diavel",
      "Hypermotard",
      "Streetfighter",
      "Other"
    ],
    "Harley-Davidson": [
      "Sportster",
      "Softail",
      "Touring",
      "Street",
      "LiveWire",
      "Pan America",
      "Other"
    ],
    "Honda": [
      "CBR125R",
      "CBR500R",
      "CBR600RR",
      "CBR1000RR",
      "CB500X",
      "CB650R",
      "Africa Twin",
      "PCX",
      "Forza",
      "SH125",
      "SH150",
      "X-ADV",
      "Rebel",
      "Other"
    ],
    "Husqvarna": [
      "Svartpilen",
      "Vitpilen",
      "Norden 901",
      "701 Enduro",
      "Other"
    ],
    "Kawasaki": [
      "Ninja 400",
      "Ninja 650",
      "Ninja ZX-6R",
      "Ninja ZX-10R",
      "Z650",
      "Z900",
      "Versys",
      "Vulcan",
      "Other"
    ],
    "KTM": [
      "125 Duke",
      "390 Duke",
      "890 Duke",
      "1290 Super Duke",
      "790 Adventure",
      "890 Adventure",
      "1290 Super Adventure",
      "RC 390",
      "Other"
    ],
    "MV Agusta": [
      "Brutale",
      "F3",
      "Turismo Veloce",
      "Other"
    ],
    "Piaggio": [
      "Beverly",
      "Medley",
      "Liberty",
      "MP3",
      "Vespa GTS",
      "Other"
    ],
    "Royal Enfield": [
      "Classic 350",
      "Meteor 350",
      "Hunter 350",
      "Himalayan",
      "Interceptor 650",
      "Other"
    ],
    "Suzuki": [
      "GSX-R125",
      "GSX-R600",
      "GSX-R750",
      "GSX-R1000",
      "SV650",
      "V-Strom",
      "Burgman",
      "Katana",
      "Other"
    ],
    "Sym": [
      "Jet",
      "Orbit",
      "Cruisym",
      "Maxsym",
      "Other"
    ],
    "Triumph": [
      "Street Triple",
      "Speed Triple",
      "Bonneville",
      "Tiger",
      "Trident",
      "Rocket 3",
      "Other"
    ],
    "Vespa": [
      "Primavera",
      "Sprint",
      "GTS",
      "Elettrica",
      "PX",
      "Other"
    ],
    "Yamaha": [
      "YZF-R125",
      "YZF-R3",
      "YZF-R6",
      "YZF-R1",
      "MT-03",
      "MT-07",
      "MT-09",
      "MT-10",
      "Tracer",
      "Ténéré",
      "XMAX",
      "NMAX",
      "TMAX",
      "Other"
    ],
    "Zero": [
      "S",
      "SR",
      "DSR",
      "Other"
    ],
    "Other": [
      "Other"
    ]
  },
  "boat": {
    "Axopar": [
      "22",
      "25",
      "28",
      "37",
      "Other"
    ],
    "Bavaria": [
      "Cruiser",
      "Virtess",
      "Sport",
      "Other"
    ],
    "Bayliner": [
      "Element",
      "VR5",
      "VR6",
      "Trophy",
      "Other"
    ],
    "Beneteau": [
      "Antares",
      "Oceanis",
      "First",
      "Flyer",
      "Gran Turismo",
      "Other"
    ],
    "Boston Whaler": [
      "Montauk",
      "Outrage",
      "Dauntless",
      "Other"
    ],
    "Chaparral": [
      "SSI",
      "SSi Sport",
      "Sunsesta",
      "Other"
    ],
    "Honda Marine": [
      "Rigid Inflatable",
      "Other"
    ],
    "Jeanneau": [
      "Cap Camarat",
      "Merry Fisher",
      "Leader",
      "Sun Odyssey",
      "Other"
    ],
    "Lagoon": [
      "40",
      "42",
      "46",
      "50",
      "Other"
    ],
    "Mercury": [
      "Rigid Inflatable",
      "Other"
    ],
    "Quicksilver": [
      "Activ",
      "Weekend",
      "Commander",
      "Other"
    ],
    "Regal": [
      "LS",
      "LX",
      "Express",
      "Other"
    ],
    "Rinker": [
      "QX",
      "Captiva",
      "Other"
    ],
    "Sea Ray": [
      "SPX",
      "Sundancer",
      "SLX",
      "Other"
    ],
    "Suzuki Marine": [
      "Rigid Inflatable",
      "Other"
    ],
    "Tracker": [
      "Pro Team",
      "Targa",
      "Other"
    ],
    "Yamaha": [
      "242X",
      "AR190",
      "SX190",
      "WaveRunner",
      "Other"
    ],
    "Zodiac": [
      "Medline",
      "Pro",
      "Open",
      "Other"
    ],
    "Other": [
      "Other"
    ]
  }
};

function isVehicleType(value) {
  return VEHICLE_TYPE_VALUES.includes(value);
}

function makesForVehicleType(type) {
  if (!type || !VEHICLE_CATALOG[type]) return [];
  return Object.keys(VEHICLE_CATALOG[type]);
}

function modelsForMake(type, make) {
  if (!type || !make || !VEHICLE_CATALOG[type]) return [];
  return VEHICLE_CATALOG[type][make] || [];
}

function isValidVehicleMake(type, make) {
  return Boolean(isVehicleType(type) && VEHICLE_CATALOG[type] && VEHICLE_CATALOG[type][make]);
}

function isValidVehicleModel(type, make, model) {
  if (!isValidVehicleMake(type, make)) return false;
  return (VEHICLE_CATALOG[type][make] || []).includes(model);
}

function allVehicleMakes() {
  const set = new Set();
  for (const type of VEHICLE_TYPE_VALUES) {
    for (const make of Object.keys(VEHICLE_CATALOG[type])) set.add(make);
  }
  return [...set].sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)));
}

module.exports = {
  VEHICLE_TYPES,
  VEHICLE_TYPE_VALUES,
  VEHICLE_CATALOG,
  isVehicleType,
  makesForVehicleType,
  modelsForMake,
  isValidVehicleMake,
  isValidVehicleModel,
  allVehicleMakes,
};
