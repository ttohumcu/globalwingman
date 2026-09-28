export const droneCertifications: Record<string, string[]> = {
  "United States": [
    "TRUST (Recreational)",
    "FAA Part 107 (Commercial)",
    "Public Safety (COA)"
  ],
  "European Union (EASA)": [
    "A1/A3 Open Category",
    "A2 Open Category",
    "Specific Category (STS/PDRA)",
    "Certified Category"
  ],
  "United Kingdom (CAA)": [
    "Flyer ID (Basic)",
    "Operator ID",
    "A2 CofC",
    "GVC (General VLOS Certificate)"
  ],
  "Canada (Transport Canada)": [
    "Basic Operations",
    "Advanced Operations",
    "SFOC (Special Flight Operations Certificate)"
  ],
  "Australia (CASA)": [
    "RPA Operator Accreditation",
    "RePL (Remote Pilot Licence)",
    "ReOC (RPA Operator Certificate)"
  ],
  "New Zealand (CAA)": [
    "Part 101 (Basic)",
    "Part 102 (Advanced)"
  ],
  "Japan (JCAB)": [
    "DIPS Registration",
    "Comprehensive Flight Permission",
    "Category III Flight Certification"
  ],
  "Brazil (ANAC)": [
    "SISANT Registration",
    "CAER (Class 3)",
    "CAER (Class 2/1)"
  ],
  "China (CAAC)": [
    "UAS Registration",
    "CAAC Drone Pilot License"
  ],
  "India (DGCA)": [
    "UIN Registration",
    "Remote Pilot Certificate (RPC)"
  ],
  "South Africa (SACAA)": [
    "RPL (Remote Pilot Licence)",
    "ROC (Remote Operator Certificate)"
  ],
  "Singapore (CAAS)": [
    "UA Basic Training (UABT)",
    "UA Pilot Licence (UAPL)"
  ],
  "United Arab Emirates (GCAA)": [
    "Recreational Registration",
    "Commercial Registration"
  ],
  "Mexico (AFAC)": [
    "RPAS Registration",
    "Commercial Pilot License (RPAS)"
  ],
  "Switzerland (FOCA)": [
    "A1/A3 Open Category",
    "A2 Open Category",
    "Specific Category"
  ],
  "Norway (CAA)": [
    "A1/A3 Open Category",
    "A2 Open Category",
    "Specific Category"
  ],
  "Iceland (ICETRA)": [
    "A1/A3 Open Category",
    "A2 Open Category",
    "Specific Category"
  ],
  "South Korea (MOLIT)": [
    "Drone Registration",
    "National Drone Pilot License (Types 1-4)"
  ],
  "Taiwan (CAA)": [
    "Drone Registration",
    "Remote Pilot Certificate"
  ],
  "Malaysia (CAAM)": [
    "Remote Pilot Certificate of Competency (RCoC)"
  ],
  "Philippines (CAAP)": [
    "RPA Controller Certificate",
    "RPA Operator Certificate"
  ],
  "Indonesia (DGCA)": [
    "Remote Pilot License (RPL)"
  ],
  "Thailand (CAAT)": [
    "UAV Registration",
    "NBTC Registration"
  ],
  "Vietnam (CAAV)": [
    "Flight License (Ministry of Defense)"
  ],
  "Saudi Arabia (GACA)": [
    "Drone Registration",
    "Commercial Drone Permit"
  ],
  "Israel (CAAI)": [
    "Recreational Registration",
    "Commercial Drone License"
  ],
  "Turkey (SHGM)": [
    "IHA-0 (Commercial/Recreational)",
    "IHA-1 (Commercial)"
  ],
  "Argentina (ANAC)": [
    "VANT Registration",
    "Remote Pilot Certificate"
  ],
  "Chile (DGAC)": [
    "RPAS Registration",
    "Remote Pilot Credential"
  ],
  "Colombia (Aerocivil)": [
    "Drone Registration",
    "Remote Pilot License"
  ],
  "Peru (MTC)": [
    "RPA Registration",
    "RPA Operator Accreditation"
  ],
  "Kenya (KCAA)": [
    "RPA Registration",
    "Remote Pilot Licence (RPL)"
  ],
  "Nigeria (NCAA)": [
    "RPA Registration",
    "Remote Pilot Certificate"
  ],
  "Egypt (ECAA)": [
    "Ministry of Defense Permit"
  ],
  "Morocco (DGAC)": [
    "Special Authorization (Strictly Regulated)"
  ],
  "Other": [
    "Local Recreational Registration",
    "Local Commercial License",
    "Other"
  ]
};

export const countries = Object.keys(droneCertifications).sort((a, b) => {
  if (a === 'Other') return 1;
  if (b === 'Other') return -1;
  return a.localeCompare(b);
});
