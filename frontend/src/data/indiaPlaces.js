// Comprehensive catalog of Major Cities, State Capitals, Transit Hubs, ISBTs, District HQs, Pilgrim Centers & Sub-Stations across ALL States & Union Territories of India.

export const INDIA_ALL_PLACES = [
  // ==========================================
  // NATIONAL CAPITAL REGION (NCR) & DELHI
  // ==========================================
  { name: "New Delhi", state: "Delhi", district: "New Delhi", category: "National Capital / Transit Hub", lat: 28.6139, lng: 77.2090 },
  { name: "Delhi (Kashmere Gate ISBT)", state: "Delhi", district: "North Delhi", category: "Major Bus Terminal / ISBT", lat: 28.6675, lng: 77.2285 },
  { name: "Delhi (Anand Vihar ISBT)", state: "Delhi", district: "East Delhi", category: "Major Bus Terminal / ISBT", lat: 28.6475, lng: 77.3158 },
  { name: "Delhi (Sarai Kale Khan ISBT)", state: "Delhi", district: "South East Delhi", category: "Major Bus Terminal / ISBT", lat: 28.5888, lng: 77.2555 },
  { name: "Connaught Place", state: "Delhi", district: "New Delhi", category: "Central Hub", lat: 28.6315, lng: 77.2167 },
  { name: "Dwarka", state: "Delhi", district: "South West Delhi", category: "Transit Hub", lat: 28.5921, lng: 77.0460 },
  { name: "Rohini", state: "Delhi", district: "North West Delhi", category: "Sub-Station / Hub", lat: 28.7166, lng: 77.1166 },
  { name: "Saket", state: "Delhi", district: "South Delhi", category: "Hub", lat: 28.5244, lng: 77.2164 },
  { name: "Noida", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", category: "NCR Metro Hub", lat: 28.5355, lng: 77.3910 },
  { name: "Greater Noida", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", category: "NCR City / Hub", lat: 28.4744, lng: 77.5040 },
  { name: "Ghaziabad", state: "Uttar Pradesh", district: "Ghaziabad", category: "Major Bus Terminal", lat: 28.6692, lng: 77.4538 },
  { name: "Gurugram (Gurgaon)", state: "Haryana", district: "Gurugram", category: "Major Metro & Bus Hub", lat: 28.4595, lng: 77.0266 },
  { name: "Faridabad", state: "Haryana", district: "Faridabad", category: "Major Transit Hub", lat: 28.4089, lng: 77.3178 },

  // ==========================================
  // MAHARASHTRA
  // ==========================================
  { name: "Mumbai (Central)", state: "Maharashtra", district: "Mumbai City", category: "State Capital / Metro Hub", lat: 18.9696, lng: 72.8193 },
  { name: "Mumbai (Borivali)", state: "Maharashtra", district: "Mumbai Suburban", category: "Major Bus Hub", lat: 19.2288, lng: 72.8541 },
  { name: "Mumbai (Dadar)", state: "Maharashtra", district: "Mumbai Suburban", category: "Central Transit Hub", lat: 19.0178, lng: 72.8478 },
  { name: "Navi Mumbai (Vashi)", state: "Maharashtra", district: "Thane", category: "Major Bus Terminal", lat: 19.0771, lng: 72.9986 },
  { name: "Thane", state: "Maharashtra", district: "Thane", category: "Major Bus Stand / Junction", lat: 19.2183, lng: 72.9781 },
  { name: "Pune (Shivajinagar)", state: "Maharashtra", district: "Pune", category: "Major Bus Terminal / Metro Hub", lat: 18.5314, lng: 73.8446 },
  { name: "Pune (Swargate)", state: "Maharashtra", district: "Pune", category: "Major Bus Terminal", lat: 18.5018, lng: 73.8586 },
  { name: "Nagpur", state: "Maharashtra", district: "Nagpur", category: "Sub-Capital / Major Hub", lat: 21.1458, lng: 79.0882 },
  { name: "Nashik", state: "Maharashtra", district: "Nashik", category: "Major Bus Terminal / Pilgrim", lat: 19.9975, lng: 73.7898 },
  { name: "Aurangabad (Chhatrapati Sambhajinagar)", state: "Maharashtra", district: "Aurangabad", category: "Tourist / Bus Hub", lat: 19.8762, lng: 75.3433 },
  { name: "Solapur", state: "Maharashtra", district: "Solapur", category: "Major Bus Terminal", lat: 17.6599, lng: 75.9064 },
  { name: "Kolhapur", state: "Maharashtra", district: "Kolhapur", category: "Major Bus Terminal", lat: 16.7050, lng: 74.2433 },
  { name: "Amravati", state: "Maharashtra", district: "Amravati", category: "District HQ / Hub", lat: 20.9320, lng: 77.7523 },
  { name: "Nanded", state: "Maharashtra", district: "Nanded", category: "Major Bus Stand", lat: 19.1383, lng: 77.3210 },
  { name: "Akola", state: "Maharashtra", district: "Akola", category: "District HQ", lat: 20.7002, lng: 77.0082 },
  { name: "Jalgaon", state: "Maharashtra", district: "Jalgaon", category: "Transit Hub", lat: 21.0077, lng: 75.5626 },
  { name: "Latur", state: "Maharashtra", district: "Latur", category: "District HQ / Hub", lat: 18.4088, lng: 76.5604 },
  { name: "Dhule", state: "Maharashtra", district: "Dhule", category: "Highway Junction", lat: 20.9042, lng: 74.7749 },
  { name: "Ahmednagar", state: "Maharashtra", district: "Ahmednagar", category: "Major Bus Stand", lat: 19.0952, lng: 74.7496 },
  { name: "Chandrapur", state: "Maharashtra", district: "Chandrapur", category: "District HQ", lat: 19.9615, lng: 79.2961 },
  { name: "Shirdi", state: "Maharashtra", district: "Ahmednagar", category: "Pilgrim Bus Terminal", lat: 19.7667, lng: 74.4766 },
  { name: "Mahabaleshwar", state: "Maharashtra", district: "Satara", category: "Hill Station / Tourist Hub", lat: 17.9237, lng: 73.6586 },
  { name: "Lonavala", state: "Maharashtra", district: "Pune", category: "Hill Station / Highway Hub", lat: 18.7557, lng: 73.4091 },
  { name: "Ratnagiri", state: "Maharashtra", district: "Ratnagiri", category: "Coastal Bus Terminal", lat: 16.9902, lng: 73.3120 },

  // ==========================================
  // KARNATAKA
  // ==========================================
  { name: "Bengaluru (Majestic / Kempegowda Bus Station)", state: "Karnataka", district: "Bengaluru Urban", category: "State Capital / Central Transit Hub", lat: 12.9772, lng: 77.5713 },
  { name: "Bengaluru (Shantinagar TTMC)", state: "Karnataka", district: "Bengaluru Urban", category: "Interstate Bus Terminal", lat: 12.9554, lng: 77.5956 },
  { name: "Bengaluru (Satellite Bus Stand / Mysuru Rd)", state: "Karnataka", district: "Bengaluru Urban", category: "Major Bus Terminal", lat: 12.9535, lng: 77.5388 },
  { name: "Bengaluru (Electronic City)", state: "Karnataka", district: "Bengaluru Urban", category: "Tech Hub / Transit Stop", lat: 12.8452, lng: 77.6602 },
  { name: "Bengaluru (Whitefield)", state: "Karnataka", district: "Bengaluru Urban", category: "Sub-Station / Hub", lat: 12.9698, lng: 77.7499 },
  { name: "Mysuru (Mysore)", state: "Karnataka", district: "Mysuru", category: "Major Bus Terminal / Heritage City", lat: 12.2958, lng: 76.6394 },
  { name: "Mangaluru (Mangalore)", state: "Karnataka", district: "Dakshina Kannada", category: "Coastal Transit Hub / KSRTC Stand", lat: 12.9141, lng: 74.8560 },
  { name: "Hubballi (Hubli)", state: "Karnataka", district: "Dharwad", category: "Major North Karnataka Hub", lat: 15.3647, lng: 75.1240 },
  { name: "Dharwad", state: "Karnataka", district: "Dharwad", category: "District Hub", lat: 15.4589, lng: 75.0078 },
  { name: "Belagavi (Belgaum)", state: "Karnataka", district: "Belagavi", category: "Major Bus Terminal", lat: 15.8497, lng: 74.4977 },
  { name: "Kalaburagi (Gulbarga)", state: "Karnataka", district: "Kalaburagi", category: "Divisional HQ / Bus Stand", lat: 17.3297, lng: 76.8343 },
  { name: "Davanagere", state: "Karnataka", district: "Davanagere", category: "Central Transit Hub", lat: 14.4644, lng: 75.9218 },
  { name: "Ballari (Bellary)", state: "Karnataka", district: "Ballari", category: "Major Bus Stand", lat: 15.1394, lng: 76.9214 },
  { name: "Shivamogga (Shimoga)", state: "Karnataka", district: "Shivamogga", category: "Major Bus Terminal", lat: 13.9299, lng: 75.5681 },
  { name: "Tumakuru (Tumkur)", state: "Karnataka", district: "Tumakuru", category: "Transit Hub", lat: 13.3409, lng: 77.1006 },
  { name: "Udupi", state: "Karnataka", district: "Udupi", category: "Coastal Pilgrim / Bus Hub", lat: 13.3409, lng: 74.7421 },
  { name: "Hassan", state: "Karnataka", district: "Hassan", category: "Major Junction / Bus Stand", lat: 13.0072, lng: 76.0963 },
  { name: "Chikkamagaluru", state: "Karnataka", district: "Chikkamagaluru", category: "Hill Station / Tourist Hub", lat: 13.3161, lng: 75.7720 },
  { name: "Madikeri (Coorg)", state: "Karnataka", district: "Kodagu", category: "Hill Station / Bus Stand", lat: 12.4244, lng: 75.7382 },
  { name: "Hampi (Hosapete)", state: "Karnataka", district: "Vijayanagara", category: "UNESCO World Heritage Hub", lat: 15.2716, lng: 76.3916 },
  { name: "Bidar", state: "Karnataka", district: "Bidar", category: "Historic Bus Stand", lat: 17.9104, lng: 77.5199 },
  { name: "Vijayapura (Bijapur)", state: "Karnataka", district: "Vijayapura", category: "Historic Bus Stand", lat: 16.8302, lng: 75.7100 },
  { name: "Raichur", state: "Karnataka", district: "Raichur", category: "District HQ", lat: 16.2120, lng: 77.3439 },
  { name: "Karwar", state: "Karnataka", district: "Uttara Kannada", category: "Coastal Hub", lat: 14.8185, lng: 74.1300 },

  // ==========================================
  // TAMIL NADU
  // ==========================================
  { name: "Chennai (Koyambedu CMBT)", state: "Tamil Nadu", district: "Chennai", category: "State Capital / Major Bus Terminal", lat: 13.0694, lng: 80.2056 },
  { name: "Chennai (Kilambakkam KCBT)", state: "Tamil Nadu", district: "Chengalpattu", category: "Major South Bus Terminal", lat: 12.8682, lng: 80.0825 },
  { name: "Chennai (Madhavaram MBTT)", state: "Tamil Nadu", district: "Chennai", category: "North Interstate Bus Terminal", lat: 13.1517, lng: 80.2291 },
  { name: "Chennai (Guindy)", state: "Tamil Nadu", district: "Chennai", category: "Transit Hub", lat: 13.0067, lng: 80.2024 },
  { name: "Chennai (Tambaram)", state: "Tamil Nadu", district: "Chengalpattu", category: "South Gateway Hub", lat: 12.9249, lng: 80.1000 },
  { name: "Coimbatore (Gandhipuram)", state: "Tamil Nadu", district: "Coimbatore", category: "Major Bus Terminal / Metro Hub", lat: 11.0183, lng: 76.9634 },
  { name: "Coimbatore (Singanallur)", state: "Tamil Nadu", district: "Coimbatore", category: "Southbound Bus Terminal", lat: 11.0022, lng: 77.0270 },
  { name: "Madurai (Mattuthavani Bus Stand / MIBT)", state: "Tamil Nadu", district: "Madurai", category: "Integrated Bus Terminal", lat: 9.9408, lng: 78.1565 },
  { name: "Madurai (Periyar Bus Stand)", state: "Tamil Nadu", district: "Madurai", category: "City Central Bus Stand", lat: 9.9168, lng: 78.1130 },
  { name: "Tiruchirappalli (Trichy Central Bus Stand)", state: "Tamil Nadu", district: "Tiruchirappalli", category: "Central Transit Hub", lat: 10.7905, lng: 78.6920 },
  { name: "Salem (New Bus Stand)", state: "Tamil Nadu", district: "Salem", category: "Major Junction / Bus Terminal", lat: 11.6643, lng: 78.1460 },
  { name: "Tirunelveli (New Bus Stand)", state: "Tamil Nadu", district: "Tirunelveli", category: "Major South Bus Terminal", lat: 8.7139, lng: 77.7567 },
  { name: "Tiruppur", state: "Tamil Nadu", district: "Tiruppur", category: "Textile City / Bus Stand", lat: 11.1085, lng: 77.3411 },
  { name: "Erode", state: "Tamil Nadu", district: "Erode", category: "Central Bus Terminal", lat: 11.3410, lng: 77.7172 },
  { name: "Vellore", state: "Tamil Nadu", district: "Vellore", category: "Major Bus Terminal", lat: 12.9165, lng: 79.1325 },
  { name: "Thanjavur", state: "Tamil Nadu", district: "Thanjavur", category: "Heritage / New Bus Stand", lat: 10.7870, lng: 79.1378 },
  { name: "Dindigul", state: "Tamil Nadu", district: "Dindigul", category: "Major Junction Bus Stand", lat: 10.3673, lng: 77.9803 },
  { name: "Kanchipuram", state: "Tamil Nadu", district: "Kanchipuram", category: "Pilgrim / Bus Terminal", lat: 12.8342, lng: 79.7036 },
  { name: "Nagercoil", state: "Tamil Nadu", district: "Kanyakumari", category: "South Terminal", lat: 8.1833, lng: 77.4119 },
  { name: "Kanyakumari", state: "Tamil Nadu", district: "Kanyakumari", category: "Cape Hub / Pilgrim Point", lat: 8.0883, lng: 77.5385 },
  { name: "Rameswaram", state: "Tamil Nadu", district: "Ramanathapuram", category: "Pilgrim Bus Terminal", lat: 9.2876, lng: 79.3129 },
  { name: "Udhagamandalam (Ooty)", state: "Tamil Nadu", district: "Nilgiris", category: "Hill Station / Bus Stand", lat: 11.4102, lng: 76.6950 },
  { name: "Hosur", state: "Tamil Nadu", district: "Krishnagiri", category: "Border Industrial Hub / Bus Stand", lat: 12.7409, lng: 77.8253 },
  { name: "Kumbakonam", state: "Tamil Nadu", district: "Thanjavur", category: "Temple Town Bus Stand", lat: 10.9602, lng: 79.3845 },
  { name: "Cuddalore", state: "Tamil Nadu", district: "Cuddalore", category: "Coastal Bus Terminal", lat: 11.7480, lng: 79.7714 },
  { name: "Karaikudi", state: "Tamil Nadu", district: "Sivaganga", category: "Chettinad Hub", lat: 10.0735, lng: 78.7732 },

  // ==========================================
  // KERALA
  // ==========================================
  { name: "Kottayam", state: "Kerala", district: "Kottayam", category: "District HQ / KSRTC Stand", lat: 9.5916, lng: 76.5222 },
  { name: "Kanjirappally", state: "Kerala", district: "Kottayam", category: "Major Bus Terminal", lat: 9.5544, lng: 76.7865 },
  { name: "Pala", state: "Kerala", district: "Kottayam", category: "Major Bus Terminal", lat: 9.7081, lng: 76.6837 },
  { name: "Ettumanoor", state: "Kerala", district: "Kottayam", category: "Major Sub-Station", lat: 9.6644, lng: 76.5625 },
  { name: "Erumely", state: "Kerala", district: "Kottayam", category: "Pilgrim Bus Terminal", lat: 9.4716, lng: 76.7865 },
  { name: "Ponkunnam", state: "Kerala", district: "Kottayam", category: "Major Sub-Station", lat: 9.5667, lng: 76.7583 },
  { name: "Mundakayam", state: "Kerala", district: "Kottayam", category: "Major Sub-Station", lat: 9.5424, lng: 76.8833 },
  { name: "Erattupetta", state: "Kerala", district: "Kottayam", category: "Major Bus Terminal", lat: 9.6833, lng: 76.7833 },
  { name: "Changanassery", state: "Kerala", district: "Kottayam", category: "Major Bus Terminal", lat: 9.4452, lng: 76.5385 },
  { name: "Vaikom", state: "Kerala", district: "Kottayam", category: "Bus Terminal", lat: 9.7478, lng: 76.3956 },
  { name: "Kumarakom", state: "Kerala", district: "Kottayam", category: "Tourist Hub", lat: 9.6175, lng: 76.4300 },
  { name: "Kuravilangad", state: "Kerala", district: "Kottayam", category: "Sub-Station", lat: 9.7540, lng: 76.5680 },
  { name: "Kaduthuruthy", state: "Kerala", district: "Kottayam", category: "Sub-Station", lat: 9.7330, lng: 76.4950 },
  { name: "Pampady", state: "Kerala", district: "Kottayam", category: "Sub-Station", lat: 9.5583, lng: 76.6417 },
  { name: "Manarcadu", state: "Kerala", district: "Kottayam", category: "Sub-Station", lat: 9.5850, lng: 76.5750 },
  { name: "Kochi (Vyttila Mobility Hub)", state: "Kerala", district: "Ernakulam", category: "Integrated Mega Transit Hub", lat: 9.9680, lng: 76.3180 },
  { name: "Kochi (Kaloor Bus Stand)", state: "Kerala", district: "Ernakulam", category: "Major City Stand", lat: 9.9920, lng: 76.2940 },
  { name: "Aluva", state: "Kerala", district: "Ernakulam", category: "Metro & Bus Hub", lat: 10.1076, lng: 76.3516 },
  { name: "Angamaly", state: "Kerala", district: "Ernakulam", category: "Major Bus Terminal", lat: 10.1960, lng: 76.3860 },
  { name: "Muvattupuzha", state: "Kerala", district: "Ernakulam", category: "Major Bus Terminal", lat: 9.9814, lng: 76.5786 },
  { name: "Perumbavoor", state: "Kerala", district: "Ernakulam", category: "Major Bus Terminal", lat: 10.1147, lng: 76.4789 },
  { name: "Kothamangalam", state: "Kerala", district: "Ernakulam", category: "High Range Gateway Stand", lat: 10.0650, lng: 76.6250 },
  { name: "Thiruvananthapuram (Thampanoor Central KSRTC)", state: "Kerala", district: "Thiruvananthapuram", category: "State Capital / Central Bus Terminal", lat: 8.4875, lng: 76.9525 },
  { name: "Kollam (KSRTC Stand)", state: "Kerala", district: "Kollam", category: "Major Bus Terminal", lat: 8.8932, lng: 76.6141 },
  { name: "Alappuzha (KSRTC Stand)", state: "Kerala", district: "Alappuzha", category: "Coastal District HQ / KSRTC Stand", lat: 9.4981, lng: 76.3388 },
  { name: "Cherthala", state: "Kerala", district: "Alappuzha", category: "Major Bus Terminal", lat: 9.6847, lng: 76.3315 },
  { name: "Chengannur", state: "Kerala", district: "Alappuzha", category: "Sabarimala Railway & Bus Hub", lat: 9.3175, lng: 76.6117 },
  { name: "Mavelikkara", state: "Kerala", district: "Alappuzha", category: "Sub-Station", lat: 9.2570, lng: 76.5490 },
  { name: "Kayamkulam", state: "Kerala", district: "Alappuzha", category: "Major Bus Terminal", lat: 9.1724, lng: 76.5008 },
  { name: "Pathanamthitta", state: "Kerala", district: "Pathanamthitta", category: "District HQ / KSRTC", lat: 9.2648, lng: 76.7870 },
  { name: "Thiruvalla", state: "Kerala", district: "Pathanamthitta", category: "Major Bus Terminal", lat: 9.3834, lng: 76.5744 },
  { name: "Adoor", state: "Kerala", district: "Pathanamthitta", category: "Major Bus Terminal", lat: 9.1558, lng: 76.7324 },
  { name: "Ranni", state: "Kerala", district: "Pathanamthitta", category: "Major Bus Terminal", lat: 9.3800, lng: 76.7800 },
  { name: "Nilakkal", state: "Kerala", district: "Pathanamthitta", category: "Sabarimala Base Terminal", lat: 9.3850, lng: 77.0120 },
  { name: "Pampa / Sabarimala", state: "Kerala", district: "Pathanamthitta", category: "Pilgrim River Terminal", lat: 9.4120, lng: 77.0700 },
  { name: "Thrissur (Shaktan Thampuran / KSRTC)", state: "Kerala", district: "Thrissur", category: "Cultural Capital / Major Bus Stand", lat: 10.5276, lng: 76.2144 },
  { name: "Guruvayur", state: "Kerala", district: "Thrissur", category: "Pilgrim Bus Terminal", lat: 10.5946, lng: 76.0422 },
  { name: "Palakkad (KSRTC Stand)", state: "Kerala", district: "Palakkad", category: "Gateway District HQ / Bus Stand", lat: 10.7867, lng: 76.6548 },
  { name: "Kozhikode (Calicut KSRTC / Moffusil)", state: "Kerala", district: "Kozhikode", category: "Malabar Mega Transit Hub", lat: 11.2588, lng: 75.7804 },
  { name: "Kannur (KSRTC Stand)", state: "Kerala", district: "Kannur", category: "North Malabar Terminal", lat: 11.8745, lng: 75.3704 },
  { name: "Kasaragod", state: "Kerala", district: "Kasaragod", category: "Northern District HQ", lat: 12.4996, lng: 74.9869 },
  { name: "Malappuram", state: "Kerala", district: "Malappuram", category: "District HQ", lat: 11.0738, lng: 76.0740 },
  { name: "Manjeri", state: "Kerala", district: "Malappuram", category: "Major Bus Stand", lat: 11.1215, lng: 76.1217 },
  { name: "Wayanad (Kalpetta)", state: "Kerala", district: "Wayanad", category: "Hill District HQ", lat: 11.6050, lng: 76.0830 },
  { name: "Munnar", state: "Kerala", district: "Idukki", category: "Hill Station / KSRTC Hub", lat: 10.0889, lng: 77.0595 },
  { name: "Thodupuzha", state: "Kerala", district: "Idukki", category: "Major Bus Terminal", lat: 9.8947, lng: 76.7161 },
  { name: "Kattappana", state: "Kerala", district: "Idukki", category: "High Range Major Terminal", lat: 9.7740, lng: 77.1186 },
  { name: "Kumily / Thekkady", state: "Kerala", district: "Idukki", category: "Border Wildlife Transit Stand", lat: 9.6083, lng: 77.1611 },
  { name: "Kuttikkanam", state: "Kerala", district: "Idukki", category: "Hill Station / Hub", lat: 9.5850, lng: 76.9680 },
  { name: "Vagamon", state: "Kerala", district: "Kottayam", category: "Hill Station", lat: 9.6870, lng: 76.9050 },

  // ==========================================
  // TELANGANA & ANDHRA PRADESH
  // ==========================================
  { name: "Hyderabad (MGBS - Mahatma Gandhi Bus Station)", state: "Telangana", district: "Hyderabad", category: "State Capital / Mega Interstate Terminal", lat: 17.3786, lng: 78.4800 },
  { name: "Hyderabad (JBS - Jubilee Bus Station)", state: "Telangana", district: "Hyderabad", category: "Major Bus Terminal", lat: 17.4496, lng: 78.4975 },
  { name: "Hyderabad (Gachibowli / Hitec City)", state: "Telangana", district: "Hyderabad", category: "Tech Hub / Stop", lat: 17.4401, lng: 78.3489 },
  { name: "Warangal (Hanamkonda Bus Stand)", state: "Telangana", district: "Warangal", category: "Major Bus Terminal", lat: 17.9689, lng: 79.5941 },
  { name: "Nizamabad", state: "Telangana", district: "Nizamabad", category: "District Bus Stand", lat: 18.6725, lng: 78.0941 },
  { name: "Karimnagar", state: "Telangana", district: "Karimnagar", category: "Major Bus Terminal", lat: 18.4386, lng: 79.1288 },
  { name: "Khammam", state: "Telangana", district: "Khammam", category: "District Bus Stand", lat: 17.2473, lng: 80.1514 },
  { name: "Visakhapatnam (Dwaraka Bus Station / RTC Complex)", state: "Andhra Pradesh", district: "Visakhapatnam", category: "Major Coastal Terminal", lat: 17.7258, lng: 83.3039 },
  { name: "Vijayawada (PNBS - Pandit Nehru Bus Station)", state: "Andhra Pradesh", district: "NTR", category: "Mega Central Transit Terminal", lat: 16.5097, lng: 80.6175 },
  { name: "Guntur (NTR Bus Station)", state: "Andhra Pradesh", district: "Guntur", category: "Major Bus Terminal", lat: 16.3067, lng: 80.4365 },
  { name: "Tirupati (Central Bus Stand)", state: "Andhra Pradesh", district: "Tirupati", category: "Mega Pilgrim Bus Terminal", lat: 13.6288, lng: 79.4192 },
  { name: "Nellore", state: "Andhra Pradesh", district: "Nellore", category: "Major Bus Stand", lat: 14.4426, lng: 79.9865 },
  { name: "Kurnool", state: "Andhra Pradesh", district: "Kurnool", category: "Major Bus Terminal", lat: 15.8281, lng: 78.0373 },
  { name: "Rajahmundry", state: "Andhra Pradesh", district: "East Godavari", category: "Godavari Bus Stand", lat: 17.0005, lng: 81.8040 },
  { name: "Kakinada", state: "Andhra Pradesh", district: "Kakinada", category: "Coastal Terminal", lat: 16.9891, lng: 82.2475 },
  { name: "Kadapa (Cuddapah)", state: "Andhra Pradesh", district: "YSR Kadapa", category: "District Bus Stand", lat: 14.4673, lng: 78.8242 },
  { name: "Anantapur", state: "Andhra Pradesh", district: "Anantapur", category: "Highway Bus Stand", lat: 14.6819, lng: 77.6006 },
  { name: "Amaravati", state: "Andhra Pradesh", district: "Guntur", category: "Capital City Hub", lat: 16.5131, lng: 80.5165 },

  // ==========================================
  // GUJARAT & RAJASTHAN
  // ==========================================
  { name: "Ahmedabad (Geeta Mandir Central Bus Stand)", state: "Gujarat", district: "Ahmedabad", category: "Major GSRTC Central Bus Terminal", lat: 23.0131, lng: 72.5910 },
  { name: "Gandhinagar", state: "Gujarat", district: "Gandhinagar", category: "State Capital / Bus Stand", lat: 23.2156, lng: 72.6369 },
  { name: "Surat (Central Bus Terminal)", state: "Gujarat", district: "Surat", category: "Mega Bus Terminal / Commercial Hub", lat: 21.1702, lng: 72.8311 },
  { name: "Vadodara (Baroda Central Bus Station)", state: "Gujarat", district: "Vadodara", category: "Major Modern Transit Terminal", lat: 22.3106, lng: 73.1812 },
  { name: "Rajkot (Central Bus Stand)", state: "Gujarat", district: "Rajkot", category: "Saurashtra Central Hub", lat: 22.3039, lng: 70.8022 },
  { name: "Bhavnagar", state: "Gujarat", district: "Bhavnagar", category: "Major Bus Stand", lat: 21.7645, lng: 72.1519 },
  { name: "Jamnagar", state: "Gujarat", district: "Jamnagar", category: "District Bus Stand", lat: 22.4707, lng: 70.0577 },
  { name: "Junagadh", state: "Gujarat", district: "Junagadh", category: "Historic Bus Stand", lat: 21.5222, lng: 70.4579 },
  { name: "Bhuj", state: "Gujarat", district: "Kutch", category: "Kutch Regional Terminal", lat: 23.2420, lng: 69.6669 },
  { name: "Anand", state: "Gujarat", district: "Anand", category: "Milk City Hub", lat: 22.5645, lng: 72.9289 },
  { name: "Vapi", state: "Gujarat", district: "Valsad", category: "Border Highway Hub", lat: 20.3893, lng: 72.9106 },
  { name: "Dwarka", state: "Gujarat", district: "Devbhumi Dwarka", category: "Pilgrim Bus Terminal", lat: 22.2442, lng: 68.9685 },
  { name: "Somnath (Veraval)", state: "Gujarat", district: "Gir Somnath", category: "Pilgrim Bus Terminal", lat: 20.9060, lng: 70.4010 },

  { name: "Jaipur (Sindhi Camp Central Bus Stand)", state: "Rajasthan", district: "Jaipur", category: "State Capital / Central RSRTC Terminal", lat: 26.9239, lng: 75.7997 },
  { name: "Jodhpur (Rai Ka Bagh Central Stand)", state: "Rajasthan", district: "Jodhpur", category: "Major Sun City Terminal", lat: 26.2929, lng: 73.0410 },
  { name: "Udaipur (Udiapole Bus Stand)", state: "Rajasthan", district: "Udaipur", category: "Lake City / Tourist Bus Terminal", lat: 24.5768, lng: 73.6983 },
  { name: "Kota (Central Bus Stand)", state: "Rajasthan", district: "Kota", category: "Major Coaching Hub / Terminal", lat: 25.1764, lng: 75.8450 },
  { name: "Ajmer (Central Bus Stand)", state: "Rajasthan", district: "Ajmer", category: "Pilgrim & Junction Terminal", lat: 26.4499, lng: 74.6399 },
  { name: "Bikaner", state: "Rajasthan", district: "Bikaner", category: "Desert City Hub", lat: 28.0229, lng: 73.3119 },
  { name: "Alwar", state: "Rajasthan", district: "Alwar", category: "NCR Border Terminal", lat: 27.5530, lng: 76.6346 },
  { name: "Bharatpur", state: "Rajasthan", district: "Bharatpur", category: "Bird Sanctuary City", lat: 27.2152, lng: 77.5030 },
  { name: "Bhilwara", state: "Rajasthan", district: "Bhilwara", category: "Textile City Hub", lat: 25.3407, lng: 74.6313 },
  { name: "Jaisalmer", state: "Rajasthan", district: "Jaisalmer", category: "Golden City / Tourist Terminal", lat: 26.9157, lng: 70.9083 },
  { name: "Mount Abu", state: "Rajasthan", district: "Sirohi", category: "Hill Station / Bus Stand", lat: 24.5926, lng: 72.7156 },
  { name: "Pushkar", state: "Rajasthan", district: "Ajmer", category: "Pilgrim / Tourist Hub", lat: 26.4897, lng: 74.5511 },

  // ==========================================
  // UTTAR PRADESH & UTTARAKHAND
  // ==========================================
  { name: "Lucknow (Alambagh Bus Terminal)", state: "Uttar Pradesh", district: "Lucknow", category: "State Capital / Mega Modern ISBT", lat: 26.8126, lng: 80.9077 },
  { name: "Lucknow (Charbagh / Kaisarbagh)", state: "Uttar Pradesh", district: "Lucknow", category: "Central Transit Hub", lat: 26.8324, lng: 80.9200 },
  { name: "Kanpur (Jhakarkati Bus Terminal)", state: "Uttar Pradesh", district: "Kanpur Nagar", category: "Major Industrial Terminal", lat: 26.4526, lng: 80.3478 },
  { name: "Varanasi (Cantt Bus Stand)", state: "Uttar Pradesh", district: "Varanasi", category: "Mega Pilgrim / Cultural Terminal", lat: 25.3263, lng: 82.9868 },
  { name: "Prayagraj (Allahabad Civil Lines Bus Stand)", state: "Uttar Pradesh", district: "Prayagraj", category: "Sangam City Terminal", lat: 25.4520, lng: 81.8340 },
  { name: "Agra (ISBT Transport Nagar / Idgah)", state: "Uttar Pradesh", district: "Agra", category: "Taj Mahal City / Major ISBT", lat: 27.2038, lng: 77.9629 },
  { name: "Mathura", state: "Uttar Pradesh", district: "Mathura", category: "Pilgrim Bus Terminal", lat: 27.4924, lng: 77.6737 },
  { name: "Vrindavan", state: "Uttar Pradesh", district: "Mathura", category: "Pilgrim Hub", lat: 27.5806, lng: 77.7006 },
  { name: "Ayodhya (Dham Bus Stand)", state: "Uttar Pradesh", district: "Ayodhya", category: "Mega Pilgrim Bus Terminal", lat: 26.7922, lng: 82.1998 },
  { name: "Meerut (Bhaisali Bus Stand)", state: "Uttar Pradesh", district: "Meerut", category: "Major Western UP Hub", lat: 28.9845, lng: 77.7064 },
  { name: "Bareilly (Satellite Bus Stand)", state: "Uttar Pradesh", district: "Bareilly", category: "Major Regional Terminal", lat: 28.3670, lng: 79.4304 },
  { name: "Aligarh", state: "Uttar Pradesh", district: "Aligarh", category: "Major Bus Stand", lat: 27.8974, lng: 78.0880 },
  { name: "Moradabad", state: "Uttar Pradesh", district: "Moradabad", category: "Brass City Terminal", lat: 28.8386, lng: 78.7733 },
  { name: "Gorakhpur (Railway Bus Station)", state: "Uttar Pradesh", district: "Gorakhpur", category: "Eastern UP Gateway Hub", lat: 26.7606, lng: 83.3732 },
  { name: "Jhansi", state: "Uttar Pradesh", district: "Jhansi", category: "Bundelkhand Central Hub", lat: 25.4484, lng: 78.5685 },
  { name: "Saharanpur", state: "Uttar Pradesh", district: "Saharanpur", category: "Northern UP Hub", lat: 29.9671, lng: 77.5510 },

  { name: "Dehradun (ISBT Dehradun)", state: "Uttarakhand", district: "Dehradun", category: "State Capital / Major Hill ISBT", lat: 30.2862, lng: 77.9997 },
  { name: "Haridwar (Central Bus Stand)", state: "Uttarakhand", district: "Haridwar", category: "Pilgrim Gateway Terminal", lat: 29.9457, lng: 78.1642 },
  { name: "Rishikesh (ISBT Rishikesh)", state: "Uttarakhand", district: "Dehradun", category: "Yoga City / Char Dham Gateway", lat: 30.0869, lng: 78.2676 },
  { name: "Haldwani (ISBT Haldwani)", state: "Uttarakhand", district: "Nainital", category: "Kumaon Gateway Hub", lat: 29.2183, lng: 79.5130 },
  { name: "Nainital", state: "Uttarakhand", district: "Nainital", category: "Hill Station / Tourist Hub", lat: 29.3919, lng: 79.4542 },
  { name: "Mussoorie", state: "Uttarakhand", district: "Dehradun", category: "Hill Station / Tourist Terminal", lat: 30.4598, lng: 78.0644 },
  { name: "Roorkee", state: "Uttarakhand", district: "Haridwar", category: "University / Bus Stand", lat: 29.8543, lng: 77.8880 },

  // ==========================================
  // MADHYA PRADESH & CHHATTISGARH
  // ==========================================
  { name: "Indore (Sarwate / AICTSL Central Bus Terminal)", state: "Madhya Pradesh", district: "Indore", category: "Commercial Capital / Major Transit Hub", lat: 22.7196, lng: 75.8577 },
  { name: "Bhopal (ISBT Habibganj / Nadra)", state: "Madhya Pradesh", district: "Bhopal", category: "State Capital / Central ISBT", lat: 23.2332, lng: 77.4347 },
  { name: "Jabalpur (ISBT Jabalpur)", state: "Madhya Pradesh", district: "Jabalpur", category: "Mahakoshal Hub / Central Stand", lat: 23.1815, lng: 79.9864 },
  { name: "Gwalior (ISBT Gwalior)", state: "Madhya Pradesh", district: "Gwalior", category: "Chambal / North MP Terminal", lat: 26.2183, lng: 78.1828 },
  { name: "Ujjain (Dewas Gate Bus Stand)", state: "Madhya Pradesh", district: "Ujjain", category: "Mahakal Pilgrim Terminal", lat: 23.1765, lng: 75.7885 },
  { name: "Sagar", state: "Madhya Pradesh", district: "Sagar", category: "Bundelkhand Central Stand", lat: 23.8388, lng: 78.7378 },
  { name: "Satna", state: "Madhya Pradesh", district: "Satna", category: "Vindhya Region Hub", lat: 24.5804, lng: 80.8293 },
  { name: "Ratlam", state: "Madhya Pradesh", district: "Ratlam", category: "Railway & Highway Hub", lat: 23.3315, lng: 75.0367 },
  { name: "Rewa", state: "Madhya Pradesh", district: "Rewa", category: "Eastern MP Hub", lat: 24.5362, lng: 81.3037 },

  { name: "Raipur (Sri Balaji ISBT)", state: "Chhattisgarh", district: "Raipur", category: "State Capital / Mega Central ISBT", lat: 21.2514, lng: 81.6296 },
  { name: "Bhilai / Durg", state: "Chhattisgarh", district: "Durg", category: "Industrial Steel Hub / Stand", lat: 21.1938, lng: 81.3509 },
  { name: "Bilaspur (Hi-Tech Bus Stand)", state: "Chhattisgarh", district: "Bilaspur", category: "Judicial Capital / Major Stand", lat: 22.0797, lng: 82.1409 },
  { name: "Korba", state: "Chhattisgarh", district: "Korba", category: "Power City Hub", lat: 22.3595, lng: 82.7501 },
  { name: "Jagdalpur", state: "Chhattisgarh", district: "Bastar", category: "Bastar Region Gateway", lat: 19.0740, lng: 82.0080 },

  // ==========================================
  // WEST BENGAL, BIHAR, ODISHA & JHARKHAND
  // ==========================================
  { name: "Kolkata (Esplanade / Dharmatala Central Stand)", state: "West Bengal", district: "Kolkata", category: "State Capital / Mega Bus Terminal", lat: 22.5630, lng: 88.3516 },
  { name: "Kolkata (Babughat Interstate Stand)", state: "West Bengal", district: "Kolkata", category: "Interstate Riverfront Terminal", lat: 22.5683, lng: 88.3414 },
  { name: "Kolkata (Karunamoyee Salt Lake Terminal)", state: "West Bengal", district: "North 24 Parganas", category: "International & Interstate Hub", lat: 22.5867, lng: 88.4206 },
  { name: "Howrah (Bus Stand / Railway Station)", state: "West Bengal", district: "Howrah", category: "Twin City Mega Transit Hub", lat: 22.5850, lng: 88.3426 },
  { name: "Siliguri (Tenzing Norgay Central Bus Terminal)", state: "West Bengal", district: "Darjeeling", category: "North Bengal & North-East Gateway", lat: 26.7162, lng: 88.4283 },
  { name: "Durgapur (City Centre Bus Terminal)", state: "West Bengal", district: "Paschim Bardhaman", category: "Steel City Major Terminal", lat: 23.5204, lng: 87.3119 },
  { name: "Asansol", state: "West Bengal", district: "Paschim Bardhaman", category: "Industrial Hub / Bus Stand", lat: 23.6739, lng: 86.9524 },
  { name: "Darjeeling", state: "West Bengal", district: "Darjeeling", category: "Queen of Hills / Tourist Hub", lat: 27.0410, lng: 88.2663 },
  { name: "Kharagpur", state: "West Bengal", district: "Paschim Medinipur", category: "Major Junction Stand", lat: 22.3460, lng: 87.2320 },
  { name: "Digha", state: "West Bengal", district: "Purba Medinipur", category: "Beach Tourist Bus Terminal", lat: 21.6266, lng: 87.5074 },

  { name: "Patna (Patliputra ISBT Bairiya)", state: "Bihar", district: "Patna", category: "State Capital / Mega Modern ISBT", lat: 25.5687, lng: 85.1970 },
  { name: "Patna (Gandhi Maidan Bus Stand)", state: "Bihar", district: "Patna", category: "City Central Bus Stand", lat: 25.6186, lng: 85.1450 },
  { name: "Gaya (Central Bus Stand)", state: "Bihar", district: "Gaya", category: "Bodhgaya Pilgrim Hub / Terminal", lat: 24.7914, lng: 85.0002 },
  { name: "Bodh Gaya", state: "Bihar", district: "Gaya", category: "World Buddhist Heritage Hub", lat: 24.6961, lng: 84.9869 },
  { name: "Bhagalpur", state: "Bihar", district: "Bhagalpur", category: "Silk City Central Stand", lat: 25.2425, lng: 86.9842 },
  { name: "Muzaffarpur (Bairia Bus Stand)", state: "Bihar", district: "Muzaffarpur", category: "North Bihar Major Terminal", lat: 26.1209, lng: 85.3647 },
  { name: "Darbhanga", state: "Bihar", district: "Darbhanga", category: "Mithila Region Central Stand", lat: 26.1542, lng: 85.8918 },
  { name: "Purnia", state: "Bihar", district: "Purnia", category: "Seemanchal Regional Hub", lat: 25.7771, lng: 87.4753 },

  { name: "Bhubaneswar (Baramunda ISBT)", state: "Odisha", district: "Khurda", category: "State Capital / Mega Modern ISBT", lat: 20.2763, lng: 85.7942 },
  { name: "Cuttack (Netaji Subhas Chandra Bose Bus Terminal / Badambadi)", state: "Odisha", district: "Cuttack", category: "Millennium City Central Terminal", lat: 20.4547, lng: 85.8758 },
  { name: "Puri (Central Bus Stand)", state: "Odisha", district: "Puri", category: "Jagannath Dham Pilgrim Terminal", lat: 19.8135, lng: 85.8312 },
  { name: "Rourkela", state: "Odisha", district: "Sundargarh", category: "Steel City Major Stand", lat: 22.2604, lng: 84.8536 },
  { name: "Sambalpur (Ainthapali Bus Stand)", state: "Odisha", district: "Sambalpur", category: "Western Odisha Central Hub", lat: 21.4669, lng: 83.9812 },
  { name: "Berhampur (New Bus Stand)", state: "Odisha", district: "Ganjam", category: "South Odisha Commercial Stand", lat: 19.3149, lng: 84.7941 },

  { name: "Ranchi (Khadgara / Birsa Munda ISBT)", state: "Jharkhand", district: "Ranchi", category: "State Capital / Central ISBT", lat: 23.3648, lng: 85.3458 },
  { name: "Jamshedpur (Sitaramdera Bus Stand)", state: "Jharkhand", district: "East Singhbhum", category: "Steel City Central Terminal", lat: 22.8046, lng: 86.2029 },
  { name: "Dhanbad (Bartand Bus Stand)", state: "Jharkhand", district: "Dhanbad", category: "Coal Capital Central Stand", lat: 23.7957, lng: 86.4304 },
  { name: "Deoghar", state: "Jharkhand", district: "Deoghar", category: "Baidyanath Dham Pilgrim Hub", lat: 24.4826, lng: 86.7001 },
  { name: "Bokaro Steel City", state: "Jharkhand", district: "Bokaro", category: "Steel Hub", lat: 23.6693, lng: 86.1511 },

  // ==========================================
  // PUNJAB, HARYANA, HIMACHAL, CHANDIGARH, J&K
  // ==========================================
  { name: "Chandigarh (ISBT Sector 17)", state: "Chandigarh", district: "Chandigarh", category: "Union Territory / Central ISBT", lat: 30.7398, lng: 76.7827 },
  { name: "Chandigarh (ISBT Sector 43)", state: "Chandigarh", district: "Chandigarh", category: "Major Interstate Bus Terminal", lat: 30.7247, lng: 76.7461 },
  { name: "Ludhiana (Central Bus Stand)", state: "Punjab", district: "Ludhiana", category: "Major Industrial / PRTC Terminal", lat: 30.9010, lng: 75.8573 },
  { name: "Amritsar (ISBT Amritsar / Shahid Madan Lal Dhingra)", state: "Punjab", district: "Amritsar", category: "Golden Temple Pilgrim / Mega ISBT", lat: 31.6340, lng: 74.8723 },
  { name: "Jalandhar (Shaheed-e-Azam Bhagat Singh ISBT)", state: "Punjab", district: "Jalandhar", category: "Doaba Central ISBT", lat: 31.3260, lng: 75.5762 },
  { name: "Patiala (New ISBT Patiala)", state: "Punjab", district: "Patiala", category: "Royal City Modern ISBT", lat: 30.3398, lng: 76.3869 },
  { name: "Bathinda", state: "Punjab", district: "Bathinda", category: "Malwa Central Stand", lat: 30.2110, lng: 74.9455 },
  { name: "Mohali (SAS Nagar)", state: "Punjab", district: "Mohali", category: "Tri-City Hub", lat: 30.7046, lng: 76.7179 },

  { name: "Ambala (Cantonment Central Bus Stand)", state: "Haryana", district: "Ambala", category: "Grand Trunk Junction Stand", lat: 30.3353, lng: 76.8378 },
  { name: "Panipat", state: "Haryana", district: "Panipat", category: "Textile City / GT Road Hub", lat: 29.3909, lng: 76.9635 },
  { name: "Karnal", state: "Haryana", district: "Karnal", category: "Smart City / GT Road Stand", lat: 29.6857, lng: 76.9905 },
  { name: "Rohtak", state: "Haryana", district: "Rohtak", category: "Major Haryana Terminal", lat: 28.8955, lng: 76.6066 },
  { name: "Hisar", state: "Haryana", district: "Hisar", category: "Western Haryana Central Stand", lat: 29.1492, lng: 75.7217 },

  { name: "Shimla (ISBT Tutikandi)", state: "Himachal Pradesh", district: "Shimla", category: "State Capital / Mega Hill ISBT", lat: 31.0967, lng: 77.1552 },
  { name: "Manali (Central Bus Stand)", state: "Himachal Pradesh", district: "Kullu", category: "Tourist / Himalayan Terminal", lat: 32.2432, lng: 77.1892 },
  { name: "Dharamshala / McLeod Ganj", state: "Himachal Pradesh", district: "Kangra", category: "Tibetan Cultural & Tourist Hub", lat: 32.2190, lng: 76.3234 },
  { name: "Kullu", state: "Himachal Pradesh", district: "Kullu", category: "Valley Central Stand", lat: 31.9579, lng: 77.1095 },
  { name: "Solan", state: "Himachal Pradesh", district: "Solan", category: "Mushroom City / Highway Stand", lat: 30.9084, lng: 77.0999 },

  { name: "Srinagar (TRC / Batamaloo / Pantha Chowk)", state: "Jammu and Kashmir", district: "Srinagar", category: "Summer Capital / Central Terminal", lat: 34.0837, lng: 74.7973 },
  { name: "Jammu (General Bus Stand / BC Road)", state: "Jammu and Kashmir", district: "Jammu", category: "Winter Capital / Major ISBT", lat: 32.7266, lng: 74.8570 },
  { name: "Katra (Vaishno Devi Bus Stand)", state: "Jammu and Kashmir", district: "Reasi", category: "Mega Pilgrim Bus Terminal", lat: 32.9916, lng: 74.9317 },
  { name: "Leh (Central Bus Stand)", state: "Ladakh", district: "Leh", category: "Ladakh Capital / High Altitude Hub", lat: 34.1526, lng: 77.5771 },

  // ==========================================
  // GOA & UNION TERRITORIES
  // ==========================================
  { name: "Panaji (Kadamba Central Bus Terminus)", state: "Goa", district: "North Goa", category: "State Capital / Central Bus Terminal", lat: 15.4989, lng: 73.8278 },
  { name: "Margao (KTC Bus Stand)", state: "Goa", district: "South Goa", category: "South Goa Central Terminal", lat: 15.2832, lng: 73.9862 },
  { name: "Vasco da Gama", state: "Goa", district: "South Goa", category: "Port City Bus Stand", lat: 15.3982, lng: 73.8113 },
  { name: "Mapusa", state: "Goa", district: "North Goa", category: "North Market Bus Stand", lat: 15.5929, lng: 73.8142 },
  { name: "Calangute", state: "Goa", district: "North Goa", category: "Beach Tourist Stand", lat: 15.5440, lng: 73.7554 },

  { name: "Puducherry (Pondicherry New Bus Stand)", state: "Puducherry", district: "Puducherry", category: "Union Territory / Central Stand", lat: 11.9340, lng: 79.8083 },
  { name: "Port Blair", state: "Andaman and Nicobar Islands", district: "South Andaman", category: "Islands Capital Terminal", lat: 11.6234, lng: 92.7265 },
  { name: "Daman", state: "Dadra and Nagar Haveli and Daman and Diu", district: "Daman", category: "UT Coastal Hub", lat: 20.3974, lng: 72.8328 },
  { name: "Silvassa", state: "Dadra and Nagar Haveli and Daman and Diu", district: "Dadra and Nagar Haveli", category: "UT Capital Stand", lat: 20.2763, lng: 73.0083 },

  // ==========================================
  // NORTH EAST INDIA
  // ==========================================
  { name: "Guwahati (ISBT Betkuchi / Paltan Bazaar)", state: "Assam", district: "Kamrup Metropolitan", category: "North East Mega Transit Hub", lat: 26.1158, lng: 91.7347 },
  { name: "Silchar", state: "Assam", district: "Cachar", category: "Barak Valley Central Stand", lat: 24.8333, lng: 92.7789 },
  { name: "Dibrugarh", state: "Assam", district: "Dibrugarh", category: "Tea City Central Stand", lat: 27.4728, lng: 94.9120 },
  { name: "Jorhat", state: "Assam", district: "Jorhat", category: "Upper Assam Hub", lat: 26.7509, lng: 94.2037 },
  { name: "Tezpur", state: "Assam", district: "Sonitpur", category: "Historic Stand", lat: 26.6338, lng: 92.7926 },
  { name: "Shillong (ISBT Mawiong)", state: "Meghalaya", district: "East Khasi Hills", category: "State Capital / Hill Terminal", lat: 25.5788, lng: 91.8933 },
  { name: "Agartala (ISBT Chandrapur)", state: "Tripura", district: "West Tripura", category: "State Capital / Central ISBT", lat: 23.8315, lng: 91.2868 },
  { name: "Imphal (ISBT Khuman Lampak)", state: "Manipur", district: "Imphal West", category: "State Capital / Central ISBT", lat: 24.8170, lng: 93.9368 },
  { name: "Aizawl (ISBT Chaltlang / Thuampui)", state: "Mizoram", district: "Aizawl", category: "State Capital / Central ISBT", lat: 23.7307, lng: 92.7173 },
  { name: "Kohima (ISBT Kohima)", state: "Nagaland", district: "Kohima", category: "State Capital / Hill Terminal", lat: 25.6751, lng: 94.1086 },
  { name: "Dimapur (NST Bus Station)", state: "Nagaland", district: "Dimapur", category: "Commercial Gateway Terminal", lat: 25.9094, lng: 93.7266 },
  { name: "Gangtok (SNT Bus Stand)", state: "Sikkim", district: "East Sikkim", category: "State Capital / Mountain Hub", lat: 27.3314, lng: 88.6138 },
  { name: "Itanagar (ISBT Nirjuli / Naharlagun)", state: "Arunachal Pradesh", district: "Papum Pare", category: "State Capital / Regional Hub", lat: 27.0844, lng: 93.6053 },
];

// Helper to quickly search and get places across all of India
export const getIndiaTransitPlaceSuggestions = async (inputQuery) => {
  if (!inputQuery || inputQuery.trim().length === 0) {
    // Return a curated selection of top transit hubs across India
    return INDIA_ALL_PLACES.slice(0, 15).map((p) => ({
      name: p.name,
      fullName: `${p.name}, ${p.district || p.state}, ${p.state}, India`,
      lat: p.lat,
      lng: p.lng,
      category: p.category,
      district: p.district,
      state: p.state,
    }));
  }

  const q = inputQuery.trim().toLowerCase();
  const cleanQ = q.replace(/[-\s,()]/g, "");

  // 1. Instant in-memory search (0ms delay) matching name, district, state, category
  const localMatches = INDIA_ALL_PLACES.filter((p) => {
    const name = p.name.toLowerCase().replace(/[-\s,()]/g, "");
    const district = (p.district || "").toLowerCase().replace(/[-\s,()]/g, "");
    const state = (p.state || "").toLowerCase().replace(/[-\s,()]/g, "");
    const category = (p.category || "").toLowerCase().replace(/[-\s,()]/g, "");
    return (
      name.includes(cleanQ) ||
      district.includes(cleanQ) ||
      state.includes(cleanQ) ||
      category.includes(cleanQ) ||
      cleanQ.includes(name)
    );
  }).map((p) => ({
    name: p.name,
    fullName: `${p.name}, ${p.district ? p.district + ", " : ""}${p.state}, India`,
    lat: p.lat,
    lng: p.lng,
    category: p.category,
    district: p.district,
    state: p.state,
  }));

  // 2. Fetch Nominatim matches asynchronously for any village, town, or landmark in India
  let remoteMatches = [];
  if (q.length >= 2) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1100);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&addressdetails=1&limit=8`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "Accept-Language": "en" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        remoteMatches = data.map((item) => {
          const addr = item.address || {};
          const cityOrTown = addr.city || addr.town || addr.village || addr.suburb || addr.county || item.display_name.split(",")[0];
          const state = addr.state || "India";
          const district = addr.state_district || addr.county || "";
          return {
            name: cityOrTown.trim(),
            fullName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            category: item.type === "bus_stop" || item.type === "bus_station" ? "Bus Stop / Station" : "Map Location",
            district: district,
            state: state,
          };
        });
      }
    } catch {
      // Graceful fallback to local dataset
    }
  }

  // Combine results without duplicate coordinates or names
  const combined = [...localMatches];
  remoteMatches.forEach((rm) => {
    const isDup = combined.some((c) => {
      const nameMatch = c.name.toLowerCase() === rm.name.toLowerCase();
      const dist = Math.sqrt(Math.pow(c.lat - rm.lat, 2) + Math.pow(c.lng - rm.lng, 2));
      return nameMatch || dist < 0.05;
    });
    if (!isDup) {
      combined.push(rm);
    }
  });

  return combined.slice(0, 16);
};
