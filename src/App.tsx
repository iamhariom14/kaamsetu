import { useState, useRef, useEffect } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";

// If a photo (e.g. from Unsplash) fails to load, swap it for a reliable
// placeholder instead of showing a broken-image icon.
function categoryImgFallback(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/450`;
}
function personImgFallback(name: string, bg: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg.replace("#", "")}&color=fff&size=256&bold=true`;
}
function handleImgError(
  e: React.SyntheticEvent<HTMLImageElement>,
  fallback: string
) {
  const img = e.currentTarget;
  img.onerror = null; // prevent loop if the fallback also fails
  img.src = fallback;
}

const serviceCategories = [
  { id: "cleaning",        label: "Cleaning",         icon: "🧹", count: 412, color: "#E8F4F1", photo: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=450&fit=crop&auto=format" },
  { id: "plumbing",        label: "Plumbing",          icon: "🔧", count: 187, color: "#FEF3EB", photo: "https://images.unsplash.com/photo-1607472829760-9a3494b8e59d?w=600&h=450&fit=crop&auto=format" },
  { id: "carpentry",       label: "Carpentry",         icon: "🪚", count: 134, color: "#FDF4E7", photo: "https://images.unsplash.com/photo-1601058268499-e52e2e2a8e77?w=600&h=450&fit=crop&auto=format" },
  { id: "painting",        label: "Painting",          icon: "🖌️", count: 156, color: "#F0ECF8", photo: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=450&fit=crop&auto=format" },
  { id: "domestic",        label: "Domestic Help",     icon: "🏠", count: 321, color: "#E8F4F1", photo: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=600&h=450&fit=crop&auto=format" },
  { id: "caregiver",       label: "Caregiver",         icon: "🤝", count: 198, color: "#FEF3EB", photo: "https://images.unsplash.com/photo-1576765607924-3f7b1e1b3d0f?w=600&h=450&fit=crop&auto=format" },
  { id: "driver",          label: "Driver",            icon: "🚗", count: 267, color: "#FDF4E7", photo: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=450&fit=crop&auto=format" },
  { id: "gardening",       label: "Gardening",         icon: "🌿", count: 143, color: "#E8F4F1", photo: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=450&fit=crop&auto=format" },
  { id: "electrician",     label: "Electrician",       icon: "⚡", count: 176, color: "#FFFBE6", photo: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=450&fit=crop&auto=format" },
  { id: "technician",      label: "Technician",        icon: "🔩", count: 211, color: "#F0ECF8", photo: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=450&fit=crop&auto=format" },
];

const filterCategories = [
  { id: "all", label: "All" },
  ...serviceCategories,
];

// Cooperative Federation Administration — the umbrella federation oversees
// several local worker cooperatives; this seed data stands in for what a
// federation-wide admin dashboard would pull from each branch's own books.
const federationBranches = [
  { id: "delhi-central", name: "Delhi Central Co-operative", city: "Delhi", members: 812, activeMembers: 634, monthlyRevenue: 1840000, foundedYear: 2019 },
  { id: "noida", name: "Noida Workers' Co-operative", city: "Noida", members: 245, activeMembers: 190, monthlyRevenue: 512000, foundedYear: 2021 },
  { id: "gurugram", name: "Gurugram Seva Co-operative", city: "Gurugram", members: 198, activeMembers: 151, monthlyRevenue: 447000, foundedYear: 2022 },
];

const workers = [
  // Cleaning
  {
    id: 1, name: "Meena Sharma", role: "House Cleaner", category: "cleaning",
    rating: 4.9, reviews: 127, experience: 11, hourlyRate: 280, location: "Rajouri Garden, Delhi",
    tags: ["Deep Clean", "Move-in/out", "Weekly"],
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
  {
    id: 11, name: "Kavita Rawat", role: "Professional Cleaner", category: "cleaning",
    rating: 4.8, reviews: 95, experience: 9, hourlyRate: 260, location: "Janakpuri, Delhi",
    tags: ["Bathroom Deep Clean", "Kitchen", "Office"],
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
  // Plumbing
  {
    id: 2, name: "Rajan Verma", role: "Master Plumber", category: "plumbing",
    rating: 4.8, reviews: 89, experience: 9, hourlyRate: 420, location: "Lajpat Nagar, Delhi",
    tags: ["Leak Repair", "Pipe Fitting", "Emergency"],
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: false,
  },
  {
    id: 12, name: "Santosh Yadav", role: "Plumbing Specialist", category: "plumbing",
    rating: 4.7, reviews: 61, experience: 11, hourlyRate: 390, location: "Patel Nagar, Delhi",
    tags: ["Bathroom Fitting", "Water Heater", "Tank Repair"],
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
  // Carpentry
  {
    id: 3, name: "Ramesh Mistri", role: "Master Carpenter", category: "carpentry",
    rating: 4.85, reviews: 74, experience: 8, hourlyRate: 480, location: "Kirti Nagar, Delhi",
    tags: ["Furniture Repair", "Custom Cabinets", "Doors & Windows"],
    image: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
  {
    id: 13, name: "Dinesh Carpenter", role: "Furniture Craftsman", category: "carpentry",
    rating: 4.9, reviews: 52, experience: 5, hourlyRate: 520, location: "Sadar Bazaar, Delhi",
    tags: ["Modular Kitchen", "Wardrobe", "Wood Polish"],
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=300&h=300&fit=crop&auto=format",
    available: false, cooperative: true,
  },
  // Painting
  {
    id: 4, name: "Suresh Painter", role: "Wall Painter", category: "painting",
    rating: 4.75, reviews: 88, experience: 3, hourlyRate: 350, location: "Uttam Nagar, Delhi",
    tags: ["Interior", "Exterior", "Texture Painting"],
    image: "https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: false,
  },
  {
    id: 14, name: "Anwar Khan", role: "Decorative Painter", category: "painting",
    rating: 4.8, reviews: 63, experience: 8, hourlyRate: 400, location: "Okhla, Delhi",
    tags: ["Wall Art", "POP Work", "Waterproofing"],
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
  // Domestic Help
  {
    id: 5, name: "Geeta Devi", role: "Domestic Helper", category: "domestic",
    rating: 4.9, reviews: 183, experience: 2, hourlyRate: 240, location: "Saket, Delhi",
    tags: ["Daily Chores", "Utensil Washing", "Cooking Help"],
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
  {
    id: 15, name: "Radha Kumari", role: "Full-time Maid", category: "domestic",
    rating: 4.85, reviews: 141, experience: 12, hourlyRate: 220, location: "Dwarka, Delhi",
    tags: ["Mopping", "Laundry", "Grocery Help"],
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
  // Caregiver
  {
    id: 6, name: "Priya Nair", role: "Child Caregiver", category: "caregiver",
    rating: 4.95, reviews: 156, experience: 11, hourlyRate: 380, location: "Malviya Nagar, Delhi",
    tags: ["Infants", "After School", "Homework Help"],
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: false,
  },
  {
    id: 16, name: "Shakuntala Singh", role: "Elder Care Specialist", category: "caregiver",
    rating: 4.9, reviews: 102, experience: 9, hourlyRate: 420, location: "Vasant Kunj, Delhi",
    tags: ["Senior Care", "Medication Help", "Physiotherapy Aid"],
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&auto=format",
    available: false, cooperative: true,
  },
  // Driver
  {
    id: 7, name: "Mohd. Salim", role: "Personal Driver", category: "driver",
    rating: 4.8, reviews: 134, experience: 3, hourlyRate: 300, location: "Mayur Vihar, Delhi",
    tags: ["Daily Commute", "Airport Drop", "Outstation"],
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
  {
    id: 17, name: "Deepak Chauffeur", role: "Verified Driver", category: "driver",
    rating: 4.75, reviews: 89, experience: 10, hourlyRate: 280, location: "Noida Sector 62",
    tags: ["Night Duty", "School Pickup", "Corporate"],
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: false,
  },
  // Gardening
  {
    id: 8, name: "Hari Mohan", role: "Gardener & Landscaper", category: "gardening",
    rating: 4.7, reviews: 64, experience: 2, hourlyRate: 320, location: "Dwarka, Delhi",
    tags: ["Kitchen Garden", "Lawn Care", "Terrace"],
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
  {
    id: 18, name: "Shyam Maalii", role: "Plant Care Expert", category: "gardening",
    rating: 4.85, reviews: 47, experience: 4, hourlyRate: 290, location: "Rohini, Delhi",
    tags: ["Indoor Plants", "Pruning", "Pest Control"],
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
  // Electrician
  {
    id: 9, name: "Ajay Kumar", role: "Electrician", category: "electrician",
    rating: 4.85, reviews: 112, experience: 9, hourlyRate: 450, location: "Rohini, Delhi",
    tags: ["Wiring", "Appliance Repair", "Solar Setup"],
    image: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
  {
    id: 19, name: "Vijay Electricals", role: "Master Electrician", category: "electrician",
    rating: 4.9, reviews: 87, experience: 3, hourlyRate: 480, location: "Pitampura, Delhi",
    tags: ["MCB Panel", "AC Installation", "CCTV Wiring"],
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&auto=format",
    available: false, cooperative: true,
  },
  // Technician
  {
    id: 10, name: "Rakesh Technician", role: "Home Appliance Tech", category: "technician",
    rating: 4.8, reviews: 98, experience: 9, hourlyRate: 400, location: "Laxmi Nagar, Delhi",
    tags: ["AC Repair", "Washing Machine", "Refrigerator"],
    image: "https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: false,
  },
  {
    id: 20, name: "Pankaj IT Tech", role: "Computer & TV Technician", category: "technician",
    rating: 4.7, reviews: 73, experience: 3, hourlyRate: 380, location: "Nehru Place, Delhi",
    tags: ["Laptop Repair", "Smart TV Setup", "WiFi Setup"],
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&auto=format",
    available: true, cooperative: true,
  },
];

const testimonials = [
  {
    name: "Ananya Gupta", location: "Sector 18, Noida",
    text: "Meena has been cleaning our home for 8 months. She is thorough, trustworthy and punctual. The cooperative model means she keeps fair wages — I feel good booking here.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format",
    service: "House Cleaning",
  },
  {
    name: "Vikram Singh", location: "Lajpat Nagar, Delhi",
    text: "Rajan fixed our burst pipe at 10pm on a Sunday. Honest pricing, no surprise charges. The platform held him accountable and he was incredible.",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&auto=format",
    service: "Plumbing",
  },
  {
    name: "Deepa Menon", location: "Vasant Vihar, Delhi",
    text: "Shakuntala has been caring for my father-in-law for 3 months. Her patience and expertise have been a true blessing for our entire family.",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&auto=format",
    service: "Elder Caregiver",
  },
];

const howItWorks = [
  { step: "01", title: "Browse & Filter", desc: "Search verified local workers by service, location, and availability. Every profile is community-reviewed.", icon: "🔍" },
  { step: "02", title: "Book Directly", desc: "Schedule a visit, agree on scope and price — no hidden fees or platform markups eating worker earnings.", icon: "📅" },
  { step: "03", title: "Service & Pay", desc: "Worker shows up, job gets done. Pay securely through the platform. Workers keep 90% of every booking.", icon: "✓" },
  { step: "04", title: "Review & Build Trust", desc: "Leave a review to help your community. Great reviews unlock cooperative benefits for top workers.", icon: "★" },
];

const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"];

type Worker = Omit<(typeof workers)[number], "id"> & { id: number | string; verified?: boolean };

// Builds a searchable Worker profile out of a name/category/experience —
// used for workers who register through "Join as Worker" or worker sign-up
// (their full profile lives in Firestore; this is just enough to list them
// in search results and worker cards).
function buildCommunityWorker(id: number | string, name: string, categoryId: string, experience: number, verified = true): Worker {
  const cat = serviceCategories.find((c) => c.id === categoryId);
  return {
    id,
    name: name || "Cooperative Worker",
    role: cat ? cat.label : "Cooperative Worker",
    category: categoryId || "domestic",
    rating: 0,
    reviews: 0,
    experience: experience || 0,
    hourlyRate: 0,
    location: "",
    tags: ["New member"],
    image: personImgFallback(name || "Worker", "1B6B5E"),
    available: true,
    cooperative: true,
    verified,
  };
}

// Digital worker verification — a worker's static/seed profile counts as
// already verified (they're existing cooperative members); newly joined
// workers start unverified until the check below passes.
function isVerified(w: Worker) {
  return w.verified !== false;
}

// AI-Powered Fair Match — a lightweight scoring model that ranks workers by
// rating, review volume, real-time availability, experience, cooperative
// membership and relevance to the customer's search query. Stands in for a
// full ML ranking model for demo purposes.
function computeMatchScore(w: Worker, query: string): number {
  let score = 0;
  score += (w.rating || 0) * 10; // up to ~50
  score += Math.min(w.reviews || 0, 200) / 10; // up to 20
  score += w.available ? 15 : 0;
  score += Math.min(w.experience || 0, 15); // up to 15
  score += w.cooperative ? 5 : 0;
  score += isVerified(w) ? 5 : 0;
  const q = query.trim().toLowerCase();
  if (q) {
    if (w.name.toLowerCase().includes(q)) score += 12;
    if (w.role.toLowerCase().includes(q)) score += 8;
    if (w.tags?.some((tag) => tag.toLowerCase().includes(q))) score += 6;
  }
  return Math.round(score);
}
type ChatMessage = { sender: "bot" | "user"; text: string };

// A booking request as seen from the worker side, and a notification that
// either the worker or the customer can receive. In a real backend these
// would be pushed from the server per-user; here they're simulated
// client-side against the single signed-in session.
type WorkerRequest = {
  id: string;
  customerName: string;
  workerName: string;
  service: string;
  category: string;
  date: string;
  time: string;
  address: string;
  rate: string;
  status: "pending" | "accepted" | "rejected";
  etaMinutes?: number;
  paymentMethod?: string;
  customerRating?: number;
};
type AppNotification = { id: string; text: string; time: string; forRole: "customer" | "worker" };

type Lang = "en" | "hi";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    services: "Services",
    howItWorks: "How it Works",
    workers: "Workers",
    stories: "Stories",
    joinAsWorker: "Join as Worker",
    signIn: "Sign In",
    signInCustomerNav: "Sign in as Customer",
    signOut: "Sign Out",
    workHistory: "Work History",
    language: "Language",
    notifications: "Notifications",
    noNotifications: "No notifications yet.",
    dashboard: "Dashboard",
    incomingRequests: "Incoming Requests",
    accept: "Accept",
    reject: "Reject",
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Declined",
    jobsCompleted: "Jobs completed",
    totalEarnings: "Total earnings",
    signInAsCustomer: "Customer",
    signInAsWorker: "Worker",
    continueWithGoogle: "Continue with Google",
    orEmail: "or use email",
    email: "Email address",
    password: "Password",
    fullName: "Full name",
    alreadyHaveAccount: "Already have an account? Sign in",
    needAccount: "New here? Create an account",
    signInBtn: "Sign In",
    signUpBtn: "Sign Up",

    // Customer / Worker / Federation tri-toggle
    customerTab: "Customer",
    workerTab: "Worker",
    federationTab: "Federation",

    // Post-login greeting
    namaste: "Namaste",
    whatDoYouNeed: "What do you need help with today?",

    // Sign-in modal
    welcomeBack: "Welcome back",
    welcomeExclaim: "Welcome!",
    logInToAccount: "Log in to your account",
    logInAsWorker: "Log in to your worker account",
    createCustomerAccount: "Create your customer account",
    createWorkerAccount: "Create your worker account",
    forgotPassword: "Forgot password?",
    forgotPasswordHint: "Please contact cooperative support to reset your password.",

    // Federation Admin portal
    adminPortal: "Federation Admin",
    exitAdminPortal: "Exit admin portal",
    adminPortalSubtitle: "Cross-cooperative oversight for the Kaamsetu federation",
    adminOverview: "Overview",
    adminVerification: "Verifications",
    adminBookingsDemand: "Bookings & Demand",
    memberCooperatives: "Member cooperatives",
    totalWorkerMembers: "Total worker-members",
    activeThisMonth: "Active this month",
    combinedMonthlyRevenue: "Combined monthly revenue",
    branches: "Branches",
    founded: "Founded",
    members: "Members",
    active: "Active",
    monthlyRevenue: "Monthly revenue",
    activeMembership: "active membership",
    verificationQueueDesc: "Digital verification queue — approve or reject workers who applied via \"Join the Cooperative\".",
    queueClear: "No pending verifications. All caught up! ✓",
    yrsExperience: "yrs experience",
    totalPlatformBookings: "Total platform bookings",
    grossBookingValue: "Gross booking value tracked",
    demandForecastTitle: "AI Workforce Intelligence — demand by category",
    requests: "requests",
    workersOnPlatform: "workers on the platform",
    demand: "DEMAND",

    // Hero
    heroTag: "Worker-Owned Cooperative",
    heroHeadline1: "Services that",
    heroHeadlineEm: "uplift",
    heroHeadline2: "your community.",
    heroSubtext: "Book trusted local workers for household and community services. Fair wages, no middlemen — every booking strengthens the cooperative.",
    findAService: "Find a Service",
    becomeAMember: "Become a Member →",
    statVerifiedWorkers: "Verified workers",
    statBookingsDone: "Bookings done",
    statEarningsKept: "Earnings kept",

    // How it works / AI intelligence section
    simpleProcess: "Simple process",
    howKaamsetuWorks: "How Kaamsetu works",
    cooperativeInsights: "Cooperative insights",
    aiWorkforceIntelligence: "AI Workforce Intelligence",
    aiWorkforceIntelligenceDesc: "Live demand forecasting across service categories — the cooperative uses this to decide where to onboard more worker-members.",

    // Footer
    footerTagline: "A worker-owned platform for fair household and community services.",
    footerServices: "Services",
    footerCooperative: "Cooperative",
    footerSupport: "Support",
    footerCopyright: "© 2026 Kaamsetu Cooperative. Worker-owned & operated.",
    installApp: "Install App",
  },
  hi: {
    services: "सेवाएं",
    howItWorks: "यह कैसे काम करता है",
    workers: "कामगार",
    stories: "कहानियां",
    joinAsWorker: "कामगार के रूप में जुड़ें",
    signIn: "साइन इन करें",
    signInCustomerNav: "ग्राहक के रूप में साइन इन करें",
    signOut: "साइन आउट करें",
    workHistory: "कार्य इतिहास",
    language: "भाषा",
    notifications: "सूचनाएं",
    noNotifications: "अभी कोई सूचना नहीं है।",
    dashboard: "डैशबोर्ड",
    incomingRequests: "आने वाले अनुरोध",
    accept: "स्वीकार करें",
    reject: "अस्वीकार करें",
    pending: "लंबित",
    accepted: "स्वीकृत",
    rejected: "अस्वीकृत",
    jobsCompleted: "पूरे किए गए काम",
    totalEarnings: "कुल कमाई",
    signInAsCustomer: "ग्राहक",
    signInAsWorker: "कामगार",
    continueWithGoogle: "Google से जारी रखें",
    orEmail: "या ईमेल का उपयोग करें",
    email: "ईमेल पता",
    password: "पासवर्ड",
    fullName: "पूरा नाम",
    alreadyHaveAccount: "पहले से खाता है? साइन इन करें",
    needAccount: "नए हैं? खाता बनाएं",
    signInBtn: "साइन इन करें",
    signUpBtn: "साइन अप करें",

    // Customer / Worker / Federation tri-toggle
    customerTab: "ग्राहक",
    workerTab: "कामगार",
    federationTab: "फेडरेशन",

    // Post-login greeting
    namaste: "नमस्ते",
    whatDoYouNeed: "आज आपको किस काम में मदद चाहिए?",

    // Sign-in modal
    welcomeBack: "वापसी पर स्वागत है",
    welcomeExclaim: "स्वागत है!",
    logInToAccount: "अपने खाते में लॉग इन करें",
    logInAsWorker: "अपने कामगार खाते में लॉग इन करें",
    createCustomerAccount: "अपना ग्राहक खाता बनाएं",
    createWorkerAccount: "अपना कामगार खाता बनाएं",
    forgotPassword: "पासवर्ड भूल गए?",
    forgotPasswordHint: "कृपया अपना पासवर्ड रीसेट करने के लिए सहकारी सहायता से संपर्क करें।",

    // Federation Admin portal
    adminPortal: "फेडरेशन एडमिन",
    exitAdminPortal: "एडमिन पोर्टल से बाहर निकलें",
    adminPortalSubtitle: "कामसेतु फेडरेशन के लिए क्रॉस-कोऑपरेटिव निगरानी",
    adminOverview: "अवलोकन",
    adminVerification: "सत्यापन",
    adminBookingsDemand: "बुकिंग व मांग",
    memberCooperatives: "सदस्य सहकारी समितियां",
    totalWorkerMembers: "कुल कामगार-सदस्य",
    activeThisMonth: "इस महीने सक्रिय",
    combinedMonthlyRevenue: "संयुक्त मासिक राजस्व",
    branches: "शाखाएं",
    founded: "स्थापना",
    members: "सदस्य",
    active: "सक्रिय",
    monthlyRevenue: "मासिक राजस्व",
    activeMembership: "सक्रिय सदस्यता",
    verificationQueueDesc: "डिजिटल सत्यापन कतार — \"कोऑपरेटिव से जुड़ें\" के ज़रिए आवेदन करने वाले कामगारों को स्वीकृत या अस्वीकृत करें।",
    queueClear: "कोई लंबित सत्यापन नहीं है। सब पूरा हो गया! ✓",
    yrsExperience: "साल का अनुभव",
    totalPlatformBookings: "कुल प्लेटफ़ॉर्म बुकिंग",
    grossBookingValue: "कुल दर्ज बुकिंग मूल्य",
    demandForecastTitle: "एआई वर्कफोर्स इंटेलिजेंस — श्रेणी अनुसार मांग",
    requests: "अनुरोध",
    workersOnPlatform: "कामगार प्लेटफ़ॉर्म पर",
    demand: "मांग",

    // Hero
    heroTag: "कामगार-स्वामित्व वाली सहकारी समिति",
    heroHeadline1: "ऐसी सेवाएं जो",
    heroHeadlineEm: "बेहतर बनाएं",
    heroHeadline2: "आपके समुदाय को।",
    heroSubtext: "घरेलू और सामुदायिक सेवाओं के लिए भरोसेमंद स्थानीय कामगारों को बुक करें। उचित मज़दूरी, कोई बिचौलिया नहीं — हर बुकिंग सहकारी समिति को मज़बूत बनाती है।",
    findAService: "सेवा खोजें",
    becomeAMember: "सदस्य बनें →",
    statVerifiedWorkers: "सत्यापित कामगार",
    statBookingsDone: "पूरी हुई बुकिंग",
    statEarningsKept: "बचाई गई कमाई",

    // How it works / AI intelligence section
    simpleProcess: "सरल प्रक्रिया",
    howKaamsetuWorks: "कामसेतु कैसे काम करता है",
    cooperativeInsights: "सहकारी अंतर्दृष्टि",
    aiWorkforceIntelligence: "एआई वर्कफोर्स इंटेलिजेंस",
    aiWorkforceIntelligenceDesc: "सेवा श्रेणियों में लाइव मांग पूर्वानुमान — सहकारी समिति इसका उपयोग यह तय करने के लिए करती है कि और कामगार-सदस्यों को कहां शामिल किया जाए।",

    // Footer
    footerTagline: "उचित घरेलू और सामुदायिक सेवाओं के लिए एक कामगार-स्वामित्व वाला प्लेटफ़ॉर्म।",
    footerServices: "सेवाएं",
    footerCooperative: "सहकारी समिति",
    footerSupport: "सहायता",
    footerCopyright: "© 2026 कामसेतु सहकारी समिति। कामगारों के स्वामित्व व संचालन में।",
    installApp: "ऐप इंस्टॉल करें",
  },
};

const chatQuickReplies = ["Track my booking", "File a complaint", "Give feedback", "Payment issue", "Talk to a human"];

function getBotReply(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("track") || m.includes("status")) {
    return "You can track your booking status anytime from 'My Bookings'. Your worker will also message you before arrival. 📍";
  }
  if (m.includes("complaint") || m.includes("problem") || m.includes("issue") && !m.includes("payment")) {
    return "I'm sorry to hear that. Please describe what happened in a few words — our cooperative support team reviews every complaint within 24 hours, and safety concerns are escalated immediately.";
  }
  if (m.includes("feedback") || m.includes("review") || m.includes("suggest")) {
    return "Thank you for sharing! Feedback like this helps our worker-members improve. You can also leave a star rating after every completed booking. ⭐";
  }
  if (m.includes("payment") || m.includes("refund") || m.includes("charge") || m.includes("money")) {
    return "For payment or refund issues, please share your booking ID and we'll resolve it within 2 business days. Workers are only paid once you confirm the job is complete.";
  }
  if (m.includes("human") || m.includes("agent") || m.includes("call") || m.includes("support")) {
    return "Connecting you to our support team now — a cooperative member will call you within 30 minutes on your registered number. 📞";
  }
  if (m.includes("price") || m.includes("rate") || m.includes("cost")) {
    return "Every worker sets their own fair rate. When booking, you can also propose a custom rate and the worker can accept or counter it.";
  }
  if (m.includes("hi") || m.includes("hello") || m.includes("hey")) {
    return "Hi there! 👋 I'm Kaamsetu's assistant. I can help with bookings, complaints, payments, or feedback. What do you need help with?";
  }
  return "Got it, I've noted that down. If this needs urgent attention, tap 'Talk to a human' and our team will reach out shortly.";
}

export default function App() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const workersRef = useRef<HTMLElement>(null);

  // Page navigation (home → services list → service detail)
  const [page, setPage] = useState<"home" | "services" | "serviceDetail" | "workerDashboard" | "workHistory" | "admin" | "login">("login");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  function goToServicesPage() {
    setPage("services");
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToServiceDetail(categoryId: string) {
    setSelectedCategory(categoryId);
    setPage("serviceDetail");
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToSection(id: string) {
    setMobileMenuOpen(false);
    if (page !== "home") {
      setPage("home");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function goHome() {
    setPage("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // PWA — capture the browser's install prompt so we can offer an in-app
  // "Install App" button instead of relying on the browser's own UI.
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [appInstalled, setAppInstalled] = useState(false);
  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallPromptEvent(e);
    }
    function onAppInstalled() {
      setAppInstalled(true);
      setInstallPromptEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);
  async function handleInstallApp() {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
  }

  // Cooperative Federation Administration Dashboard
  const [adminView, setAdminView] = useState<"overview" | "verification" | "bookings">("overview");
  function goToAdmin() {
    setPage("admin");
    setAdminView("overview");
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function adminApproveWorker(id: string | number) {
    setCommunityWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, verified: true } : w)));
  }
  function adminRejectWorker(id: string | number) {
    setCommunityWorkers((prev) => prev.filter((w) => w.id !== id));
  }

  // Customer / Worker / Federation tri-toggle in the nav — lets anyone jump
  // straight into whichever "portal" of the cooperative they need.
  const activeMode: "customer" | "worker" | "federation" =
    page === "admin" ? "federation" : page === "workerDashboard" ? "worker" : "customer";
  function switchMode(mode: "customer" | "worker" | "federation") {
    setMobileMenuOpen(false);
    if (mode === "federation") {
      goToAdmin();
    } else if (mode === "worker") {
      if (isSignedIn && userRole === "worker") {
        setPage("workerDashboard");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        openSignIn("worker");
      }
    } else {
      goHome();
    }
  }

  // Search + flexible pricing filter
  const [searchQuery, setSearchQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(550);

  // Booking flow
  const [bookingWorker, setBookingWorker] = useState<Worker | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingForm, setBookingForm] = useState({
    date: "",
    time: "",
    address: "",
    notes: "",
    useCustomRate: false,
    proposedRate: "",
    paymentMethod: "upi" as "upi" | "card" | "cash",
  });
  const [bookingId, setBookingId] = useState("");
  const [lastInvoice, setLastInvoice] = useState<{ id: string; workerName: string; service: string; date: string; time: string; address: string; rate: string; paymentMethod: string } | null>(null);

  // Chatbot
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: "bot", text: "Hi! 👋 I'm Kaamsetu's assistant. Ask me about bookings, complaints, payments, or feedback." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatTyping, setChatTyping] = useState(false);

  // Sign in (email/password or Google) with a Customer / Worker role tab
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInStep, setSignInStep] = useState(1); // 1 = form, 2 = success
  const [authRole, setAuthRole] = useState<"customer" | "worker">("customer");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [signInName, setSignInName] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; photoURL: string | null } | null>(null);
  const [userRole, setUserRole] = useState<"customer" | "worker" | null>(null);

  // If the browser still has a valid Firebase session (returning visitor),
  // skip straight past the login page instead of showing it every time.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({ name: user.displayName || user.email?.split("@")[0] || "Member", email: user.email || "", photoURL: user.photoURL });
        setIsSignedIn(true);
        setPage((prev) => (prev === "login" ? "home" : prev));
      }
    });
    return () => unsubscribe();
  }, []);

  // Account/hamburger menu, notifications panel, and UI language
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  function t(key: string) {
    return translations[lang][key] ?? key;
  }

  // Booking requests (worker side) + notifications (both sides). Simulated
  // client-side since this app has no backend to push real-time events —
  // any signed-in worker sees all incoming requests, standing in for "the"
  // cooperative worker in this demo.
  const [workerRequests, setWorkerRequests] = useState<WorkerRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [seenNotifIds, setSeenNotifIds] = useState<Set<string>>(new Set());

  function pushNotification(forRole: "customer" | "worker", text: string) {
    setNotifications((prev) => [
      { id: Math.random().toString(36).slice(2), text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), forRole },
      ...prev,
    ]);
  }

  // Join as worker
  const [showJoinWorker, setShowJoinWorker] = useState(false);
  const [joinStep, setJoinStep] = useState(1);
  const [joinForm, setJoinForm] = useState({ name: "", phone: "", category: serviceCategories[0].id, experience: "", certificate: "" });
  const [joinRefId, setJoinRefId] = useState("");

  // Workers who registered via "Join as Worker" or worker sign-up, persisted
  // in Firestore ("workers" collection) so they stay searchable across
  // sessions. Loaded once on mount and combined with the static roster.
  const [communityWorkers, setCommunityWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    async function loadCommunityWorkers() {
      try {
        const snap = await getDocs(collection(db, "workers"));
        const loaded = snap.docs.map((d) => {
          const data = d.data() as { name?: string; category?: string; experience?: number | string; verified?: boolean };
          return buildCommunityWorker(d.id, data.name || "", data.category || "", Number(data.experience) || 0, data.verified !== false);
        });
        setCommunityWorkers(loaded);
      } catch (err) {
        console.error("Failed to load worker profiles:", err);
      }
    }
    loadCommunityWorkers();
  }, []);

  const allWorkers = [...workers, ...communityWorkers];

  // AI-Powered Fair Match — how the worker grid is sorted.
  const [sortMode, setSortMode] = useState<"ai" | "rating" | "price">("ai");

  const filtered = allWorkers
    .filter((w) => {
      const matchesCategory = activeFilter === "all" || w.category === activeFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        w.name.toLowerCase().includes(q) ||
        w.role.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q));
      const matchesPrice = w.hourlyRate <= maxPrice;
      return matchesCategory && matchesSearch && matchesPrice;
    })
    .map((w) => ({ ...w, matchScore: computeMatchScore(w, searchQuery) }))
    .sort((a, b) => {
      if (sortMode === "rating") return b.rating - a.rating;
      if (sortMode === "price") return a.hourlyRate - b.hourlyRate;
      return b.matchScore - a.matchScore;
    });

  function handleServiceClick(categoryId: string) {
    setActiveFilter(categoryId);
    setTimeout(() => {
      workersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function openBooking(worker: Worker) {
    setBookingWorker(worker);
    setBookingStep(1);
    setBookingForm({ date: "", time: "", address: "", notes: "", useCustomRate: false, proposedRate: String(worker.hourlyRate), paymentMethod: "upi" });
  }

  function closeBooking() {
    setBookingWorker(null);
    setBookingStep(1);
  }

  // Smart Booking & Service Management — confirms the booking, records it
  // for the worker's dashboard, and generates a downloadable invoice once
  // payment (mock) has gone through.
  function confirmBooking() {
    if (!bookingWorker) return;
    const id = "KS-" + Math.floor(100000 + Math.random() * 900000);
    const rate = bookingForm.useCustomRate ? bookingForm.proposedRate : String(bookingWorker.hourlyRate);
    setBookingId(id);
    setBookingStep(5);
    const customerName = currentUser?.name || "A customer";
    setWorkerRequests((prev) => [
      {
        id,
        customerName,
        workerName: bookingWorker.name,
        service: bookingWorker.role,
        category: bookingWorker.category,
        date: bookingForm.date,
        time: bookingForm.time,
        address: bookingForm.address,
        rate,
        status: "pending",
        paymentMethod: bookingForm.paymentMethod,
      },
      ...prev,
    ]);
    setLastInvoice({
      id,
      workerName: bookingWorker.name,
      service: bookingWorker.role,
      date: bookingForm.date,
      time: bookingForm.time,
      address: bookingForm.address,
      rate,
      paymentMethod: bookingForm.paymentMethod,
    });
    pushNotification("worker", `New booking request from ${customerName} for ${bookingForm.date} at ${bookingForm.time}.`);
  }

  function downloadInvoice() {
    if (!lastInvoice) return;
    const lines = [
      "KAAMSETU — COOPERATIVE SERVICE INVOICE",
      "======================================",
      `Booking ID: ${lastInvoice.id}`,
      `Worker: ${lastInvoice.workerName}`,
      `Service: ${lastInvoice.service}`,
      `Date & time: ${lastInvoice.date} · ${lastInvoice.time}`,
      `Address: ${lastInvoice.address}`,
      `Payment method: ${lastInvoice.paymentMethod.toUpperCase()}`,
      `Rate: ₹${lastInvoice.rate}/hr`,
      "--------------------------------------",
      "No middleman commission — 90% of every",
      "booking goes directly to the worker.",
      "Thank you for booking with Kaamsetu.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${lastInvoice.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function sendChatMessage(text?: string) {
    const message = (text ?? chatInput).trim();
    if (!message) return;
    setChatMessages((prev) => [...prev, { sender: "user", text: message }]);
    setChatInput("");
    setChatTyping(true);
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { sender: "bot", text: getBotReply(message) }]);
      setChatTyping(false);
    }, 600);
  }

  function openSignIn(role: "customer" | "worker" = "customer") {
    setShowSignIn(true);
    setAuthRole(role);
    setAuthMode("signin");
    setSignInStep(1);
    setSignInName("");
    setSignInEmail("");
    setSignInPassword("");
    setAuthError("");
  }
  function closeSignIn() {
    setShowSignIn(false);
  }

  function applyUserRole(role: "customer" | "worker") {
    setUserRole(role);
    if (role === "worker") {
      setPage("workerDashboard");
    } else {
      setPage("home");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Saves/updates a worker's profile in Firestore (keyed by their auth uid,
  // so signing in again just updates the same profile) and makes them
  // searchable right away without waiting for a page reload.
  async function saveWorkerAuthProfile(uid: string, name: string, email: string) {
    try {
      await setDoc(doc(db, "workers", uid), { uid, name, email, updatedAt: serverTimestamp() }, { merge: true });
      setCommunityWorkers((prev) => {
        if (prev.some((w) => w.id === uid)) return prev;
        return [buildCommunityWorker(uid, name, "domestic", 0), ...prev];
      });
    } catch (err) {
      console.error("Failed to save worker profile:", err);
    }
  }

  async function signInWithGoogle() {
    if (authLoading) return;
    setAuthError("");
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setCurrentUser({ name: user.displayName || "Member", email: user.email || "", photoURL: user.photoURL });
      setIsSignedIn(true);
      applyUserRole(authRole);
      if (authRole === "worker") {
        saveWorkerAuthProfile(user.uid, user.displayName || "Member", user.email || "");
      }
      setSignInStep(2);
      setTimeout(() => setShowSignIn(false), 1000);
    } catch (err) {
      console.error(err);
      setAuthError("Couldn't sign in with Google. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function submitEmailAuth() {
    if (authLoading) return;
    if (!signInEmail.trim() || signInPassword.trim().length < 6) return;
    if (authMode === "signup" && !signInName.trim()) return;
    setAuthError("");
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, signInEmail.trim(), signInPassword);
        if (signInName.trim()) {
          await updateProfile(cred.user, { displayName: signInName.trim() });
        }
        setCurrentUser({ name: signInName.trim() || "Member", email: cred.user.email || "", photoURL: cred.user.photoURL });
      } else {
        const cred = await signInWithEmailAndPassword(auth, signInEmail.trim(), signInPassword);
        setCurrentUser({ name: cred.user.displayName || cred.user.email?.split("@")[0] || "Member", email: cred.user.email || "", photoURL: cred.user.photoURL });
      }
      setIsSignedIn(true);
      applyUserRole(authRole);
      if (authRole === "worker") {
        const uid = auth.currentUser?.uid;
        const name = auth.currentUser?.displayName || signInName.trim() || signInEmail.split("@")[0] || "Member";
        const email = auth.currentUser?.email || signInEmail.trim();
        if (uid) saveWorkerAuthProfile(uid, name, email);
      }
      setSignInStep(2);
      setTimeout(() => setShowSignIn(false), 1000);
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string })?.code || "";
      if (code.includes("email-already-in-use")) setAuthError("An account already exists with this email. Try signing in instead.");
      else if (code.includes("wrong-password") || code.includes("invalid-credential")) setAuthError("Incorrect email or password.");
      else if (code.includes("user-not-found")) setAuthError("No account found with this email. Try creating one.");
      else if (code.includes("weak-password")) setAuthError("Password should be at least 6 characters.");
      else setAuthError("Something went wrong. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
    setIsSignedIn(false);
    setCurrentUser(null);
    setUserRole(null);
    setAccountMenuOpen(false);
    if (page === "workerDashboard" || page === "workHistory") goHome();
  }

  function acceptRequest(id: string) {
    const eta = 15 + Math.floor(Math.random() * 30); // 15–45 minutes
    const req = workerRequests.find((r) => r.id === id);
    setWorkerRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "accepted", etaMinutes: eta } : r)));
    pushNotification("customer", `${req?.workerName ?? "Your worker"} accepted your booking! Arriving in about ${eta} minutes.`);
  }
  function rejectRequest(id: string) {
    const req = workerRequests.find((r) => r.id === id);
    setWorkerRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)));
    pushNotification("customer", `${req?.workerName ?? "The worker"} isn't available for your requested slot. Please try another worker.`);
  }
  // Lets a customer rate a worker after an accepted/completed job — part of
  // Smart Booking & Service Management's rating step.
  function rateBooking(id: string, stars: number) {
    setWorkerRequests((prev) => prev.map((r) => (r.id === id ? { ...r, customerRating: stars } : r)));
  }

  function openNotifPanel() {
    const next = !notifPanelOpen;
    setNotifPanelOpen(next);
    if (next) {
      setSeenNotifIds((prev) => {
        const updated = new Set(prev);
        notifications.filter((n) => n.forRole === userRole).forEach((n) => updated.add(n.id));
        return updated;
      });
    }
  }

  function openJoinWorker() {
    setShowJoinWorker(true);
    setJoinStep(1);
    setJoinForm({ name: "", phone: "", category: serviceCategories[0].id, experience: "", certificate: "" });
  }
  function closeJoinWorker() {
    setShowJoinWorker(false);
  }
  async function submitJoinWorker() {
    const refId = "APP-" + Math.floor(100000 + Math.random() * 900000);
    const name = joinForm.name.trim();
    const category = joinForm.category;
    const experience = Number(joinForm.experience) || 0;
    const certificate = joinForm.certificate.trim();
    const phone = joinForm.phone.trim();
    // AI-assisted verification check: enough experience, a valid phone, and
    // a certificate/ID reference is enough to auto-verify in this demo — a
    // real deployment would route this to human cooperative reviewers too.
    const passesAutoCheck = experience >= 1 && phone.length >= 10 && certificate.length > 0;
    setJoinRefId(refId);
    setJoinStep(2);
    try {
      const docRef = await addDoc(collection(db, "workers"), {
        name,
        phone,
        category,
        experience,
        certificate,
        refId,
        verified: false,
        createdAt: serverTimestamp(),
      });
      setCommunityWorkers((prev) => [buildCommunityWorker(docRef.id, name, category, experience, false), ...prev]);
      // Simulate the verification check completing a couple of seconds later.
      setTimeout(async () => {
        try {
          await updateDoc(doc(db, "workers", docRef.id), { verified: passesAutoCheck });
          setCommunityWorkers((prev) => prev.map((w) => (w.id === docRef.id ? { ...w, verified: passesAutoCheck } : w)));
        } catch (err) {
          console.error("Failed to update verification status:", err);
        }
      }, 2500);
    } catch (err) {
      console.error("Failed to save worker profile:", err);
    }
  }

  const myNotifications = notifications.filter((n) => n.forRole === userRole);
  const myNotifCount = myNotifications.filter((n) => !seenNotifIds.has(n.id)).length;
  const acceptedJobs = workerRequests.filter((r) => r.status === "accepted");
  const totalEarnings = acceptedJobs.reduce((sum, r) => sum + (Number(r.rate) || 0), 0);
  const pendingRequestsCount = workerRequests.filter((r) => r.status === "pending").length;
  const myBookings = workerRequests.filter((r) => r.customerName === currentUser?.name);

  // AI Workforce Intelligence — forecasts demand per service category from
  // live booking activity and recommends where the cooperative should
  // allocate/onboard more workers.
  const demandByCategory = serviceCategories
    .map((cat) => {
      const catRequests = workerRequests.filter((r) => r.category === cat.id).length;
      const catWorkerCount = allWorkers.filter((w) => w.category === cat.id).length;
      const ratio = catWorkerCount ? catRequests / catWorkerCount : catRequests;
      const level: "Low" | "Moderate" | "High" = ratio > 1.5 ? "High" : ratio > 0.5 ? "Moderate" : "Low";
      return { ...cat, requests: catRequests, workerCount: catWorkerCount, level };
    })
    .sort((a, b) => b.requests - a.requests);

  return (
    <div className="min-h-full bg-[#F7F2E9] text-[#1C1A16]" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* ── NAV ── */}
      {page !== "login" && (
      <nav className="sticky top-0 z-50 bg-[#F7F2E9]/95 backdrop-blur border-b border-[#D8D2C5]">
        <div className="max-w-7xl mx-auto px-5 md:px-10 flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <div className="w-8 h-8 rounded-full bg-[#1B6B5E] flex items-center justify-center">
              <span className="text-white text-xs font-bold">KS</span>
            </div>
            <span className="font-semibold text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Kaamsetu</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#7A7469]">
            <button onClick={goToServicesPage} className="hover:text-[#1C1A16] transition-colors">{t("services")}</button>
            <button onClick={() => goToSection("how")} className="hover:text-[#1C1A16] transition-colors">{t("howItWorks")}</button>
            <button onClick={() => goToSection("workers")} className="hover:text-[#1C1A16] transition-colors">{t("workers")}</button>
            <button onClick={() => goToSection("stories")} className="hover:text-[#1C1A16] transition-colors">{t("stories")}</button>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#EDE8DF] rounded-full p-1 mr-1" role="group" aria-label="Portal">
              <button onClick={() => switchMode("customer")} className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${activeMode === "customer" ? "bg-white shadow-sm text-[#1C1A16]" : "text-[#7A7469] hover:text-[#1C1A16]"}`}>
                {t("customerTab")}
              </button>
              <button onClick={() => switchMode("worker")} className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${activeMode === "worker" ? "bg-white shadow-sm text-[#1C1A16]" : "text-[#7A7469] hover:text-[#1C1A16]"}`}>
                {t("workerTab")}
              </button>
              <button onClick={() => switchMode("federation")} className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${activeMode === "federation" ? "bg-white shadow-sm text-[#1C1A16]" : "text-[#7A7469] hover:text-[#1C1A16]"}`}>
                {t("federationTab")}
              </button>
            </div>
            <div className="flex items-center gap-1 mr-1" role="group" aria-label={t("language")}>
              <button onClick={() => setLang("en")} className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${lang === "en" ? "bg-[#1B6B5E] text-white border-[#1B6B5E]" : "border-[#D8D2C5] text-[#7A7469] hover:text-[#1C1A16]"}`}>EN</button>
              <button onClick={() => setLang("hi")} className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${lang === "hi" ? "bg-[#1B6B5E] text-white border-[#1B6B5E]" : "border-[#D8D2C5] text-[#7A7469] hover:text-[#1C1A16]"}`}>हिं</button>
            </div>
            {isSignedIn ? (
              <div className="flex items-center gap-2">
                {userRole === "worker" && page !== "workerDashboard" && (
                  <button onClick={() => { setPage("workerDashboard"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-sm font-semibold text-[#1B6B5E] hover:underline">
                    {t("dashboard")}
                  </button>
                )}
                <div className="relative">
                  <button onClick={openNotifPanel} className="relative p-2 rounded-lg hover:bg-[#EDE8DF]" aria-label="Notifications">
                    <span className="text-lg leading-none">🔔</span>
                    {myNotifCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-[#D97840] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{myNotifCount}</span>
                    )}
                  </button>
                  {notifPanelOpen && (
                    <div className="absolute right-0 top-11 w-80 bg-white border border-[#D8D2C5] rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
                      <div className="px-4 py-3 border-b border-[#D8D2C5] font-semibold text-sm">{t("notifications")}</div>
                      {myNotifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-[#7A7469] text-center">{t("noNotifications")}</div>
                      ) : (
                        myNotifications.map((n) => (
                          <div key={n.id} className="px-4 py-3 border-b border-[#EDE8DF] last:border-0 text-sm">
                            <p className="text-[#1C1A16]">{n.text}</p>
                            <p className="text-xs text-[#7A7469] mt-1">{n.time}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button onClick={() => setAccountMenuOpen(!accountMenuOpen)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[#EDE8DF] transition-colors">
                    <img
                      src={currentUser?.photoURL || personImgFallback(currentUser?.name || "U", "1B6B5E")}
                      alt={currentUser?.name || "Account"}
                      className="w-7 h-7 rounded-full object-cover"
                      onError={(e) => handleImgError(e, personImgFallback(currentUser?.name || "U", "1B6B5E"))}
                    />
                    <span className="flex flex-col gap-[3px]">
                      <span className="w-4 h-0.5 bg-[#1C1A16] rounded-full" />
                      <span className="w-4 h-0.5 bg-[#1C1A16] rounded-full" />
                      <span className="w-4 h-0.5 bg-[#1C1A16] rounded-full" />
                    </span>
                  </button>
                  {accountMenuOpen && (
                    <div className="absolute right-0 top-11 w-64 bg-white border border-[#D8D2C5] rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#D8D2C5] flex items-center gap-3">
                        <img
                          src={currentUser?.photoURL || personImgFallback(currentUser?.name || "U", "1B6B5E")}
                          alt={currentUser?.name || "Account"}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => handleImgError(e, personImgFallback(currentUser?.name || "U", "1B6B5E"))}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{currentUser?.name}</div>
                          <div className="text-xs text-[#7A7469] truncate">{currentUser?.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => { setAccountMenuOpen(false); setPage(userRole === "worker" ? "workerDashboard" : "workHistory"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#F7F2E9] transition-colors"
                      >
                        📋 {t("workHistory")}
                      </button>
                      <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-[#D8D2C5] transition-colors">
                        {t("signOut")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button onClick={() => openSignIn("customer")} className="text-sm font-semibold bg-[#1B6B5E] text-white px-5 py-2 rounded-lg hover:bg-[#155750] transition-colors">
                {t("signInCustomerNav")}
              </button>
            )}
            {!isSignedIn && (
              <button onClick={openJoinWorker} className="text-sm font-medium text-[#1C1A16] px-4 py-2 rounded-lg border border-[#D8D2C5] hover:bg-[#EDE8DF] transition-colors">{t("joinAsWorker")}</button>
            )}
          </div>
          <button className="md:hidden p-2 rounded-md hover:bg-[#EDE8DF]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <div className="w-5 h-0.5 bg-[#1C1A16] mb-1" />
            <div className="w-5 h-0.5 bg-[#1C1A16] mb-1" />
            <div className="w-4 h-0.5 bg-[#1C1A16]" />
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#D8D2C5] bg-[#FDFAF4] px-5 py-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-1 bg-[#EDE8DF] rounded-full p-1 self-stretch" role="group" aria-label="Portal">
              <button onClick={() => switchMode("customer")} className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${activeMode === "customer" ? "bg-white shadow-sm text-[#1C1A16]" : "text-[#7A7469]"}`}>
                {t("customerTab")}
              </button>
              <button onClick={() => switchMode("worker")} className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${activeMode === "worker" ? "bg-white shadow-sm text-[#1C1A16]" : "text-[#7A7469]"}`}>
                {t("workerTab")}
              </button>
              <button onClick={() => switchMode("federation")} className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${activeMode === "federation" ? "bg-white shadow-sm text-[#1C1A16]" : "text-[#7A7469]"}`}>
                {t("federationTab")}
              </button>
            </div>
            <div className="flex items-center gap-1 self-end -mt-1 mb-1" role="group" aria-label={t("language")}>
              <button onClick={() => setLang("en")} className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${lang === "en" ? "bg-[#1B6B5E] text-white border-[#1B6B5E]" : "border-[#D8D2C5] text-[#7A7469]"}`}>EN</button>
              <button onClick={() => setLang("hi")} className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${lang === "hi" ? "bg-[#1B6B5E] text-white border-[#1B6B5E]" : "border-[#D8D2C5] text-[#7A7469]"}`}>हिं</button>
            </div>
            <button className="text-left font-medium text-[#3D3A33] py-1" onClick={goToServicesPage}>{t("services")}</button>
            <button className="text-left font-medium text-[#3D3A33] py-1" onClick={() => goToSection("how")}>{t("howItWorks")}</button>
            <button className="text-left font-medium text-[#3D3A33] py-1" onClick={() => goToSection("workers")}>{t("workers")}</button>
            <button className="text-left font-medium text-[#3D3A33] py-1" onClick={() => goToSection("stories")}>{t("stories")}</button>

            <div className="border-t border-[#D8D2C5] pt-3 mt-1 flex flex-col gap-2.5">
              {isSignedIn ? (
                <>
                  <div className="flex items-center gap-3">
                    <img
                      src={currentUser?.photoURL || personImgFallback(currentUser?.name || "U", "1B6B5E")}
                      alt={currentUser?.name || "Account"}
                      className="w-9 h-9 rounded-full object-cover"
                      onError={(e) => handleImgError(e, personImgFallback(currentUser?.name || "U", "1B6B5E"))}
                    />
                    <div>
                      <div className="font-semibold text-sm">{currentUser?.name}</div>
                      <div className="text-xs text-[#7A7469]">{currentUser?.email}</div>
                    </div>
                  </div>
                  {userRole === "worker" && (
                    <button
                      onClick={() => { setMobileMenuOpen(false); setPage("workerDashboard"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="text-left font-medium text-[#1B6B5E] py-1"
                    >
                      🔔 {t("dashboard")} {pendingRequestsCount > 0 && `(${pendingRequestsCount})`}
                    </button>
                  )}
                  <button
                    onClick={() => { setMobileMenuOpen(false); setPage(userRole === "worker" ? "workerDashboard" : "workHistory"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="text-left font-medium text-[#3D3A33] py-1"
                  >
                    📋 {t("workHistory")}
                  </button>
                  <button onClick={handleSignOut} className="text-left font-medium text-red-600 py-1">{t("signOut")}</button>
                </>
              ) : (
                <button onClick={() => { setMobileMenuOpen(false); openSignIn("customer"); }} className="text-left w-full bg-[#1B6B5E] text-white font-semibold py-2.5 rounded-lg text-center">{t("signInCustomerNav")}</button>
              )}
            </div>

            {!isSignedIn && (
              <button onClick={() => { setMobileMenuOpen(false); openJoinWorker(); }} className="mt-1 w-full border border-[#D8D2C5] text-[#1C1A16] font-semibold py-2.5 rounded-lg">{t("joinAsWorker")}</button>
            )}
          </div>
        )}
      </nav>
      )}

      {/* ── LOGIN PAGE (shown first, before the rest of the app) ── */}
      {page === "login" && (
        <section className="min-h-screen flex items-center justify-center px-5 py-16 bg-[#F7F2E9]">
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#1B6B5E] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">KS</span>
                </div>
                <span className="font-semibold text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Kaamsetu</span>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#1B6B5E] flex items-center justify-center text-white text-2xl mb-5 shadow-md">
                →]
              </div>
              <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
                {authMode === "signup" ? t("welcomeExclaim") : t("welcomeBack")}
              </h1>
              <p className="text-sm text-[#7A7469]">
                {authMode === "signup" ? t("createCustomerAccount") : t("logInToAccount")}
              </p>
            </div>

            <div className="bg-white border border-[#D8D2C5] rounded-3xl p-6 shadow-sm">
              {authError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{authError}</div>
              )}

              <button
                onClick={signInWithGoogle}
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-2 border border-[#D8D2C5] bg-white text-[#1C1A16] font-semibold py-3 rounded-xl hover:bg-[#EDE8DF] transition-colors disabled:opacity-50 mb-4"
              >
                <span className="text-base font-bold" style={{ color: "#4285F4" }}>G</span> {t("continueWithGoogle")}
              </button>

              <div className="flex items-center gap-3 text-xs text-[#7A7469] mb-4">
                <div className="flex-1 h-px bg-[#D8D2C5]" /> {t("orEmail")} <div className="flex-1 h-px bg-[#D8D2C5]" />
              </div>

              <div className="flex flex-col gap-4">
                {authMode === "signup" && (
                  <div>
                    <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">{t("fullName")}</label>
                    <input
                      type="text"
                      value={signInName}
                      onChange={(e) => setSignInName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">{t("email")}</label>
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-[#1C1A16]">{t("password")}</label>
                    {authMode === "signin" && (
                      <button type="button" onClick={() => setAuthError(t("forgotPasswordHint"))} className="text-xs font-semibold text-[#1B6B5E] hover:underline">
                        {t("forgotPassword")}
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                  />
                </div>
                <button
                  disabled={authLoading || !signInEmail.trim() || signInPassword.trim().length < 6 || (authMode === "signup" && !signInName.trim())}
                  onClick={submitEmailAuth}
                  className="bg-[#1B6B5E] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#155750] transition-colors"
                >
                  {authLoading ? "Please wait…" : authMode === "signup" ? t("signUpBtn") : t("signInBtn")}
                </button>
              </div>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setAuthError(""); }}
                className="text-sm text-[#1B6B5E] font-semibold hover:underline"
              >
                {authMode === "signup" ? t("alreadyHaveAccount") : t("needAccount")}
              </button>
            </div>

            <div className="text-center mt-4">
              <button onClick={goHome} className="text-xs text-[#7A7469] hover:text-[#1C1A16] underline underline-offset-2">
                Continue browsing without an account →
              </button>
            </div>
          </div>
        </section>
      )}

      {page === "home" && (
      <>
      {isSignedIn && userRole === "customer" && currentUser && (
        <div className="max-w-7xl mx-auto px-5 md:px-10 pt-6">
          <div className="bg-white border border-[#D8D2C5] rounded-2xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">👋</span>
            <div>
              <p className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>
                {t("namaste")}, {currentUser.name?.split(" ")[0] || currentUser.name}
              </p>
              <p className="text-sm text-[#7A7469]">{t("whatDoYouNeed")}</p>
            </div>
          </div>
        </div>
      )}
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-10 pt-12 pb-16 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#D97840] mb-5 border border-[#D97840]/40 bg-[#D97840]/10 px-3 py-1 rounded-full">
              {t("heroTag")}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] font-semibold mb-6 text-[#1C1A16]" style={{ fontFamily: "'Fraunces', serif" }}>
              {t("heroHeadline1")}
              <br />
              <em className="text-[#1B6B5E] not-italic">{t("heroHeadlineEm")}</em>{lang === "en" ? " your" : ""}
              <br />
              {t("heroHeadline2")}
            </h1>
            <p className="text-[#7A7469] text-lg leading-relaxed max-w-md mb-8">
              {t("heroSubtext")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleServiceClick("all")}
                className="bg-[#1B6B5E] text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-[#155750] transition-all hover:shadow-lg hover:shadow-[#1B6B5E]/20"
              >
                {t("findAService")}
              </button>
              <button onClick={openJoinWorker} className="border border-[#D8D2C5] text-[#1C1A16] font-medium px-7 py-3.5 rounded-xl hover:bg-[#EDE8DF] transition-colors">
                {t("becomeAMember")}
              </button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-2xl font-semibold text-[#1C1A16]" style={{ fontFamily: "'Fraunces', serif" }}>2,400+</div>
                <div className="text-[#7A7469] text-xs sm:text-sm">{t("statVerifiedWorkers")}</div>
              </div>
              <div className="border-x border-[#D8D2C5] px-3">
                <div className="text-2xl font-semibold text-[#1C1A16]" style={{ fontFamily: "'Fraunces', serif" }}>18,000+</div>
                <div className="text-[#7A7469] text-xs sm:text-sm">{t("statBookingsDone")}</div>
              </div>
              <div className="pl-3">
                <div className="text-2xl font-semibold text-[#1C1A16]" style={{ fontFamily: "'Fraunces', serif" }}>90%</div>
                <div className="text-[#7A7469] text-xs sm:text-sm">{t("statEarningsKept")}</div>
              </div>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="absolute -top-4 -right-4 w-72 h-72 rounded-3xl overflow-hidden shadow-2xl bg-[#E8E3D8]">
              <img
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=600&fit=crop&auto=format"
                alt="Cleaner at work"
                className="w-full h-full object-cover"
                onError={(e) => handleImgError(e, categoryImgFallback("cleaner-hero"))}
              />
            </div>
            <div className="absolute top-40 -left-8 w-52 h-52 rounded-2xl overflow-hidden shadow-xl border-4 border-[#F7F2E9] bg-[#E8E3D8]">
              <img
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&auto=format"
                alt="Home cooking"
                className="w-full h-full object-cover"
                onError={(e) => handleImgError(e, categoryImgFallback("home-cooking-hero"))}
              />
            </div>
            <div className="absolute bottom-4 right-12 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-[#D8D2C5]">
              <div className="w-10 h-10 rounded-full bg-[#1B6B5E] flex items-center justify-center text-white font-bold text-sm">4.9</div>
              <div>
                <div className="font-semibold text-sm">Top rated workers</div>
                <div className="text-xs text-[#7A7469]">Community verified ✓</div>
              </div>
            </div>
            <div className="w-full h-80" />
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,#1C1A16 0,#1C1A16 1px,transparent 0,transparent 50%)", backgroundSize: "12px 12px" }} />
      </section>

      {/* ── SERVICE CATEGORIES ── */}
      <section id="services" className="bg-[#FDFAF4] border-y border-[#D8D2C5] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-semibold leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                What do you need<br />done today?
              </h2>
            </div>
            <p className="text-[#7A7469] max-w-xs text-sm leading-relaxed">
              Click any service to browse verified cooperative workers near you.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {serviceCategories.slice(0, 6).map((cat) => (
              <button
                key={cat.id}
                onClick={() => goToServiceDetail(cat.id)}
                className="group flex flex-col rounded-2xl border border-[#D8D2C5] bg-white overflow-hidden text-left transition-all hover:border-[#1B6B5E] hover:shadow-md"
              >
                <div className="relative h-32 sm:h-36 overflow-hidden">
                  <img
                    src={cat.photo}
                    alt={cat.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => handleImgError(e, categoryImgFallback(cat.id))}
                  />
                  <span
                    className="absolute top-2 left-2 w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.icon}
                  </span>
                </div>
                <div className="p-4">
                  <div className="font-semibold text-sm text-[#1C1A16]">{cat.label}</div>
                  <div className="text-xs text-[#7A7469]">{cat.count} workers</div>
                </div>
              </button>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={goToServicesPage}
              className="text-sm font-semibold text-[#1B6B5E] border border-[#1B6B5E]/40 px-6 py-2.5 rounded-xl hover:bg-[#E8F4F1] transition-colors"
            >
              View all services →
            </button>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#7A7469]">{t("simpleProcess")}</span>
            <h2 className="text-4xl md:text-5xl font-semibold mt-2" style={{ fontFamily: "'Fraunces', serif" }}>{t("howKaamsetuWorks")}</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-px bg-[#D8D2C5] z-0" />
            {howItWorks.map((step) => (
              <div key={step.step} className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl bg-[#FDFAF4] border border-[#D8D2C5]">
                <div className="w-14 h-14 rounded-full bg-[#1B6B5E] text-white flex items-center justify-center text-xl mb-4 shadow-md">{step.icon}</div>
                <div className="text-xs font-mono text-[#7A7469] mb-2">{step.step}</div>
                <h3 className="font-semibold text-lg mb-2" style={{ fontFamily: "'Fraunces', serif" }}>{step.title}</h3>
                <p className="text-sm text-[#7A7469] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI WORKFORCE INTELLIGENCE ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#7A7469]">{t("cooperativeInsights")}</span>
            <h2 className="text-4xl md:text-5xl font-semibold mt-2" style={{ fontFamily: "'Fraunces', serif" }}>{t("aiWorkforceIntelligence")}</h2>
            <p className="text-[#7A7469] max-w-xl mx-auto mt-3 text-sm leading-relaxed">
              {t("aiWorkforceIntelligenceDesc")}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {demandByCategory.slice(0, 5).map((cat) => (
              <div key={cat.id} className="bg-[#FDFAF4] border border-[#D8D2C5] rounded-2xl p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{cat.icon}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    cat.level === "High" ? "bg-red-50 text-red-600" :
                    cat.level === "Moderate" ? "bg-[#FEF3EB] text-[#D97840]" :
                    "bg-[#E8F4F1] text-[#1B6B5E]"
                  }`}>{cat.level.toUpperCase()} DEMAND</span>
                </div>
                <div className="font-semibold text-sm text-[#1C1A16]">{cat.label}</div>
                <div className="text-xs text-[#7A7469]">{cat.requests} live booking{cat.requests === 1 ? "" : "s"} · {cat.workerCount} workers</div>
                {cat.level === "High" && (
                  <div className="text-xs font-semibold text-[#D97840] mt-1">→ Recommend onboarding more {cat.label.toLowerCase()} workers</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKER LISTINGS ── */}
      <section id="workers" ref={workersRef} className="bg-[#FDFAF4] border-t border-[#D8D2C5] py-16 md:py-24 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="flex flex-col gap-6 mb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <h2 className="text-4xl md:text-5xl font-semibold leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                Meet your<br />cooperative workers
              </h2>
              {activeFilter !== "all" && (
                <button
                  onClick={() => setActiveFilter("all")}
                  className="self-start md:self-auto text-sm text-[#1B6B5E] border border-[#1B6B5E]/40 px-4 py-1.5 rounded-full hover:bg-[#E8F4F1] transition-colors"
                >
                  ✕ Clear filter
                </button>
              )}
            </div>

            {/* Search + flexible pricing filter */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7469]">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, work type, or skill..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7469] hover:text-[#1C1A16] text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 bg-white border border-[#D8D2C5] rounded-xl px-4 py-2.5 text-sm">
                <span className="text-[#7A7469] whitespace-nowrap">Max rate</span>
                <input
                  type="range"
                  min={200}
                  max={550}
                  step={10}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-32 md:w-40 accent-[#1B6B5E]"
                />
                <span className="font-semibold text-[#1C1A16] whitespace-nowrap">₹{maxPrice}/hr</span>
              </div>
            </div>

            {/* AI-Powered Fair Match — sort mode */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs font-semibold text-[#7A7469]">Sort:</span>
              {([
                { id: "ai", label: "⚡ AI Match" },
                { id: "rating", label: "Top Rated" },
                { id: "price", label: "Lowest Price" },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSortMode(opt.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    sortMode === opt.id ? "bg-[#1B6B5E] text-white border-[#1B6B5E]" : "bg-white text-[#3D3A33] border-[#D8D2C5] hover:border-[#1B6B5E]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Filter pills — scrollable on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {filterCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    activeFilter === cat.id
                      ? "bg-[#1B6B5E] text-white border-[#1B6B5E]"
                      : "bg-white text-[#3D3A33] border-[#D8D2C5] hover:border-[#1B6B5E]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-[#7A7469]">
              No workers match your search yet. Try a different keyword or increase the max rate.
              <div className="mt-4">
                <button
                  onClick={() => { setSearchQuery(""); setActiveFilter("all"); setMaxPrice(550); }}
                  className="text-[#1B6B5E] font-semibold underline"
                >
                  Reset filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((worker, idx) => (
                <div
                  key={worker.id}
                  className="bg-white rounded-2xl border border-[#D8D2C5] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="p-5 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img
                          src={worker.image}
                          alt={worker.name}
                          className="w-16 h-16 rounded-xl object-cover bg-[#E8E3D8]"
                          onError={(e) => handleImgError(e, personImgFallback(worker.name, "1B6B5E"))}
                        />
                        {worker.available && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-[#1C1A16] truncate">{worker.name}</h3>
                            <p className="text-sm text-[#7A7469]">{worker.role}</p>
                          </div>
                          {worker.cooperative && (
                            <span className="shrink-0 text-xs bg-[#E8F4F1] text-[#1B6B5E] font-semibold px-2 py-0.5 rounded-full border border-[#1B6B5E]/20">
                              Co-op
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[#D97840]">★</span>
                          <span className="font-semibold text-sm">{worker.rating}</span>
                          <span className="text-xs text-[#7A7469]">({worker.reviews})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      {sortMode === "ai" && idx < 3 && (
                        <span className="text-xs bg-[#D97840]/10 text-[#D97840] font-semibold px-2 py-0.5 rounded-full border border-[#D97840]/30">⚡ AI Recommended</span>
                      )}
                      {isVerified(worker) ? (
                        <span className="text-xs bg-[#E8F4F1] text-[#1B6B5E] font-semibold px-2 py-0.5 rounded-full border border-[#1B6B5E]/20">✓ Verified</span>
                      ) : (
                        <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">Verification pending</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-[#7A7469]">
                      <span>📍</span><span>{worker.location}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {worker.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-[#F7F2E9] text-[#3D3A33] px-2 py-0.5 rounded-md border border-[#D8D2C5]">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-[#D8D2C5] px-5 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-lg text-[#1C1A16]" style={{ fontFamily: "'Fraunces', serif" }}>₹{worker.hourlyRate}</span>
                      <span className="text-xs text-[#7A7469]">/hr</span>
                    </div>
                    <button
                      onClick={() => openBooking(worker)}
                      className="bg-[#1B6B5E] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-[#155750] transition-colors"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <button className="border border-[#1B6B5E] text-[#1B6B5E] font-semibold px-8 py-3 rounded-xl hover:bg-[#1B6B5E] hover:text-white transition-all">
              View all 2,400+ workers →
            </button>
          </div>
        </div>
      </section>

      {/* ── COOPERATIVE BANNER ── */}
      <section className="bg-[#1B6B5E] text-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-5 md:px-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#A8D5CB] mb-4 block">Worker Cooperative</span>
            <h2 className="text-4xl md:text-5xl font-semibold leading-tight mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
              Work that<em className="text-[#F5B87A] not-italic"> belongs</em><br />to you.
            </h2>
            <p className="text-[#A8D5CB] leading-relaxed mb-7 max-w-md">
              Kaamsetu is owned by its workers. Every member has a vote in platform decisions,
              earns cooperative dividends, and builds their own client base — not ours.
            </p>
            <button onClick={openJoinWorker} className="bg-[#D97840] text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-[#C0652F] transition-colors">
              Apply to Join the Cooperative
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {[
              { value: "90%", label: "Earnings stay with workers" },
              { value: "1 vote", label: "Per member, democratically" },
              { value: "₹0", label: "Platform subscription fee" },
              { value: "Free", label: "Training & skill development" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-2xl p-5 border border-white/20">
                <div className="text-3xl font-semibold text-white mb-1" style={{ fontFamily: "'Fraunces', serif" }}>{stat.value}</div>
                <div className="text-sm text-[#A8D5CB]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="stories" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#7A7469]">Community stories</span>
            <h2 className="text-4xl md:text-5xl font-semibold mt-2" style={{ fontFamily: "'Fraunces', serif" }}>Heard from our community</h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#FDFAF4] border border-[#D8D2C5] rounded-3xl p-8 md:p-12 relative">
              <div className="text-5xl text-[#D8D2C5] font-serif leading-none mb-4">"</div>
              <p className="text-xl md:text-2xl leading-relaxed text-[#1C1A16] mb-8" style={{ fontFamily: "'Fraunces', serif" }}>
                {testimonials[activeTestimonial].text}
              </p>
              <div className="flex items-center gap-4">
                <img
                  src={testimonials[activeTestimonial].avatar}
                  alt={testimonials[activeTestimonial].name}
                  className="w-12 h-12 rounded-full object-cover bg-[#E8E3D8]"
                  onError={(e) => handleImgError(e, personImgFallback(testimonials[activeTestimonial].name, "7A7469"))}
                />
                <div>
                  <div className="font-semibold">{testimonials[activeTestimonial].name}</div>
                  <div className="text-sm text-[#7A7469]">{testimonials[activeTestimonial].location} · {testimonials[activeTestimonial].service}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-3 mt-6">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className={`h-2 rounded-full transition-all ${i === activeTestimonial ? "w-8 bg-[#1B6B5E]" : "w-2 bg-[#D8D2C5]"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#FDFAF4] border-t border-[#D8D2C5] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-5 md:px-10 text-center">
          <h2 className="text-4xl md:text-6xl font-semibold leading-tight mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
            Your neighbourhood,<br />
            <em className="text-[#1B6B5E] not-italic">stronger together.</em>
          </h2>
          <p className="text-[#7A7469] text-lg max-w-xl mx-auto mb-8">
            Join thousands of households and workers building a fairer local economy — one booking at a time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="text"
              placeholder="Enter your pincode or area..."
              className="flex-1 max-w-xs px-5 py-3.5 rounded-xl border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
            />
            <button className="bg-[#D97840] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[#C0652F] transition-colors whitespace-nowrap">
              Find Workers Near Me
            </button>
          </div>
        </div>
      </section>
      </>
      )}

      {/* ── SERVICES LISTING PAGE ── */}
      {page === "services" && (
        <section className="py-14 md:py-20">
          <div className="max-w-7xl mx-auto px-5 md:px-10">
            <button onClick={goHome} className="text-sm text-[#7A7469] hover:text-[#1C1A16] mb-6 flex items-center gap-1">← Back to home</button>
            <h2 className="text-4xl md:text-5xl font-semibold leading-tight mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
              All services
            </h2>
            <p className="text-[#7A7469] mb-10 max-w-lg">
              Pick a service to see verified cooperative workers with their experience and ratings.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {serviceCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => goToServiceDetail(cat.id)}
                  className="group flex flex-col rounded-2xl border border-[#D8D2C5] bg-white overflow-hidden text-left transition-all hover:border-[#1B6B5E] hover:shadow-md"
                >
                  <div className="relative h-32 sm:h-40 overflow-hidden">
                    <img
                      src={cat.photo}
                      alt={cat.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => handleImgError(e, categoryImgFallback(cat.id))}
                    />
                    <span
                      className="absolute top-2 left-2 w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.icon}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-sm text-[#1C1A16]">{cat.label}</div>
                    <div className="text-xs text-[#7A7469]">{cat.count} workers</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICE DETAIL PAGE ── */}
      {page === "serviceDetail" && selectedCategory && (
        <section className="py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-5 md:px-10">
            <button onClick={goToServicesPage} className="text-sm text-[#7A7469] hover:text-[#1C1A16] mb-6 flex items-center gap-1">← Back to all services</button>
            {(() => {
              const cat = serviceCategories.find((c) => c.id === selectedCategory)!;
              const catWorkers = allWorkers.filter((w) => w.category === selectedCategory);
              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-10">
                    <img
                      src={cat.photo}
                      alt={cat.label}
                      className="w-full sm:w-40 h-28 rounded-2xl object-cover"
                      onError={(e) => handleImgError(e, categoryImgFallback(cat.id))}
                    />
                    <div>
                      <h2 className="text-3xl md:text-4xl font-semibold leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                        {cat.label}
                      </h2>
                      <p className="text-[#7A7469] text-sm mt-1">{catWorkers.length} verified worker{catWorkers.length !== 1 ? "s" : ""} available near you</p>
                    </div>
                  </div>

                  {catWorkers.length === 0 ? (
                    <div className="text-center py-16 text-[#7A7469]">No workers listed for this service yet.</div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {catWorkers.map((worker) => (
                        <div key={worker.id} className="bg-white border border-[#D8D2C5] rounded-2xl overflow-hidden flex flex-col">
                          <img
                            src={worker.image}
                            alt={worker.name}
                            className="w-full h-40 object-cover"
                            onError={(e) => handleImgError(e, personImgFallback(worker.name, "1B6B5E"))}
                          />
                          <div className="p-5 flex flex-col gap-2 flex-1">
                            <div className="font-semibold text-[#1C1A16]">{worker.name}</div>
                            <div className="text-xs text-[#7A7469]">{worker.role}</div>
                            <div className="flex items-center gap-3 text-xs text-[#3D3A33] mt-1">
                              <span className="flex items-center gap-1">★ {worker.rating} <span className="text-[#7A7469]">({worker.reviews})</span></span>
                              <span>•</span>
                              <span>{worker.experience} yrs experience</span>
                            </div>
                            <div className="text-xs text-[#7A7469]">{worker.location}</div>
                            <div className="flex items-center justify-between mt-auto pt-3">
                              <span className="font-semibold text-[#1B6B5E]">₹{worker.hourlyRate}/hr</span>
                              <button
                                onClick={() => openBooking(worker)}
                                className="bg-[#1B6B5E] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#155750] transition-colors"
                              >
                                Book Now
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </section>
      )}

      {/* ── WORKER DASHBOARD PAGE ── */}
      {page === "workerDashboard" && (
        <section className="py-14 md:py-20">
          <div className="max-w-5xl mx-auto px-5 md:px-10">
            <button onClick={goHome} className="text-sm text-[#7A7469] hover:text-[#1C1A16] mb-6 flex items-center gap-1">← Back to home</button>

            <div className="flex items-center gap-4 mb-8">
              <img
                src={currentUser?.photoURL || personImgFallback(currentUser?.name || "Worker", "1B6B5E")}
                alt={currentUser?.name || "Worker"}
                className="w-16 h-16 rounded-full object-cover"
                onError={(e) => handleImgError(e, personImgFallback(currentUser?.name || "Worker", "1B6B5E"))}
              />
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{currentUser?.name}</h2>
                <p className="text-sm text-[#7A7469]">{currentUser?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
              <div className="bg-white border border-[#D8D2C5] rounded-xl p-4">
                <div className="text-2xl font-semibold text-[#1B6B5E]" style={{ fontFamily: "'Fraunces', serif" }}>{acceptedJobs.length}</div>
                <div className="text-xs text-[#7A7469]">{t("jobsCompleted")}</div>
              </div>
              <div className="bg-white border border-[#D8D2C5] rounded-xl p-4">
                <div className="text-2xl font-semibold text-[#1B6B5E]" style={{ fontFamily: "'Fraunces', serif" }}>₹{totalEarnings}</div>
                <div className="text-xs text-[#7A7469]">{t("totalEarnings")}</div>
              </div>
              <div className="bg-white border border-[#D8D2C5] rounded-xl p-4">
                <div className="text-2xl font-semibold text-[#D97840]" style={{ fontFamily: "'Fraunces', serif" }}>{pendingRequestsCount}</div>
                <div className="text-xs text-[#7A7469]">Pending requests</div>
              </div>
            </div>

            <h3 className="font-semibold text-xl mb-4" style={{ fontFamily: "'Fraunces', serif" }}>{t("incomingRequests")}</h3>
            {workerRequests.length === 0 ? (
              <div className="text-center py-12 text-[#7A7469] bg-white border border-[#D8D2C5] rounded-xl">No booking requests yet.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {workerRequests.map((req) => (
                  <div key={req.id} className="bg-white border border-[#D8D2C5] rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#1C1A16]">{req.customerName}</div>
                        <div className="text-sm text-[#7A7469]">{req.service}</div>
                        <div className="text-xs text-[#7A7469] mt-1">{req.date} · {req.time}</div>
                        <div className="text-xs text-[#7A7469]">{req.address}</div>
                        <div className="text-xs font-semibold text-[#1B6B5E] mt-1">₹{req.rate}/hr</div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                        req.status === "pending" ? "bg-[#FEF3EB] text-[#D97840]" :
                        req.status === "accepted" ? "bg-[#E8F4F1] text-[#1B6B5E]" :
                        "bg-red-50 text-red-600"
                      }`}>
                        {req.status === "pending" ? t("pending") : req.status === "accepted" ? t("accepted") : t("rejected")}
                      </span>
                    </div>
                    {req.status === "pending" && (
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => rejectRequest(req.id)} className="flex-1 border border-[#D8D2C5] text-[#1C1A16] font-medium py-2 rounded-lg hover:bg-[#EDE8DF] transition-colors">
                          {t("reject")}
                        </button>
                        <button onClick={() => acceptRequest(req.id)} className="flex-1 bg-[#1B6B5E] text-white font-semibold py-2 rounded-lg hover:bg-[#155750] transition-colors">
                          {t("accept")}
                        </button>
                      </div>
                    )}
                    {req.status === "accepted" && req.etaMinutes != null && (
                      <div className="mt-3 text-sm text-[#1B6B5E] font-medium">Arriving in ~{req.etaMinutes} minutes</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── WORK HISTORY PAGE (customer) ── */}
      {page === "workHistory" && (
        <section className="py-14 md:py-20">
          <div className="max-w-4xl mx-auto px-5 md:px-10">
            <button onClick={goHome} className="text-sm text-[#7A7469] hover:text-[#1C1A16] mb-6 flex items-center gap-1">← Back to home</button>
            <div className="flex items-center gap-4 mb-8">
              <img
                src={currentUser?.photoURL || personImgFallback(currentUser?.name || "U", "1B6B5E")}
                alt={currentUser?.name || "Account"}
                className="w-14 h-14 rounded-full object-cover"
                onError={(e) => handleImgError(e, personImgFallback(currentUser?.name || "U", "1B6B5E"))}
              />
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{t("workHistory")}</h2>
                <p className="text-sm text-[#7A7469]">{currentUser?.email}</p>
              </div>
            </div>
            {myBookings.length === 0 ? (
              <div className="text-center py-12 text-[#7A7469] bg-white border border-[#D8D2C5] rounded-xl">No bookings yet.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {myBookings.map((b) => (
                  <div key={b.id} className="bg-white border border-[#D8D2C5] rounded-xl p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#1C1A16]">{b.workerName} · {b.service}</div>
                        <div className="text-xs text-[#7A7469] mt-1">{b.date} · {b.time}</div>
                        <div className="text-xs text-[#7A7469]">{b.address}</div>
                        {b.status === "accepted" && b.etaMinutes != null && (
                          <div className="text-xs font-semibold text-[#1B6B5E] mt-1">Arriving in ~{b.etaMinutes} minutes</div>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                        b.status === "pending" ? "bg-[#FEF3EB] text-[#D97840]" :
                        b.status === "accepted" ? "bg-[#E8F4F1] text-[#1B6B5E]" :
                        "bg-red-50 text-red-600"
                      }`}>
                        {b.status === "pending" ? t("pending") : b.status === "accepted" ? t("accepted") : t("rejected")}
                      </span>
                    </div>
                    {b.status === "accepted" && (
                      <div className="border-t border-[#EDE8DF] pt-3 flex items-center gap-2">
                        <span className="text-xs text-[#7A7469]">{b.customerRating ? "Your rating:" : "Rate this job:"}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => rateBooking(b.id, star)}
                              className={`text-lg leading-none ${(b.customerRating ?? 0) >= star ? "text-[#D97840]" : "text-[#D8D2C5]"}`}
                              aria-label={`Rate ${star} star`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {page === "admin" && (() => {
        const totalMembers = federationBranches.reduce((s, b) => s + b.members, 0);
        const totalActive = federationBranches.reduce((s, b) => s + b.activeMembers, 0);
        const totalRevenue = federationBranches.reduce((s, b) => s + b.monthlyRevenue, 0);
        const pendingWorkers = communityWorkers.filter((w) => !w.verified);
        const platformRevenue = workerRequests.reduce((s, r) => s + (Number(r.rate) || 0), 0);
        return (
          <section className="py-14 md:py-20 bg-[#1C1A16] text-white min-h-screen">
            <div className="max-w-6xl mx-auto px-5 md:px-10">
              <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
                <div>
                  <button onClick={goHome} className="text-sm text-white/60 hover:text-white mb-2 flex items-center gap-1">← {t("exitAdminPortal")}</button>
                  <h2 className="text-3xl md:text-4xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>🏛️ {t("adminPortal")}</h2>
                  <p className="text-white/60 text-sm mt-1">{t("adminPortalSubtitle")}</p>
                </div>
                <div className="flex gap-2 bg-white/10 rounded-xl p-1">
                  {([
                    { id: "overview", label: t("adminOverview") },
                    { id: "verification", label: `${t("adminVerification")}${pendingWorkers.length ? ` (${pendingWorkers.length})` : ""}` },
                    { id: "bookings", label: t("adminBookingsDemand") },
                  ] as const).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setAdminView(v.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${adminView === v.id ? "bg-white text-[#1C1A16]" : "text-white/70 hover:text-white"}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {adminView === "overview" && (
                <>
                  <div className="grid sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/10 rounded-2xl p-5"><div className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{federationBranches.length}</div><div className="text-xs text-white/60 mt-1">{t("memberCooperatives")}</div></div>
                    <div className="bg-white/10 rounded-2xl p-5"><div className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{totalMembers.toLocaleString("en-IN")}</div><div className="text-xs text-white/60 mt-1">{t("totalWorkerMembers")}</div></div>
                    <div className="bg-white/10 rounded-2xl p-5"><div className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{totalActive.toLocaleString("en-IN")}</div><div className="text-xs text-white/60 mt-1">{t("activeThisMonth")}</div></div>
                    <div className="bg-white/10 rounded-2xl p-5"><div className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>₹{(totalRevenue / 100000).toFixed(1)}L</div><div className="text-xs text-white/60 mt-1">{t("combinedMonthlyRevenue")}</div></div>
                  </div>
                  <h3 className="font-semibold text-lg mb-3">{t("branches")}</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {federationBranches.map((b) => (
                      <div key={b.id} className="bg-white/10 rounded-2xl p-5 flex flex-col gap-2">
                        <div className="font-semibold">{b.name}</div>
                        <div className="text-xs text-white/60">{b.city} · {t("founded")} {b.foundedYear}</div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-white/70">{t("members")}</span><span className="font-semibold">{b.members}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/70">{t("active")}</span><span className="font-semibold">{b.activeMembers}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/70">{t("monthlyRevenue")}</span><span className="font-semibold">₹{(b.monthlyRevenue / 100000).toFixed(1)}L</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-[#1B6B5E]" style={{ width: `${Math.round((b.activeMembers / b.members) * 100)}%` }} />
                        </div>
                        <div className="text-[10px] text-white/50">{Math.round((b.activeMembers / b.members) * 100)}% {t("activeMembership")}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {adminView === "verification" && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-white/60">{t("verificationQueueDesc")}</p>
                  {pendingWorkers.length === 0 ? (
                    <div className="text-center py-16 text-white/50 bg-white/5 rounded-2xl">{t("queueClear")}</div>
                  ) : (
                    pendingWorkers.map((w) => (
                      <div key={w.id} className="bg-white/10 rounded-xl p-4 flex items-center gap-4 flex-wrap">
                        <img src={w.image} alt={w.name} className="w-12 h-12 rounded-lg object-cover" onError={(e) => handleImgError(e, personImgFallback(w.name, "D97840"))} />
                        <div className="flex-1 min-w-[160px]">
                          <div className="font-semibold">{w.name}</div>
                          <div className="text-xs text-white/60">{w.role} · {w.experience} {t("yrsExperience")}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => adminRejectWorker(w.id)} className="text-sm font-semibold border border-white/20 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">{t("reject")}</button>
                          <button onClick={() => adminApproveWorker(w.id)} className="text-sm font-semibold bg-[#1B6B5E] px-4 py-2 rounded-lg hover:bg-[#155750] transition-colors">{t("accept")}</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {adminView === "bookings" && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/10 rounded-2xl p-5"><div className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{workerRequests.length}</div><div className="text-xs text-white/60 mt-1">{t("totalPlatformBookings")}</div></div>
                    <div className="bg-white/10 rounded-2xl p-5"><div className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>₹{platformRevenue.toLocaleString("en-IN")}</div><div className="text-xs text-white/60 mt-1">{t("grossBookingValue")}</div></div>
                  </div>
                  <h3 className="font-semibold text-lg mb-3">⚡ {t("demandForecastTitle")}</h3>
                  <div className="flex flex-col gap-2">
                    {demandByCategory.map((cat) => (
                      <div key={cat.id} className="bg-white/10 rounded-xl p-4 flex items-center gap-4">
                        <span className="text-xl">{cat.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{cat.label}</div>
                          <div className="text-xs text-white/60">{cat.requests} {t("requests")} · {cat.workerCount} {t("workersOnPlatform")}</div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          cat.level === "High" ? "bg-red-500/20 text-red-300" : cat.level === "Moderate" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/60"
                        }`}>{cat.level.toUpperCase()} {t("demand")}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        );
      })()}

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#D8D2C5] py-12">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-[#1B6B5E] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">KS</span>
                </div>
                <span className="font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>Kaamsetu</span>
              </div>
              <p className="text-sm text-[#7A7469] leading-relaxed">{t("footerTagline")}</p>
            </div>
            {[
              { title: t("footerServices"), links: ["Cleaning", "Plumbing", "Carpentry", "Painting", "Domestic Help", "Caregiver", "Driver", "Gardening", "Electrician", "Technician"] },
              { title: t("footerCooperative"), links: [t("howItWorks"), t("joinAsWorker"), "Worker Benefits", "Governance", "Annual Report"] },
              { title: t("footerSupport"), links: ["Help Centre", "Safety", "Community Guidelines", "Contact Us", "Privacy Policy"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-[#7A7469] hover:text-[#1C1A16] transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-[#D8D2C5] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#7A7469]">
            <span>{t("footerCopyright")}</span>
            <div className="flex items-center gap-4">
              {installPromptEvent && !appInstalled && (
                <button onClick={handleInstallApp} className="flex items-center gap-1.5 font-semibold text-[#1B6B5E] hover:underline">
                  📲 {t("installApp")}
                </button>
              )}
              <button onClick={goToAdmin} className="hover:text-[#1C1A16] transition-colors underline-offset-2 hover:underline">{t("adminPortal")}</button>
              <span>Delhi NCR · Mumbai · Bengaluru · More cities coming soon</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── BOOKING MODAL ── */}
      {bookingWorker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={closeBooking}>
          <div
            className="bg-[#FDFAF4] rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#D8D2C5] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#D8D2C5]">
              <div className="flex items-center gap-3">
                <img
                  src={bookingWorker.image}
                  alt={bookingWorker.name}
                  className="w-11 h-11 rounded-lg object-cover"
                  onError={(e) => handleImgError(e, personImgFallback(bookingWorker.name, "1B6B5E"))}
                />
                <div>
                  <div className="font-semibold text-[#1C1A16]">{bookingWorker.name}</div>
                  <div className="text-xs text-[#7A7469]">{bookingWorker.role}</div>
                </div>
              </div>
              <button onClick={closeBooking} className="text-[#7A7469] hover:text-[#1C1A16] text-lg leading-none">✕</button>
            </div>

            {/* Step indicator */}
            {bookingStep < 5 && (
              <div className="flex items-center gap-2 px-6 pt-5">
                {["Schedule", "Details", "Confirm", "Payment"].map((label, i) => (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                      bookingStep >= i + 1 ? "bg-[#1B6B5E] text-white" : "bg-[#EDE8DF] text-[#7A7469]"
                    }`}>{i + 1}</div>
                    <span className={`text-xs font-medium hidden sm:inline ${bookingStep >= i + 1 ? "text-[#1C1A16]" : "text-[#7A7469]"}`}>{label}</span>
                    {i < 3 && <div className={`flex-1 h-px ${bookingStep > i + 1 ? "bg-[#1B6B5E]" : "bg-[#D8D2C5]"}`} />}
                  </div>
                ))}
              </div>
            )}

            <div className="p-6">
              {/* Step 1: Schedule */}
              {bookingStep === 1 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">Pick a date</label>
                    <input
                      type="date"
                      value={bookingForm.date}
                      onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">Pick a time slot</label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setBookingForm({ ...bookingForm, time: slot })}
                          className={`text-xs sm:text-sm font-medium px-2 py-2 rounded-lg border transition-colors ${
                            bookingForm.time === slot
                              ? "bg-[#1B6B5E] text-white border-[#1B6B5E]"
                              : "bg-white text-[#3D3A33] border-[#D8D2C5] hover:border-[#1B6B5E]"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    disabled={!bookingForm.date || !bookingForm.time}
                    onClick={() => setBookingStep(2)}
                    className="mt-2 bg-[#1B6B5E] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#155750] transition-colors"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 2: Details + flexible pricing */}
              {bookingStep === 2 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">Service address</label>
                    <input
                      type="text"
                      value={bookingForm.address}
                      onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                      placeholder="House no., street, area, city"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">Notes for the worker (optional)</label>
                    <textarea
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                      placeholder="Any specific requirements..."
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30 resize-none"
                    />
                  </div>

                  <div className="bg-[#E8F4F1] border border-[#1B6B5E]/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#1C1A16]">Flexible pricing</span>
                      <label className="flex items-center gap-2 text-xs text-[#3D3A33] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bookingForm.useCustomRate}
                          onChange={(e) => setBookingForm({ ...bookingForm, useCustomRate: e.target.checked })}
                          className="accent-[#1B6B5E]"
                        />
                        Propose my own rate
                      </label>
                    </div>
                    {bookingForm.useCustomRate ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[#1C1A16] font-semibold">₹</span>
                        <input
                          type="number"
                          value={bookingForm.proposedRate}
                          onChange={(e) => setBookingForm({ ...bookingForm, proposedRate: e.target.value })}
                          className="w-28 px-3 py-2 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                        />
                        <span className="text-xs text-[#7A7469]">/hr — worker can accept or counter this offer</span>
                      </div>
                    ) : (
                      <p className="text-xs text-[#3D3A33]">
                        Listed rate: <strong>₹{bookingWorker.hourlyRate}/hr</strong>. No middleman commission — the full amount goes to {bookingWorker.name.split(" ")[0]}.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 mt-1">
                    <button onClick={() => setBookingStep(1)} className="flex-1 border border-[#D8D2C5] text-[#1C1A16] font-medium py-3 rounded-xl hover:bg-[#EDE8DF] transition-colors">
                      Back
                    </button>
                    <button
                      disabled={!bookingForm.address}
                      onClick={() => setBookingStep(3)}
                      className="flex-1 bg-[#1B6B5E] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#155750] transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & confirm */}
              {bookingStep === 3 && (
                <div className="flex flex-col gap-4">
                  <h3 className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>Review your booking</h3>
                  <div className="bg-white border border-[#D8D2C5] rounded-xl divide-y divide-[#EDE8DF] text-sm">
                    <div className="flex justify-between px-4 py-3"><span className="text-[#7A7469]">Worker</span><span className="font-medium">{bookingWorker.name}</span></div>
                    <div className="flex justify-between px-4 py-3"><span className="text-[#7A7469]">Service</span><span className="font-medium">{bookingWorker.role}</span></div>
                    <div className="flex justify-between px-4 py-3"><span className="text-[#7A7469]">Date & time</span><span className="font-medium">{bookingForm.date} · {bookingForm.time}</span></div>
                    <div className="flex justify-between px-4 py-3"><span className="text-[#7A7469]">Address</span><span className="font-medium text-right max-w-[60%]">{bookingForm.address}</span></div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-[#7A7469]">Rate</span>
                      <span className="font-semibold text-[#1B6B5E]">
                        ₹{bookingForm.useCustomRate ? bookingForm.proposedRate : bookingWorker.hourlyRate}/hr
                        {bookingForm.useCustomRate && <span className="text-xs text-[#D97840] ml-1">(proposed)</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setBookingStep(2)} className="flex-1 border border-[#D8D2C5] text-[#1C1A16] font-medium py-3 rounded-xl hover:bg-[#EDE8DF] transition-colors">
                      Back
                    </button>
                    <button onClick={() => setBookingStep(4)} className="flex-1 bg-[#D97840] text-white font-semibold py-3 rounded-xl hover:bg-[#C0652F] transition-colors">
                      Continue to Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Payment */}
              {bookingStep === 4 && (
                <div className="flex flex-col gap-4">
                  <h3 className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>Payment</h3>
                  <div className="bg-white border border-[#D8D2C5] rounded-xl px-4 py-3 flex justify-between text-sm">
                    <span className="text-[#7A7469]">Amount due</span>
                    <span className="font-semibold text-[#1B6B5E]">₹{bookingForm.useCustomRate ? bookingForm.proposedRate : bookingWorker.hourlyRate}/hr</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: "upi", label: "UPI", icon: "📱" },
                      { id: "card", label: "Card", icon: "💳" },
                      { id: "cash", label: "Cash", icon: "💵" },
                    ] as const).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setBookingForm({ ...bookingForm, paymentMethod: m.id })}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                          bookingForm.paymentMethod === m.id ? "bg-[#E8F4F1] border-[#1B6B5E] text-[#1B6B5E]" : "bg-white border-[#D8D2C5] text-[#3D3A33]"
                        }`}
                      >
                        <span className="text-lg">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#7A7469]">Payment is held securely and released to the worker once you confirm the job is done. An invoice is generated after payment.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setBookingStep(3)} className="flex-1 border border-[#D8D2C5] text-[#1C1A16] font-medium py-3 rounded-xl hover:bg-[#EDE8DF] transition-colors">
                      Back
                    </button>
                    <button onClick={confirmBooking} className="flex-1 bg-[#1B6B5E] text-white font-semibold py-3 rounded-xl hover:bg-[#155750] transition-colors">
                      Pay & Confirm
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Success */}
              {bookingStep === 5 && (
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-[#E8F4F1] text-[#1B6B5E] flex items-center justify-center text-3xl">✓</div>
                  <h3 className="font-semibold text-xl" style={{ fontFamily: "'Fraunces', serif" }}>Booking confirmed & paid!</h3>
                  <p className="text-sm text-[#7A7469] max-w-xs">
                    {bookingWorker.name} has been notified for {bookingForm.date} at {bookingForm.time}. Booking ID:
                  </p>
                  <div className="bg-[#F7F2E9] border border-[#D8D2C5] rounded-lg px-4 py-2 font-mono text-sm font-semibold">{bookingId}</div>
                  <button onClick={downloadInvoice} className="w-full border border-[#1B6B5E] text-[#1B6B5E] font-semibold py-2.5 rounded-xl hover:bg-[#E8F4F1] transition-colors">
                    📄 Download Invoice
                  </button>
                  <button onClick={closeBooking} className="w-full bg-[#1B6B5E] text-white font-semibold py-3 rounded-xl hover:bg-[#155750] transition-colors">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SIGN IN MODAL ── */}
      {showSignIn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={closeSignIn}>
          <div className="bg-[#FDFAF4] rounded-3xl max-w-sm w-full border border-[#D8D2C5] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#D8D2C5]">
              <div>
                <h3 className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>
                  {signInStep === 2 ? t("welcomeExclaim") : t("welcomeBack")}
                </h3>
                {signInStep === 1 && (
                  <p className="text-xs text-[#7A7469] mt-0.5">
                    {authMode === "signup"
                      ? (authRole === "worker" ? t("createWorkerAccount") : t("createCustomerAccount"))
                      : (authRole === "worker" ? t("logInAsWorker") : t("logInToAccount"))}
                  </p>
                )}
              </div>
              <button onClick={closeSignIn} className="text-[#7A7469] hover:text-[#1C1A16] text-lg leading-none">✕</button>
            </div>

            {signInStep === 1 && (
              <div className="p-6 flex flex-col gap-4">
                {authError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{authError}</div>
                )}

                <button
                  onClick={signInWithGoogle}
                  disabled={authLoading}
                  className="flex items-center justify-center gap-2 border border-[#D8D2C5] bg-white text-[#1C1A16] font-semibold py-3 rounded-xl hover:bg-[#EDE8DF] transition-colors disabled:opacity-50"
                >
                  <span className="text-base font-bold" style={{ color: "#4285F4" }}>G</span> {t("continueWithGoogle")}
                </button>

                <div className="flex items-center gap-3 text-xs text-[#7A7469]">
                  <div className="flex-1 h-px bg-[#D8D2C5]" /> {t("orEmail")} <div className="flex-1 h-px bg-[#D8D2C5]" />
                </div>

                {authMode === "signup" && (
                  <div>
                    <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">{t("fullName")}</label>
                    <input
                      type="text"
                      value={signInName}
                      onChange={(e) => setSignInName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">{t("email")}</label>
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-[#1C1A16]">{t("password")}</label>
                    {authMode === "signin" && (
                      <button type="button" onClick={() => setAuthError(t("forgotPasswordHint"))} className="text-xs font-semibold text-[#1B6B5E] hover:underline">
                        {t("forgotPassword")}
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                  />
                </div>
                <button
                  disabled={authLoading || !signInEmail.trim() || signInPassword.trim().length < 6 || (authMode === "signup" && !signInName.trim())}
                  onClick={submitEmailAuth}
                  className="bg-[#1B6B5E] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#155750] transition-colors"
                >
                  {authLoading ? "Please wait…" : authMode === "signup" ? t("signUpBtn") : t("signInBtn")}
                </button>
                <button
                  onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setAuthError(""); }}
                  className="text-sm text-center text-[#1B6B5E] font-semibold hover:underline"
                >
                  {authMode === "signup" ? t("alreadyHaveAccount") : t("needAccount")}
                </button>
              </div>
            )}

            {signInStep === 2 && (
              <div className="p-6 flex flex-col items-center text-center gap-2 py-8">
                <div className="w-14 h-14 rounded-full bg-[#E8F4F1] text-[#1B6B5E] flex items-center justify-center text-2xl">✓</div>
                <p className="font-semibold">Signed in successfully!</p>
                <p className="text-sm text-[#7A7469]">{currentUser?.name}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── JOIN AS WORKER MODAL ── */}
      {showJoinWorker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={closeJoinWorker}>
          <div className="bg-[#FDFAF4] rounded-3xl max-w-md w-full border border-[#D8D2C5] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#D8D2C5]">
              <h3 className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>Join the cooperative</h3>
              <button onClick={closeJoinWorker} className="text-[#7A7469] hover:text-[#1C1A16] text-lg leading-none">✕</button>
            </div>
            <div className="p-6">
              {joinStep === 1 && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-[#7A7469]">Fill in your details — our cooperative team will verify and onboard you within 3 working days.</p>
                  <div>
                    <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">Full name</label>
                    <input
                      type="text"
                      value={joinForm.name}
                      onChange={(e) => setJoinForm({ ...joinForm, name: e.target.value })}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">Mobile number</label>
                    <input
                      type="tel"
                      value={joinForm.phone}
                      onChange={(e) => setJoinForm({ ...joinForm, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">Service you offer</label>
                    <select
                      value={joinForm.category}
                      onChange={(e) => setJoinForm({ ...joinForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                    >
                      {serviceCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">Years of experience</label>
                    <input
                      type="number"
                      value={joinForm.experience}
                      onChange={(e) => setJoinForm({ ...joinForm, experience: e.target.value })}
                      placeholder="e.g. 3"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#1C1A16] mb-1.5 block">Skill certificate / ID reference</label>
                    <input
                      type="text"
                      value={joinForm.certificate}
                      onChange={(e) => setJoinForm({ ...joinForm, certificate: e.target.value })}
                      placeholder="Certificate number, Aadhaar last 4 digits, etc."
                      className="w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
                    />
                    <p className="text-xs text-[#7A7469] mt-1">Used for digital verification of your skills and identity.</p>
                  </div>
                  <button
                    disabled={!joinForm.name || joinForm.phone.trim().length < 10}
                    onClick={submitJoinWorker}
                    className="mt-1 bg-[#D97840] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#C0652F] transition-colors"
                  >
                    Submit Application
                  </button>
                </div>
              )}
              {joinStep === 2 && (
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-[#E8F4F1] text-[#1B6B5E] flex items-center justify-center text-3xl">✓</div>
                  <h3 className="font-semibold text-xl" style={{ fontFamily: "'Fraunces', serif" }}>Application submitted!</h3>
                  <p className="text-sm text-[#7A7469] max-w-xs">
                    Welcome to the process, {joinForm.name.split(" ")[0]}! Our digital verification is running now — you're listed as searchable already, and a "Verified" badge appears on your profile within moments.
                  </p>
                  <div className="bg-[#F7F2E9] border border-[#D8D2C5] rounded-lg px-4 py-2 font-mono text-sm font-semibold">{joinRefId}</div>
                  <button onClick={closeJoinWorker} className="mt-3 w-full bg-[#1B6B5E] text-white font-semibold py-3 rounded-xl hover:bg-[#155750] transition-colors">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CHATBOT ── */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-5 right-5 z-[90] w-14 h-14 rounded-full bg-[#1B6B5E] text-white text-2xl shadow-xl hover:bg-[#155750] transition-colors flex items-center justify-center"
        aria-label="Open support chat"
      >
        {chatOpen ? "✕" : "💬"}
      </button>

      {chatOpen && (
        <div className="fixed bottom-24 right-5 z-[90] w-[90vw] max-w-sm h-[28rem] bg-[#FDFAF4] border border-[#D8D2C5] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-[#1B6B5E] text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">KS</div>
            <div>
              <div className="font-semibold text-sm">Kaamsetu Assistant</div>
              <div className="text-xs text-[#A8D5CB]">Usually replies instantly</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.sender === "bot"
                  ? "bg-white border border-[#D8D2C5] self-start rounded-bl-sm"
                  : "bg-[#1B6B5E] text-white self-end rounded-br-sm"
              }`}>
                {msg.text}
              </div>
            ))}
            {chatTyping && (
              <div className="bg-white border border-[#D8D2C5] self-start rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-[#7A7469]">typing...</div>
            )}
          </div>

          <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {chatQuickReplies.map((q) => (
              <button
                key={q}
                onClick={() => sendChatMessage(q)}
                className="shrink-0 text-xs font-medium bg-white border border-[#D8D2C5] text-[#3D3A33] px-3 py-1.5 rounded-full hover:border-[#1B6B5E] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }}
            className="border-t border-[#D8D2C5] p-3 flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 rounded-lg border border-[#D8D2C5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B6B5E]/30"
            />
            <button type="submit" className="bg-[#1B6B5E] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#155750] transition-colors">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
