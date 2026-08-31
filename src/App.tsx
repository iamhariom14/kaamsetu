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
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
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
  { id: "cleaning",        label: "Cleaning",         icon: "🧹", count: 5, color: "#E4EEFC", photo: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=450&fit=crop&auto=format" },
  { id: "plumbing",        label: "Plumbing",          icon: "🔧", count: 4, color: "#EAF2FE", photo: "https://images.unsplash.com/photo-1607472829760-9a3494b8e59d?w=600&h=450&fit=crop&auto=format" },
  { id: "carpentry",       label: "Carpentry",         icon: "🪚", count: 4, color: "#E0EAFC", photo: "https://images.unsplash.com/photo-1601058268499-e52e2e2a8e77?w=600&h=450&fit=crop&auto=format" },
  { id: "painting",        label: "Painting",          icon: "🖌️", count: 5, color: "#E8EEFE", photo: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=450&fit=crop&auto=format" },
  { id: "domestic",        label: "Domestic Help",     icon: "🏠", count: 5, color: "#E4EEFC", photo: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=600&h=450&fit=crop&auto=format" },
  { id: "caregiver",       label: "Caregiver",         icon: "🤝", count: 4, color: "#EAF2FE", photo: "https://images.unsplash.com/photo-1576765607924-3f7b1e1b3d0f?w=600&h=450&fit=crop&auto=format" },
  { id: "driver",          label: "Driver",            icon: "🚗", count: 5, color: "#E0EAFC", photo: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=450&fit=crop&auto=format" },
  { id: "gardening",       label: "Gardening",         icon: "🌿", count: 4, color: "#E4EEFC", photo: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=450&fit=crop&auto=format" },
  { id: "electrician",     label: "Electrician",       icon: "⚡", count: 5, color: "#EFF6FE", photo: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=450&fit=crop&auto=format" },
  { id: "technician",      label: "Technician",        icon: "🔩", count: 4, color: "#E8EEFE", photo: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=450&fit=crop&auto=format" },
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

// The Federation Admin portal (cross-cooperative oversight, worker
// verification, platform financials) is restricted to this one account —
// nobody else can see the "Federation" tab or open the admin page, even by
// navigating there directly.
const FEDERATION_ADMIN_EMAIL = "hariomprajapati6393@gmail.com";

// Demo earnings & welfare data for the worker dashboard's Earnings tab —
// stands in for real payout history until it's wired to a payments backend.
const demoMonthlyIncomeTrend = [
  { month: "Mar", amount: 4200 },
  { month: "Apr", amount: 5100 },
  { month: "May", amount: 3800 },
  { month: "Jun", amount: 5600 },
  { month: "Jul", amount: 6200 },
  { month: "Aug", amount: 4700 },
];
const demoPayoutHistory = [
  { label: "Aug 24", jobs: 6, amount: 4220 },
  { label: "Aug 17", jobs: 5, amount: 3640 },
  { label: "Aug 10", jobs: 7, amount: 4980 },
  { label: "Aug 03", jobs: 4, amount: 2810 },
];
const demoRecentCompletedJobs = [
  { customer: "Demo Account", amount: 250 },
  { customer: "Demo Account", amount: 350 },
  { customer: "Ashish Nehra", amount: 250 },
  { customer: "Demo Account", amount: 250 },
  { customer: "Demo Account", amount: 250 },
];
const demoThisMonthTotal = 13450;
const demoThisMonthJobs = 11;
const demoForecastText = "Demand is expected to rise 32% this week (monsoon season). Consider extending your available hours.";

// Demo profile/verification data for the worker dashboard's Profile tab —
// stands in for a real cooperative-society verification record.
const demoWorkerRating = 4.8;
const demoWorkerJobsDone = 217;
const demoWorkerExperienceYears = 6;
const demoWorkerSkills = ["Plumbing"];
const demoWorkerSociety = "Jaipur Labour Cooperative Society #JLC-0412";
const demoWorkerCertifications = [
  { name: "ITI Trade Certificate", status: "Verified" },
  { name: "Police Verification", status: "Verified" },
  { name: "Society Membership", status: "Active" },
];

// Demo incoming requests so the Jobs tab isn't empty by default — stands in
// until real customer bookings start coming through.
const demoInitialWorkerRequests: WorkerRequest[] = [
  {
    id: "demo-req-1",
    customerName: "Anita Sharma",
    workerName: "You",
    service: "Leak Repair",
    category: "plumbing",
    date: "Today",
    time: "3:00 PM",
    address: "C-42, Lajpat Nagar, Delhi",
    rate: "420",
    status: "pending",
  },
  {
    id: "demo-req-2",
    customerName: "Vikram Singh",
    workerName: "You",
    service: "Bathroom Fitting",
    category: "plumbing",
    date: "Tomorrow",
    time: "11:00 AM",
    address: "B-7, Patel Nagar, Delhi",
    rate: "390",
    status: "pending",
  },
  {
    id: "demo-req-3",
    customerName: "Fatima Khan",
    workerName: "You",
    service: "Water Heater Repair",
    category: "plumbing",
    date: "Aug 27",
    time: "5:00 PM",
    address: "F-19, Janakpuri, Delhi",
    rate: "350",
    status: "accepted",
    etaMinutes: 25,
  },
];

type Worker = Omit<(typeof workers)[number], "id"> & {
  id: number | string;
  verified?: boolean;
  email?: string;
  certificateNote?: string;
  // Extra fields collected on "Join the Cooperative" — kept on the worker
  // record so the Federation's verification queue has everything it needs
  // to check the applicant (certificate, address, phone, age) before
  // approving or rejecting them.
  phone?: string;
  age?: number;
  address?: string;
  certificateFileName?: string;
  certificateDataUrl?: string;
};

// Small blue verification badge — shown next to a worker's name once the
// Federation has approved their application. Deliberately its own component
// so every place a worker's name appears (search cards, service-detail
// cards, dashboard profile) renders the exact same "blue tick".
function VerifiedTick({ size = 16, title = "Federation verified" }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="inline-block align-middle shrink-0"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path
        fill="#1D9BF0"
        d="M12 2.5c.6 0 1.16.24 1.58.66l1.2 1.22 1.7-.1a2.24 2.24 0 0 1 2.24 1.6l.47 1.64 1.64.47a2.24 2.24 0 0 1 1.6 2.24l-.1 1.7 1.22 1.2c.42.42.66.98.66 1.58s-.24 1.16-.66 1.58l-1.22 1.2.1 1.7a2.24 2.24 0 0 1-1.6 2.24l-1.64.47-.47 1.64a2.24 2.24 0 0 1-2.24 1.6l-1.7-.1-1.2 1.22a2.24 2.24 0 0 1-3.16 0l-1.2-1.22-1.7.1a2.24 2.24 0 0 1-2.24-1.6l-.47-1.64-1.64-.47a2.24 2.24 0 0 1-1.6-2.24l.1-1.7-1.22-1.2A2.24 2.24 0 0 1 1.5 12c0-.6.24-1.16.66-1.58l1.22-1.2-.1-1.7a2.24 2.24 0 0 1 1.6-2.24l1.64-.47.47-1.64a2.24 2.24 0 0 1 2.24-1.6l1.7.1 1.2-1.22c.42-.42.98-.66 1.58-.66Z"
      />
      <path
        fill="#fff"
        d="M9.9 16.2 6.3 12.6l1.4-1.4 2.2 2.2 5.4-5.4 1.4 1.4Z"
      />
    </svg>
  );
}

// Builds a searchable Worker profile out of the "Join the Cooperative" form —
// used for workers who register through "Join as Worker" or worker sign-up
// (their full profile lives in Firestore; this is just enough to list them
// in search results, worker cards, and the Federation's verification queue).
// `email` lets a booking made against this worker be routed to them live if
// they're signed in with that email.
function buildCommunityWorker(
  id: number | string,
  name: string,
  categoryId: string,
  experience: number,
  verified = true,
  email = "",
  certificateNote = "",
  hourlyRate = 0,
  phone = "",
  age = 0,
  address = "",
  certificateFileName = "",
  certificateDataUrl = ""
): Worker {
  const cat = serviceCategories.find((c) => c.id === categoryId);
  return {
    id,
    name: name || "Cooperative Worker",
    role: cat ? cat.label : "Cooperative Worker",
    category: categoryId || "domestic",
    rating: 0,
    reviews: 0,
    experience: experience || 0,
    hourlyRate,
    location: address || "",
    tags: ["New member"],
    image: personImgFallback(name || "Worker", "1B6B5E"),
    available: true,
    cooperative: true,
    verified,
    email,
    certificateNote,
    phone,
    age,
    address,
    certificateFileName,
    certificateDataUrl,
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
  customerEmail?: string;
  workerName: string;
  workerEmail?: string;
  service: string;
  category: string;
  date: string;
  time: string;
  address: string;
  lat?: number;
  lng?: number;
  rate: string;
  urgent?: boolean;
  status: "pending" | "accepted" | "completed" | "rejected";
  etaMinutes?: number;
  paymentMethod?: string;
  customerRating?: number;
  customerFeedback?: string;
  workerRating?: number;
  workerFeedback?: string;
};
// `recipientEmail` routes a notification to one signed-in person live via
// Firestore; `forRole` is kept as a fallback for the shared demo roster
// (static/seed workers who have no real account to route to).
type AppNotification = { id: string; text: string; time: string; forRole: "customer" | "worker"; recipientEmail?: string; bookingId?: string };

// A complaint one side of a booking files against the other. Filing one
// routes the accused person's details straight into the Federation admin's
// Complaints queue (next to Verification) for cooperative review.
type Complaint = {
  id: string;
  bookingId: string;
  service: string;
  filedByRole: "customer" | "worker";
  filedByName: string;
  filedByEmail?: string;
  againstRole: "customer" | "worker";
  againstName: string;
  againstEmail?: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt?: unknown;
};

type Lang = "en" | "hi";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    services: "Services",
    howItWorks: "How it Works",
    workers: "Workers",
    stories: "Stories",
    joinAsWorker: "Join as Worker",
    joinAsCustomer: "Join as Customer",
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
    memberCooperatives: "Verified workers",
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
    joinAsCustomer: "ग्राहक के रूप में जुड़ें",
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
    memberCooperatives: "सत्यापित कामगार",
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

type ChatLang = "en" | "hi";

const chatQuickRepliesByLang: Record<ChatLang, string[]> = {
  en: ["Track my booking", "File a complaint", "Give feedback", "Payment issue", "Talk to a human"],
  hi: ["मेरी बुकिंग ट्रैक करें", "शिकायत दर्ज करें", "फीडबैक दें", "भुगतान समस्या", "किसी व्यक्ति से बात करें"],
};

function getBotReply(message: string, chatLang: ChatLang = "en"): string {
  const m = message.toLowerCase();
  if (chatLang === "hi") {
    if (m.includes("track") || m.includes("status") || m.includes("ट्रैक") || m.includes("स्टेटस")) {
      return "आप अपनी बुकिंग की स्थिति 'My Bookings' से कभी भी ट्रैक कर सकते हैं। आपका कामगार आने से पहले आपको संदेश भी भेजेगा। 📍";
    }
    if ((m.includes("complaint") || m.includes("problem") || m.includes("issue") || m.includes("शिकायत") || m.includes("समस्या")) && !m.includes("payment") && !m.includes("भुगतान")) {
      return "यह सुनकर खेद है। कृपया कुछ शब्दों में बताएं कि क्या हुआ — हमारी सहकारी सहायता टीम हर शिकायत की समीक्षा 24 घंटों के भीतर करती है, और सुरक्षा से जुड़ी चिंताओं को तुरंत आगे बढ़ाया जाता है।";
    }
    if (m.includes("feedback") || m.includes("review") || m.includes("suggest") || m.includes("फीडबैक") || m.includes("सुझाव")) {
      return "साझा करने के लिए धन्यवाद! ऐसी प्रतिक्रिया हमारे कामगार-सदस्यों को बेहतर बनाने में मदद करती है। आप हर पूरी हुई बुकिंग के बाद स्टार रेटिंग भी दे सकते हैं। ⭐";
    }
    if (m.includes("payment") || m.includes("refund") || m.includes("charge") || m.includes("money") || m.includes("भुगतान") || m.includes("पैसे") || m.includes("रिफंड")) {
      return "भुगतान या रिफंड से जुड़ी समस्याओं के लिए कृपया अपनी बुकिंग आईडी साझा करें, हम 2 कार्य दिवसों के भीतर इसे हल कर देंगे। काम पूरा होने की पुष्टि करने के बाद ही कामगार को भुगतान किया जाता है।";
    }
    if (m.includes("human") || m.includes("agent") || m.includes("call") || m.includes("support") || m.includes("व्यक्ति") || m.includes("सहायता") || m.includes("बात")) {
      return "अभी आपको हमारी सहायता टीम से जोड़ रहे हैं — एक सहकारी सदस्य आपके पंजीकृत नंबर पर 30 मिनट के भीतर कॉल करेगा। 📞";
    }
    if (m.includes("price") || m.includes("rate") || m.includes("cost") || m.includes("कीमत") || m.includes("दर") || m.includes("रेट")) {
      return "हर कामगार अपनी उचित दर खुद तय करता है। बुकिंग करते समय आप अपनी दर भी प्रस्तावित कर सकते हैं और कामगार उसे स्वीकार या काउंटर कर सकता है।";
    }
    if (m.includes("hi") || m.includes("hello") || m.includes("hey") || m.includes("नमस्ते") || m.includes("हैलो")) {
      return "नमस्ते! 👋 मैं कामसेतु का सहायक हूं। मैं बुकिंग, शिकायत, भुगतान या फीडबैक में मदद कर सकता हूं। आपको किस चीज़ में मदद चाहिए?";
    }
    return "समझ गया, मैंने इसे नोट कर लिया है। अगर इसे तुरंत ध्यान देने की जरूरत है, तो 'किसी व्यक्ति से बात करें' पर टैप करें और हमारी टीम जल्द ही आपसे संपर्क करेगी।";
  }
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
  const [adminView, setAdminView] = useState<"overview" | "verification" | "complaints" | "bookings">("overview");
  function goToAdmin() {
    setPage("admin");
    setAdminView("overview");
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function adminApproveWorker(id: string | number) {
    setCommunityWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, verified: true } : w)));
    updateDoc(doc(db, "workers", String(id)), { verified: true }).catch((err) => console.error("Failed to save verification:", err));
  }
  function adminRejectWorker(id: string | number) {
    setCommunityWorkers((prev) => prev.filter((w) => w.id !== id));
  }

  // Federation tab in the nav — jumps straight into the cross-cooperative
  // admin portal. Before signing in, this sits alongside "Join as Worker" /
  // "Join as Customer"; once signed in, those two join actions are disabled
  // and only Federation remains, since the person now has their own profile.
  const activeMode: "federation" | "other" = page === "admin" ? "federation" : "other";
  function switchMode(mode: "federation") {
    setMobileMenuOpen(false);
    if (mode === "federation") {
      goToAdmin();
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
    pincode: "",
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    urgent: false,
    notes: "",
    useCustomRate: false,
    proposedRate: "",
    paymentMethod: "upi" as "upi" | "card" | "cash",
  });
  const [locatingMe, setLocatingMe] = useState(false);
  const [locateError, setLocateError] = useState("");
  // Uses the browser's GPS + a map reverse-geocoding lookup to fill the
  // address and pincode automatically, so the customer doesn't have to type
  // their location by hand — same idea as "use current location" on Google Maps.
  // The raw coordinates are kept too, so the worker gets a real "open in
  // Google Maps" link to navigate to, not just typed-out text.
  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocateError("Location isn't supported on this device.");
      return;
    }
    setLocatingMe(true);
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await res.json();
          const addr = data?.address || {};
          const pincode = addr.postcode || "";
          const readable = data?.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setBookingForm((prev) => ({ ...prev, address: readable, pincode, lat: latitude, lng: longitude }));
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
          setBookingForm((prev) => ({ ...prev, address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, lat: latitude, lng: longitude }));
          setLocateError("Couldn't fetch the exact address, but we've saved your coordinates.");
        } finally {
          setLocatingMe(false);
        }
      },
      () => {
        setLocatingMe(false);
        setLocateError("Couldn't access your location. Please allow location access or enter it manually.");
      }
    );
  }
  const [bookingId, setBookingId] = useState("");
  const [lastInvoice, setLastInvoice] = useState<{ id: string; workerName: string; service: string; date: string; time: string; address: string; rate: string; paymentMethod: string } | null>(null);

  // Chatbot
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: "bot", text: "Hi! 👋 I'm Kaamsetu's assistant. Ask me about bookings, complaints, payments, or feedback." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatTyping, setChatTyping] = useState(false);
  const [chatLang, setChatLang] = useState<ChatLang>("en");

  // Sign in (email/password or Google) with a Customer / Worker role tab
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInStep, setSignInStep] = useState(1); // 1 = form, 2 = success
  const [authRole, setAuthRole] = useState<"customer" | "worker">("customer");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [signInName, setSignInName] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
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
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const notifPanelRef = useRef<HTMLDivElement | null>(null);
  // Clicking anywhere outside an open dropdown (account menu or
  // notifications panel) closes it — instead of it staying open until the
  // same button is tapped again.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountMenuOpen && accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (notifPanelOpen && notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setNotifPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen, notifPanelOpen]);
  const [lang, setLang] = useState<Lang>("en");
  function t(key: string) {
    return translations[lang][key] ?? key;
  }

  // Booking requests (worker side) + notifications (both sides). Simulated
  // client-side since this app has no backend to push real-time events —
  // any signed-in worker sees all incoming requests, standing in for "the"
  // cooperative worker in this demo.
  //
  // `workerRequests` holds the local demo/seed bookings (interacted with
  // purely in local state, as before). `liveBookings` mirrors the Firestore
  // "bookings" collection in real time via onSnapshot — so a booking made in
  // one browser/account shows up instantly in another signed-in session
  // (e.g. a worker account in one tab, a customer account in another).
  // The two lists are combined for display; a booking's id tells the
  // mutation functions below which store to write to.
  const [workerRequests, setWorkerRequests] = useState<WorkerRequest[]>(demoInitialWorkerRequests);
  const [liveBookings, setLiveBookings] = useState<WorkerRequest[]>([]);
  const liveBookingIds = new Set(liveBookings.map((b) => b.id));
  const allRequests = [...liveBookings, ...workerRequests];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bookings"), (snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WorkerRequest, "id">) }));
      loaded.sort((a, b) => (a.id < b.id ? 1 : -1));
      setLiveBookings(loaded);
    }, (err) => console.error("Failed to sync live bookings:", err));
    return () => unsub();
  }, []);

  // Complaints either side files against the other on a booking — synced
  // live so they show up in the Federation admin's Complaints tab right away.
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "complaints"), (snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Complaint, "id">) }));
      loaded.sort((a, b) => (a.id < b.id ? 1 : -1));
      setComplaints(loaded);
    }, (err) => console.error("Failed to sync complaints:", err));
    return () => unsub();
  }, []);

  // `notifications` is fully Firestore-backed and scoped to whoever is
  // currently signed in (matched on email), so accept/complete/feedback
  // messages actually reach the other person's account in real time —
  // not just the same browser tab.
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [seenNotifIds, setSeenNotifIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isSignedIn || !currentUser?.email) {
      setNotifications([]);
      return;
    }
    const q = query(collection(db, "notifications"), where("recipientEmail", "==", currentUser.email));
    const unsub = onSnapshot(q, (snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, "id">) }));
      loaded.sort((a, b) => (a.id < b.id ? 1 : -1));
      setNotifications(loaded);
    }, (err) => console.error("Failed to sync notifications:", err));
    return () => unsub();
  }, [isSignedIn, currentUser?.email]);

  // Worker dashboard bottom tabs (Jobs / Earnings / Profile) + mock "withdraw
  // to bank" flow — no real payments backend, just a demo confirmation.
  const [workerTab, setWorkerTab] = useState<"jobs" | "earnings" | "profile">("jobs");
  const [withdrawStatus, setWithdrawStatus] = useState<string | null>(null);
  const [hoveredIncomeIdx, setHoveredIncomeIdx] = useState<number | null>(null);
  const [hoveredPayoutIdx, setHoveredPayoutIdx] = useState<number | null>(null);
  function handleWithdraw() {
    setWithdrawStatus("Processing withdrawal…");
    setTimeout(() => {
      setWithdrawStatus(`₹${demoThisMonthTotal.toLocaleString("en-IN")} withdrawal initiated to your linked bank account. It typically settles within 1–2 business days.`);
    }, 900);
  }

  // Writes a notification to Firestore so it reaches the recipient's own
  // signed-in session live (see the onSnapshot listener above). `forRole` is
  // kept for display purposes; `recipientEmail` is what actually routes it.
  // Static/seed demo workers have no real account/email, so notifications
  // aimed at them are skipped — there's no one signed in to receive them.
  async function pushNotification(forRole: "customer" | "worker", text: string, recipientEmail?: string, bookingId?: string) {
    if (!recipientEmail) return;
    try {
      await addDoc(collection(db, "notifications"), {
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        forRole,
        recipientEmail,
        ...(bookingId ? { bookingId } : {}),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  }

  // Join as worker
  const [showJoinWorker, setShowJoinWorker] = useState(false);
  const [joinStep, setJoinStep] = useState(1);
  const [joinForm, setJoinForm] = useState({
    name: "",
    email: "",
    phone: "",
    category: serviceCategories[0].id, // primary skill / service offered
    age: "",
    experience: "",
    hourlyRate: "",
    address: "",
    certificateNote: "",
  });
  const [joinPhotoPreview, setJoinPhotoPreview] = useState(""); // data URL, local preview only
  const [joinPhotoName, setJoinPhotoName] = useState("");
  const [joinCertificateName, setJoinCertificateName] = useState("");
  const [joinCertificateDataUrl, setJoinCertificateDataUrl] = useState(""); // data URL of the actual uploaded file
  const [joinCertificateError, setJoinCertificateError] = useState("");
  const [joinAuthError, setJoinAuthError] = useState("");
  const [joinRefId, setJoinRefId] = useState("");
  const [joinLocating, setJoinLocating] = useState(false);
  const [joinLocateError, setJoinLocateError] = useState("");
  // Same "use current location" idea as the booking form's — GPS + reverse
  // geocoding — but fills the worker's own address field during signup
  // instead of a booking's service address.
  function useCurrentLocationForJoin() {
    if (!navigator.geolocation) {
      setJoinLocateError("Location isn't supported on this device.");
      return;
    }
    setJoinLocating(true);
    setJoinLocateError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await res.json();
          const readable = data?.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setJoinForm((prev) => ({ ...prev, address: readable }));
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
          setJoinForm((prev) => ({ ...prev, address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
          setJoinLocateError("Couldn't fetch the exact address, but we've saved your coordinates.");
        } finally {
          setJoinLocating(false);
        }
      },
      () => {
        setJoinLocating(false);
        setJoinLocateError("Couldn't access your location. Please allow location access or enter it manually.");
      }
    );
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  async function handleJoinPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setJoinPhotoName(file.name);
    try {
      setJoinPhotoPreview(await readFileAsDataUrl(file));
    } catch (err) {
      console.error("Failed to read profile photo:", err);
    }
  }
  // Certificate upload — previously this only remembered the file's *name*
  // and threw away the actual file, so the Federation admin panel had
  // nothing to open. Now the file itself is read and kept (as a data URL)
  // so it can be saved to Firestore and viewed/opened from the admin panel.
  async function handleJoinCertificateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setJoinCertificateError("");
    // Firestore documents cap out at ~1MB total, so keep the encoded file
    // comfortably under that limit.
    if (file.size > 700 * 1024) {
      setJoinCertificateError("File is too large — please upload a certificate under 700KB.");
      return;
    }
    setJoinCertificateName(file.name);
    try {
      setJoinCertificateDataUrl(await readFileAsDataUrl(file));
    } catch (err) {
      console.error("Failed to read certificate file:", err);
      setJoinCertificateError("Couldn't read that file — please try again.");
    }
  }

  // Join as customer
  const [showJoinCustomer, setShowJoinCustomer] = useState(false);
  const [joinCustomerStep, setJoinCustomerStep] = useState(1);
  const [joinCustomerForm, setJoinCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [joinCustomerPhotoPreview, setJoinCustomerPhotoPreview] = useState("");
  const [joinCustomerPhotoName, setJoinCustomerPhotoName] = useState("");
  const [joinCustomerRefId, setJoinCustomerRefId] = useState("");

  function openJoinCustomer() {
    setShowJoinCustomer(true);
    setJoinCustomerStep(1);
    setJoinCustomerForm({ name: "", email: "", phone: "", address: "" });
    setJoinCustomerPhotoPreview("");
    setJoinCustomerPhotoName("");
  }
  function closeJoinCustomer() {
    setShowJoinCustomer(false);
  }
  async function handleJoinCustomerPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setJoinCustomerPhotoName(file.name);
    try {
      setJoinCustomerPhotoPreview(await readFileAsDataUrl(file));
    } catch (err) {
      console.error("Failed to read profile photo:", err);
    }
  }
  // Registers a new customer, saves their profile to Firestore ("customers"
  // collection), then signs them straight in so their profile is what they
  // land on next — matching the flow for "Join as Worker".
  async function submitJoinCustomer() {
    const refId = "CUST-" + Math.floor(100000 + Math.random() * 900000);
    const name = joinCustomerForm.name.trim();
    const email = joinCustomerForm.email.trim();
    const phone = joinCustomerForm.phone.trim();
    const address = joinCustomerForm.address.trim();
    setJoinCustomerRefId(refId);
    setJoinCustomerStep(2);
    try {
      await addDoc(collection(db, "customers"), {
        name,
        email,
        phone,
        address,
        photoFileName: joinCustomerPhotoName,
        refId,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to save customer profile:", err);
    }
    setCurrentUser({ name: name || "Member", email, photoURL: joinCustomerPhotoPreview || null });
    setUserRole("customer");
    setIsSignedIn(true);
  }

  // Workers who registered via "Join as Worker" or worker sign-up, persisted
  // in Firestore ("workers" collection) so they stay searchable across
  // sessions. Loaded once on mount and combined with the static roster.
  const [communityWorkers, setCommunityWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "workers"),
      (snap) => {
        const loaded = snap.docs.map((d) => {
          const data = d.data() as {
            name?: string; category?: string; experience?: number | string; verified?: boolean; email?: string;
            certificateNote?: string; hourlyRate?: number | string; phone?: string; age?: number | string;
            address?: string; certificateFileName?: string; certificateDataUrl?: string;
          };
          return buildCommunityWorker(
            d.id,
            data.name || "",
            data.category || "",
            Number(data.experience) || 0,
            data.verified !== false,
            data.email || "",
            data.certificateNote || "",
            Number(data.hourlyRate) || 0,
            data.phone || "",
            Number(data.age) || 0,
            data.address || "",
            data.certificateFileName || "",
            data.certificateDataUrl || ""
          );
        });
        setCommunityWorkers(loaded);
      },
      (err) => console.error("Failed to load worker profiles:", err)
    );
    return () => unsub();
  }, []);

  const allWorkers: Worker[] = [...workers, ...communityWorkers];

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
    setBookingForm({ date: "", time: "", address: "", pincode: "", lat: undefined, lng: undefined, urgent: false, notes: "", useCustomRate: false, proposedRate: String(worker.hourlyRate), paymentMethod: "upi" });
    setLocateError("");
  }

  function closeBooking() {
    setBookingWorker(null);
    setBookingStep(1);
  }

  // Smart Booking & Service Management — confirms the booking, records it
  // for the worker's dashboard, and generates a downloadable invoice once
  // payment (mock) has gone through.
  async function confirmBooking() {
    if (!bookingWorker) return;
    const id = "KS-" + Math.floor(100000 + Math.random() * 900000);
    const rate = bookingForm.useCustomRate ? bookingForm.proposedRate : String(bookingWorker.hourlyRate);
    const fullAddress = bookingForm.pincode ? `${bookingForm.address} - ${bookingForm.pincode}` : bookingForm.address;
    setBookingId(id);
    setBookingStep(5);
    const customerName = currentUser?.name || "A customer";
    const customerEmail = currentUser?.email || "";
    const workerEmail = bookingWorker.email || "";
    const newBooking: WorkerRequest = {
      id,
      customerName,
      customerEmail,
      workerName: bookingWorker.name,
      workerEmail,
      service: bookingWorker.role,
      category: bookingWorker.category,
      date: bookingForm.urgent ? "Today" : bookingForm.date,
      time: bookingForm.urgent ? "ASAP — right now" : bookingForm.time,
      address: fullAddress,
      lat: bookingForm.lat,
      lng: bookingForm.lng,
      rate,
      urgent: bookingForm.urgent,
      status: "pending",
      paymentMethod: bookingForm.paymentMethod,
    };
    // Real bookings are written to Firestore (not local state) so the
    // request reaches the worker's own signed-in session live, wherever
    // they are — this is what lets two separate accounts (customer in one
    // login, worker in another) actually notify each other in real time.
    try {
      await setDoc(doc(db, "bookings", id), newBooking);
    } catch (err) {
      console.error("Failed to save booking:", err);
      // fall back to local-only so the demo flow still completes
      setWorkerRequests((prev) => [newBooking, ...prev]);
    }
    setLastInvoice({
      id,
      workerName: bookingWorker.name,
      service: bookingWorker.role,
      date: newBooking.date,
      time: newBooking.time,
      address: fullAddress,
      rate,
      paymentMethod: bookingForm.paymentMethod,
    });
    if (workerEmail) {
      pushNotification(
        "worker",
        bookingForm.urgent
          ? `🔴 URGENT: ${customerName} needs a ${bookingWorker.role.toLowerCase()} right now! Address: ${fullAddress}`
          : `New booking request from ${customerName} for ${newBooking.date} at ${newBooking.time}.`,
        workerEmail,
        id
      );
    }
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
      setChatMessages((prev) => [...prev, { sender: "bot", text: getBotReply(message, chatLang) }]);
      setChatTyping(false);
    }, 600);
  }

  function switchChatLang(next: ChatLang) {
    if (next === chatLang) return;
    setChatLang(next);
    setChatMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: next === "hi" ? "ठीक है, अब मैं हिंदी में जवाब दूंगा। 🙂" : "Sure, I'll reply in English from now on.",
      },
    ]);
  }

  function openSignIn(role: "customer" | "worker" = "customer") {
    setShowSignIn(true);
    setAuthRole(role);
    setAuthMode("signin");
    setSignInStep(1);
    setSignInName("");
    setSignInEmail("");
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

  // When someone signs up as a worker straight from the Sign In popup
  // (rather than the dedicated "Join as Worker" button), send them into the
  // exact same full onboarding form — pre-filled with the name/email they
  // just used — instead of a bare "signed in" screen with no skills/photo/
  // certificate on file.
  function redirectToWorkerOnboarding(name: string, email: string) {
    setJoinForm((prev) => ({ ...prev, name, email }));
    setJoinStep(1);
    setShowSignIn(false);
    setShowJoinWorker(true);
  }

  async function signInWithGoogle() {
    if (authLoading) return;
    setAuthError("");
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const name = user.displayName || "Member";
      const email = user.email || "";
      setCurrentUser({ name, email, photoURL: user.photoURL });
      setIsSignedIn(true);
      applyUserRole(authRole);
      if (authMode === "signup" && authRole === "worker") {
        redirectToWorkerOnboarding(name, email);
        return;
      }
      if (authRole === "worker") {
        saveWorkerAuthProfile(user.uid, name, email);
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

  // No password field is shown anywhere in the UI anymore — the person only
  // ever types their email. Under the hood we still use Firebase's email/
  // password auth (so the rest of the app — uid-keyed worker profiles,
  // Firestore rules, etc. — needs no changes), but the "password" is derived
  // from the email itself. That means typing the same email again always
  // resolves to the same Firebase account, so the same profile just opens
  // automatically — no form to refill, nothing to remember beyond the email.
  function deriveEmailSecret(email: string): string {
    const normalized = email.trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
    }
    return `ks-${hash.toString(36)}-${normalized.length}!Aa1`;
  }

  async function submitEmailAuth() {
    if (authLoading) return;
    const email = signInEmail.trim();
    if (!email) return;
    setAuthError("");
    setAuthLoading(true);
    try {
      const secret = deriveEmailSecret(email);
      let cred;
      let isNewAccount = false;
      try {
        // Same email as before → this succeeds and hands back the exact
        // same account (and uid) as last time.
        cred = await signInWithEmailAndPassword(auth, email, secret);
      } catch (signInErr: unknown) {
        const code = (signInErr as { code?: string })?.code || "";
        if (code.includes("user-not-found") || code.includes("invalid-credential") || code.includes("wrong-password")) {
          // First time seeing this email → create the account.
          cred = await createUserWithEmailAndPassword(auth, email, secret);
          isNewAccount = true;
        } else {
          throw signInErr;
        }
      }
      if (isNewAccount && signInName.trim()) {
        await updateProfile(cred.user, { displayName: signInName.trim() });
      }
      const name = cred.user.displayName || signInName.trim() || email.split("@")[0] || "Member";
      setCurrentUser({ name, email: cred.user.email || email, photoURL: cred.user.photoURL });
      setIsSignedIn(true);

      // Returning workers already have a profile saved under their uid —
      // detect that and send them straight to their dashboard instead of
      // the onboarding form.
      let resolvedRole: "customer" | "worker" = authRole;
      if (!isNewAccount) {
        try {
          const workerSnap = await getDoc(doc(db, "workers", cred.user.uid));
          resolvedRole = workerSnap.exists() ? "worker" : "customer";
        } catch (err) {
          console.error("Failed to check existing profile:", err);
        }
      }
      applyUserRole(resolvedRole);

      if (isNewAccount && resolvedRole === "worker") {
        redirectToWorkerOnboarding(name, cred.user.email || email);
        return;
      }
      setSignInStep(2);
      setTimeout(() => setShowSignIn(false), 1000);
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string })?.code || "";
      if (code.includes("invalid-email")) setAuthError("Please enter a valid email address.");
      else setAuthError("Something went wrong. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  // Federation page has its own lightweight email/password login, separate
  // from the Customer/Worker sign-in above — anyone can use it to check the
  // live member count; only FEDERATION_ADMIN_EMAIL unlocks the admin panel.
  const [fedEmail, setFedEmail] = useState("");
  const [fedPassword, setFedPassword] = useState("");
  const [fedError, setFedError] = useState("");
  const [fedLoading, setFedLoading] = useState(false);
  const [fedGoogleLoading, setFedGoogleLoading] = useState(false);
  async function submitFederationGoogleLogin() {
    if (fedGoogleLoading) return;
    setFedError("");
    setFedGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setCurrentUser({ name: user.displayName || "Member", email: user.email || "", photoURL: user.photoURL });
      setIsSignedIn(true);
    } catch (err) {
      console.error(err);
      setFedError("Couldn't sign in with Google. Please try again.");
    } finally {
      setFedGoogleLoading(false);
    }
  }
  async function submitFederationLogin() {
    if (fedLoading) return;
    if (!fedEmail.trim() || fedPassword.trim().length < 6) return;
    setFedError("");
    setFedLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, fedEmail.trim(), fedPassword);
      setCurrentUser({ name: cred.user.displayName || cred.user.email?.split("@")[0] || "Member", email: cred.user.email || "", photoURL: cred.user.photoURL });
      setIsSignedIn(true);
      setFedPassword("");
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string })?.code || "";
      if (code.includes("wrong-password") || code.includes("invalid-credential")) setFedError("Incorrect email or password.");
      else if (code.includes("user-not-found")) setFedError("No account found with this email.");
      else setFedError("Something went wrong. Please try again.");
    } finally {
      setFedLoading(false);
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

  async function acceptRequest(id: string) {
    const eta = 15 + Math.floor(Math.random() * 30); // 15–45 minutes
    const req = allRequests.find((r) => r.id === id);
    if (liveBookingIds.has(id)) {
      try {
        await updateDoc(doc(db, "bookings", id), { status: "accepted", etaMinutes: eta });
      } catch (err) {
        console.error("Failed to accept booking:", err);
      }
    } else {
      setWorkerRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "accepted", etaMinutes: eta } : r)));
    }
    pushNotification("customer", `${req?.workerName ?? "Your worker"} accepted your booking! Arriving in about ${eta} minutes.`, req?.customerEmail);
  }
  async function rejectRequest(id: string) {
    const req = allRequests.find((r) => r.id === id);
    if (liveBookingIds.has(id)) {
      try {
        await updateDoc(doc(db, "bookings", id), { status: "rejected" });
      } catch (err) {
        console.error("Failed to reject booking:", err);
      }
    } else {
      setWorkerRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)));
    }
    pushNotification("customer", `${req?.workerName ?? "The worker"} isn't available for your requested slot. Please try another worker.`, req?.customerEmail);
  }
  // Lets a customer rate a worker after an accepted/completed job — part of
  // Smart Booking & Service Management's rating step.
  function rateBooking(id: string, stars: number) {
    if (liveBookingIds.has(id)) {
      updateDoc(doc(db, "bookings", id), { customerRating: stars }).catch((err) => console.error("Failed to save rating:", err));
    } else {
      setWorkerRequests((prev) => prev.map((r) => (r.id === id ? { ...r, customerRating: stars } : r)));
    }
  }

  // Worker marks a job done once the work is actually finished. This is what
  // unlocks the feedback form on both sides (customer's Work History and the
  // worker's Jobs tab).
  async function completeJob(id: string) {
    const req = allRequests.find((r) => r.id === id);
    if (liveBookingIds.has(id)) {
      try {
        await updateDoc(doc(db, "bookings", id), { status: "completed" });
      } catch (err) {
        console.error("Failed to complete job:", err);
      }
    } else {
      setWorkerRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "completed" } : r)));
    }
    pushNotification("customer", `Your ${req?.service ?? "job"} with ${req?.workerName ?? "your worker"} is marked complete. Please leave feedback!`, req?.customerEmail);
  }

  // Shared feedback form — same component/shape for both the customer
  // (rating + note about the worker) and the worker (rating + note about the
  // customer), opened from either side once a job's status is "completed".
  const [feedbackTarget, setFeedbackTarget] = useState<{ bookingId: string; role: "customer" | "worker" } | null>(null);
  const [feedbackStars, setFeedbackStars] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");

  function openFeedback(bookingId: string, role: "customer" | "worker") {
    const req = allRequests.find((r) => r.id === bookingId);
    setFeedbackTarget({ bookingId, role });
    setFeedbackStars((role === "customer" ? req?.customerRating : req?.workerRating) ?? 0);
    setFeedbackText((role === "customer" ? req?.customerFeedback : req?.workerFeedback) ?? "");
  }
  function closeFeedback() {
    setFeedbackTarget(null);
    setFeedbackStars(0);
    setFeedbackText("");
  }
  async function submitFeedback() {
    if (!feedbackTarget) return;
    const { bookingId, role } = feedbackTarget;
    const patch = role === "customer"
      ? { customerRating: feedbackStars, customerFeedback: feedbackText.trim() }
      : { workerRating: feedbackStars, workerFeedback: feedbackText.trim() };
    if (liveBookingIds.has(bookingId)) {
      try {
        await updateDoc(doc(db, "bookings", bookingId), patch);
      } catch (err) {
        console.error("Failed to save feedback:", err);
      }
    } else {
      setWorkerRequests((prev) => prev.map((r) => (r.id === bookingId ? { ...r, ...patch } : r)));
    }
    const req = allRequests.find((r) => r.id === bookingId);
    if (role === "customer") {
      pushNotification("worker", `${req?.customerName ?? "A customer"} left you a ${feedbackStars}★ review.`, req?.workerEmail);
    } else {
      pushNotification("customer", `${req?.workerName ?? "Your worker"} left feedback on your booking.`, req?.customerEmail);
    }
    closeFeedback();
  }

  // Filing a complaint — same "which side of this booking" shape as
  // feedback, but instead of a rating it sends the accused person's details
  // straight to the Federation admin's Complaints queue for review.
  const [complaintTarget, setComplaintTarget] = useState<{ bookingId: string; role: "customer" | "worker" } | null>(null);
  const [complaintReason, setComplaintReason] = useState("");
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  function openComplaint(bookingId: string, role: "customer" | "worker") {
    setComplaintTarget({ bookingId, role });
    setComplaintReason("");
  }
  function closeComplaint() {
    setComplaintTarget(null);
    setComplaintReason("");
  }
  async function submitComplaint() {
    if (!complaintTarget || !complaintReason.trim() || complaintSubmitting) return;
    const { bookingId, role } = complaintTarget;
    const req = allRequests.find((r) => r.id === bookingId);
    if (!req) {
      closeComplaint();
      return;
    }
    setComplaintSubmitting(true);
    const filedByRole = role;
    const againstRole: "customer" | "worker" = role === "customer" ? "worker" : "customer";
    const complaint: Omit<Complaint, "id"> = {
      bookingId,
      service: req.service,
      filedByRole,
      filedByName: filedByRole === "customer" ? req.customerName : req.workerName,
      filedByEmail: filedByRole === "customer" ? req.customerEmail : req.workerEmail,
      againstRole,
      againstName: againstRole === "customer" ? req.customerName : req.workerName,
      againstEmail: againstRole === "customer" ? req.customerEmail : req.workerEmail,
      reason: complaintReason.trim(),
      status: "open",
      createdAt: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, "complaints"), complaint);
    } catch (err) {
      console.error("Failed to file complaint:", err);
    }
    setComplaintSubmitting(false);
    closeComplaint();
  }
  function adminUpdateComplaintStatus(id: string, status: "resolved" | "dismissed") {
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    updateDoc(doc(db, "complaints", id), { status }).catch((err) => console.error("Failed to update complaint:", err));
  }

  function openNotifPanel() {
    const next = !notifPanelOpen;
    setNotifPanelOpen(next);
    if (next) {
      setSeenNotifIds((prev) => {
        const updated = new Set(prev);
        notifications.forEach((n) => updated.add(n.id));
        return updated;
      });
    }
  }

  // Worker onboarding always requires a signed-in account first (so there's
  // no password field to fill in here — the account was already created,
  // or already existed, via the Sign In / Sign Up modal). If someone clicks
  // "Join as Worker" while signed out, send them to sign up as a worker
  // instead; they'll land back here automatically once that's done (see
  // redirectToWorkerOnboarding).
  function openJoinWorker() {
    if (!auth.currentUser) {
      setAuthMode("signup");
      setAuthRole("worker");
      setAuthError("");
      setSignInStep(1);
      setShowSignIn(true);
      return;
    }
    setShowJoinWorker(true);
    setJoinStep(1);
    setJoinForm({
      name: auth.currentUser.displayName || "",
      email: auth.currentUser.email || "",
      phone: "",
      category: serviceCategories[0].id,
      age: "",
      experience: "",
      hourlyRate: "",
      address: "",
      certificateNote: "",
    });
    setJoinPhotoPreview("");
    setJoinPhotoName("");
    setJoinCertificateName("");
    setJoinCertificateDataUrl("");
    setJoinCertificateError("");
    setJoinAuthError("");
    setJoinLocateError("");
  }
  function closeJoinWorker() {
    setShowJoinWorker(false);
  }
  async function submitJoinWorker() {
    const refId = "APP-" + Math.floor(100000 + Math.random() * 900000);
    const name = joinForm.name.trim();
    const email = joinForm.email.trim();
    const category = joinForm.category;
    const age = Number(joinForm.age) || 0;
    const experience = Number(joinForm.experience) || 0;
    const hourlyRate = Number(joinForm.hourlyRate) || 0;
    const address = joinForm.address.trim();
    const certificateNote = joinForm.certificateNote.trim();
    const phone = joinForm.phone.trim();
    setJoinAuthError("");

    // Getting here always means the person is already signed in — openJoinWorker
    // sends anyone who isn't straight to the Sign Up modal first. So this just
    // reuses that account; it never creates one itself.
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setJoinAuthError("Please sign in to continue.");
      openJoinWorker();
      return;
    }
    if (name && auth.currentUser && auth.currentUser.displayName !== name) {
      try {
        await updateProfile(auth.currentUser, { displayName: name });
      } catch (err) {
        console.error("Failed to update display name:", err);
      }
    }

    setJoinRefId(refId);
    setJoinStep(2);
    try {
      await setDoc(doc(db, "workers", uid), {
        uid,
        name,
        email,
        phone,
        category,
        age,
        experience,
        hourlyRate,
        address,
        certificateNote,
        photoFileName: joinPhotoName,
        certificateFileName: joinCertificateName,
        certificateDataUrl: joinCertificateDataUrl,
        refId,
        verified: false,
        createdAt: serverTimestamp(),
      }, { merge: true });
      // Every new worker lands in the Federation Admin's "Verifications"
      // queue and stays unverified until a real human reviewer there
      // approves or rejects them — no auto-approval.
      setCommunityWorkers((prev) => {
        const withoutOld = prev.filter((w) => w.id !== uid);
        return [
          buildCommunityWorker(uid, name, category, experience, false, email, certificateNote, hourlyRate, phone, age, address, joinCertificateName, joinCertificateDataUrl),
          ...withoutOld,
        ];
      });
    } catch (err) {
      console.error("Failed to save worker profile:", err);
    }
    // Sign the new worker straight in so their profile is what they land on
    // next, same as the "Join as Customer" flow.
    setCurrentUser({ name: name || "Member", email, photoURL: joinPhotoPreview || null });
    setUserRole("worker");
    setIsSignedIn(true);
  }

  const myNotifications = notifications;
  const myNotifCount = myNotifications.filter((n) => !seenNotifIds.has(n.id)).length;

  // Requests routed to the signed-in worker specifically (matched by email,
  // for bookings made against a real joined worker account). Bookings made
  // against a static/seed demo worker (no account/email) fall back to the
  // shared pool, same as before. Urgent ("right now") requests float to the
  // top so a worker can't miss them.
  const myIncomingRequests = allRequests
    .filter((r) => (currentUser?.email && r.workerEmail ? r.workerEmail === currentUser.email : true))
    .sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
  const acceptedJobs = myIncomingRequests.filter((r) => r.status === "accepted");
  // The signed-in worker's own profile — matched by the email they signed
  // up/joined with — used to show their real skill/experience/certificate
  // instead of generic placeholder profile content.
  const myWorkerProfile = currentUser?.email ? allWorkers.find((w) => w.email && w.email === currentUser.email) : undefined;
  const myCompletedJobsCount = myIncomingRequests.filter((r) => r.status === "completed").length;
  const totalEarnings = acceptedJobs.reduce((sum, r) => sum + (Number(r.rate) || 0), 0);
  const pendingRequestsCount = myIncomingRequests.filter((r) => r.status === "pending").length;
  const myBookings = allRequests.filter((r) => (currentUser?.email && r.customerEmail ? r.customerEmail === currentUser.email : r.customerName === currentUser?.name));

  // AI Workforce Intelligence — forecasts demand per service category from
  // live booking activity and recommends where the cooperative should
  // allocate/onboard more workers.
  const demandByCategory = serviceCategories
    .map((cat) => {
      const catRequests = allRequests.filter((r) => r.category === cat.id).length;
      const catWorkerCount = allWorkers.filter((w) => w.category === cat.id).length;
      const ratio = catWorkerCount ? catRequests / catWorkerCount : catRequests;
      const level: "Low" | "Moderate" | "High" = ratio > 1.5 ? "High" : ratio > 0.5 ? "Moderate" : "Low";
      return { ...cat, requests: catRequests, workerCount: catWorkerCount, level };
    })
    .sort((a, b) => b.requests - a.requests);

  return (
    <div className="min-h-full bg-[#F3F7FE] text-[#0F1E3D]" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* ── NAV ── */}
      {page !== "login" && (
      <nav className="sticky top-0 z-50 bg-[#F3F7FE]/95 backdrop-blur border-b border-[#CBD9EE]">
        <div className="max-w-7xl mx-auto px-5 md:px-10 flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <div className="w-8 h-8 rounded-full bg-[#1D4ED8] flex items-center justify-center">
              <span className="text-white text-xs font-bold">KS</span>
            </div>
            <span className="font-semibold text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Kaamsetu</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#64748B]">
            <button onClick={goToServicesPage} className="hover:text-[#0F1E3D] transition-colors">{t("services")}</button>
            <button onClick={() => goToSection("how")} className="hover:text-[#0F1E3D] transition-colors">{t("howItWorks")}</button>
            <button onClick={() => goToSection("workers")} className="hover:text-[#0F1E3D] transition-colors">{t("workers")}</button>
            <button onClick={() => goToSection("stories")} className="hover:text-[#0F1E3D] transition-colors">{t("stories")}</button>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#E6EEFB] rounded-full p-1 mr-1" role="group" aria-label="Portal">
              {!isSignedIn && (
                <>
                  <button onClick={openJoinWorker} className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors bg-[#1D4ED8] text-white hover:bg-[#1E3A8A]">
                    {t("joinAsWorker")}
                  </button>
                  <button onClick={openJoinCustomer} className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors bg-[#1D4ED8] text-white hover:bg-[#1E3A8A]">
                    {t("joinAsCustomer")}
                  </button>
                </>
              )}
              <button onClick={() => switchMode("federation")} className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${activeMode === "federation" ? "bg-white shadow-sm text-[#0F1E3D]" : "text-[#64748B] hover:text-[#0F1E3D]"}`}>
                {t("federationTab")}
              </button>
            </div>
            <div className="flex items-center gap-1 mr-1" role="group" aria-label={t("language")}>
              <button onClick={() => setLang("en")} className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${lang === "en" ? "bg-[#1D4ED8] text-white border-[#1D4ED8]" : "border-[#CBD9EE] text-[#64748B] hover:text-[#0F1E3D]"}`}>EN</button>
              <button onClick={() => setLang("hi")} className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${lang === "hi" ? "bg-[#1D4ED8] text-white border-[#1D4ED8]" : "border-[#CBD9EE] text-[#64748B] hover:text-[#0F1E3D]"}`}>हिं</button>
            </div>
            {isSignedIn ? (
              <div className="flex items-center gap-2">
                {userRole === "worker" && page !== "workerDashboard" && (
                  <button onClick={() => { setPage("workerDashboard"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-sm font-semibold text-[#1D4ED8] hover:underline">
                    {t("dashboard")}
                  </button>
                )}
                <div className="relative" ref={notifPanelRef}>
                  <button onClick={openNotifPanel} className="relative p-2 rounded-lg hover:bg-[#E6EEFB]" aria-label="Notifications">
                    <span className="text-lg leading-none">🔔</span>
                    {myNotifCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-[#0EA5E9] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{myNotifCount}</span>
                    )}
                  </button>
                  {notifPanelOpen && (
                    <div className="absolute right-0 top-11 w-80 bg-white border border-[#CBD9EE] rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
                      <div className="px-4 py-3 border-b border-[#CBD9EE] font-semibold text-sm">{t("notifications")}</div>
                      {myNotifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-[#64748B] text-center">{t("noNotifications")}</div>
                      ) : (
                        myNotifications.map((n) => {
                          const linkedReq = n.bookingId ? allRequests.find((r) => r.id === n.bookingId) : undefined;
                          const showActions = n.forRole === "worker" && linkedReq && linkedReq.status === "pending";
                          return (
                            <div key={n.id} className="px-4 py-3 border-b border-[#E6EEFB] last:border-0 text-sm">
                              <p className="text-[#0F1E3D]">{n.text}</p>
                              <p className="text-xs text-[#64748B] mt-1">{n.time}</p>
                              {showActions && (
                                <div className="flex gap-2 mt-2.5">
                                  <button
                                    onClick={() => { rejectRequest(linkedReq!.id); setNotifPanelOpen(false); }}
                                    className="flex-1 text-xs font-semibold border border-[#CBD9EE] text-[#0F1E3D] py-1.5 rounded-lg hover:bg-[#F3F7FE] transition-colors"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => { acceptRequest(linkedReq!.id); setNotifPanelOpen(false); }}
                                    className="flex-1 text-xs font-semibold bg-[#1D4ED8] text-white py-1.5 rounded-lg hover:bg-[#1E3A8A] transition-colors"
                                  >
                                    Accept
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                <div className="relative" ref={accountMenuRef}>
                  <button onClick={() => setAccountMenuOpen(!accountMenuOpen)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[#E6EEFB] transition-colors">
                    <img
                      src={currentUser?.photoURL || personImgFallback(currentUser?.name || "U", "1B6B5E")}
                      alt={currentUser?.name || "Account"}
                      className="w-7 h-7 rounded-full object-cover"
                      onError={(e) => handleImgError(e, personImgFallback(currentUser?.name || "U", "1B6B5E"))}
                    />
                    <span className="flex flex-col gap-[3px]">
                      <span className="w-4 h-0.5 bg-[#0F1E3D] rounded-full" />
                      <span className="w-4 h-0.5 bg-[#0F1E3D] rounded-full" />
                      <span className="w-4 h-0.5 bg-[#0F1E3D] rounded-full" />
                    </span>
                  </button>
                  {accountMenuOpen && (
                    <div className="absolute right-0 top-11 w-64 bg-white border border-[#CBD9EE] rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#CBD9EE] flex items-center gap-3">
                        <img
                          src={currentUser?.photoURL || personImgFallback(currentUser?.name || "U", "1B6B5E")}
                          alt={currentUser?.name || "Account"}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => handleImgError(e, personImgFallback(currentUser?.name || "U", "1B6B5E"))}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{currentUser?.name}</div>
                          <div className="text-xs text-[#64748B] truncate">{currentUser?.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => { setAccountMenuOpen(false); setPage(userRole === "worker" ? "workerDashboard" : "workHistory"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#F3F7FE] transition-colors"
                      >
                        📋 {t("workHistory")}
                      </button>
                      <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-[#CBD9EE] transition-colors">
                        {t("signOut")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <button className="md:hidden p-2 rounded-md hover:bg-[#E6EEFB]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <div className="w-5 h-0.5 bg-[#0F1E3D] mb-1" />
            <div className="w-5 h-0.5 bg-[#0F1E3D] mb-1" />
            <div className="w-4 h-0.5 bg-[#0F1E3D]" />
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#CBD9EE] bg-[#FFFFFF] px-5 py-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-1 bg-[#E6EEFB] rounded-full p-1 self-stretch" role="group" aria-label="Portal">
              {!isSignedIn && (
                <>
                  <button onClick={() => { setMobileMenuOpen(false); openJoinWorker(); }} className="flex-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors bg-[#1D4ED8] text-white">
                    {t("joinAsWorker")}
                  </button>
                  <button onClick={() => { setMobileMenuOpen(false); openJoinCustomer(); }} className="flex-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors bg-[#1D4ED8] text-white">
                    {t("joinAsCustomer")}
                  </button>
                </>
              )}
              <button onClick={() => switchMode("federation")} className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${activeMode === "federation" ? "bg-white shadow-sm text-[#0F1E3D]" : "text-[#64748B]"}`}>
                {t("federationTab")}
              </button>
            </div>
            <div className="flex items-center gap-1 self-end -mt-1 mb-1" role="group" aria-label={t("language")}>
              <button onClick={() => setLang("en")} className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${lang === "en" ? "bg-[#1D4ED8] text-white border-[#1D4ED8]" : "border-[#CBD9EE] text-[#64748B]"}`}>EN</button>
              <button onClick={() => setLang("hi")} className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${lang === "hi" ? "bg-[#1D4ED8] text-white border-[#1D4ED8]" : "border-[#CBD9EE] text-[#64748B]"}`}>हिं</button>
            </div>
            <button className="text-left font-medium text-[#1E293B] py-1" onClick={goToServicesPage}>{t("services")}</button>
            <button className="text-left font-medium text-[#1E293B] py-1" onClick={() => goToSection("how")}>{t("howItWorks")}</button>
            <button className="text-left font-medium text-[#1E293B] py-1" onClick={() => goToSection("workers")}>{t("workers")}</button>
            <button className="text-left font-medium text-[#1E293B] py-1" onClick={() => goToSection("stories")}>{t("stories")}</button>

            <div className="border-t border-[#CBD9EE] pt-3 mt-1 flex flex-col gap-2.5">
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
                      <div className="text-xs text-[#64748B]">{currentUser?.email}</div>
                    </div>
                  </div>
                  {userRole === "worker" && (
                    <button
                      onClick={() => { setMobileMenuOpen(false); setPage("workerDashboard"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="text-left font-medium text-[#1D4ED8] py-1"
                    >
                      🔔 {t("dashboard")} {pendingRequestsCount > 0 && `(${pendingRequestsCount})`}
                    </button>
                  )}
                  <button
                    onClick={() => { setMobileMenuOpen(false); setPage(userRole === "worker" ? "workerDashboard" : "workHistory"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="text-left font-medium text-[#1E293B] py-1"
                  >
                    📋 {t("workHistory")}
                  </button>
                  <button onClick={handleSignOut} className="text-left font-medium text-red-600 py-1">{t("signOut")}</button>
                </>
              ) : null}
            </div>
          </div>
        )}
      </nav>
      )}

      {/* ── LOGIN PAGE (shown first, before the rest of the app) ── */}
      {page === "login" && (
        <section className="min-h-screen flex items-center justify-center px-5 py-16 bg-[#F3F7FE]">
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#1D4ED8] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">KS</span>
                </div>
                <span className="font-semibold text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Kaamsetu</span>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#1D4ED8] flex items-center justify-center text-white text-2xl mb-5 shadow-md">
                →]
              </div>
              <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
                {authMode === "signup" ? t("welcomeExclaim") : t("welcomeBack")}
              </h1>
              <p className="text-sm text-[#64748B]">
                {authMode === "signup" ? t("createCustomerAccount") : t("logInToAccount")}
              </p>
            </div>

            <div className="bg-white border border-[#CBD9EE] rounded-3xl p-6 shadow-sm">
              {authError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{authError}</div>
              )}

              <button
                onClick={signInWithGoogle}
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-2 border border-[#CBD9EE] bg-white text-[#0F1E3D] font-semibold py-3 rounded-xl hover:bg-[#E6EEFB] transition-colors disabled:opacity-50 mb-4"
              >
                <span className="text-base font-bold" style={{ color: "#4285F4" }}>G</span> {t("continueWithGoogle")}
              </button>

              <div className="flex items-center gap-3 text-xs text-[#64748B] mb-4">
                <div className="flex-1 h-px bg-[#CBD9EE]" /> {t("orEmail")} <div className="flex-1 h-px bg-[#CBD9EE]" />
              </div>

              <div className="flex flex-col gap-4">
                {authMode === "signup" && (
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">{t("fullName")}</label>
                    <input
                      type="text"
                      value={signInName}
                      onChange={(e) => setSignInName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">{t("email")}</label>
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                  />
                </div>
                <button
                  disabled={authLoading || !signInEmail.trim() || (authMode === "signup" && !signInName.trim())}
                  onClick={submitEmailAuth}
                  className="bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1E3A8A] transition-colors"
                >
                  {authLoading ? "Please wait…" : "Continue"}
                </button>
              </div>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setAuthError(""); }}
                className="text-sm text-[#1D4ED8] font-semibold hover:underline"
              >
                {authMode === "signup" ? t("alreadyHaveAccount") : t("needAccount")}
              </button>
            </div>

            <div className="text-center mt-4">
              <button onClick={goHome} className="text-xs text-[#64748B] hover:text-[#0F1E3D] underline underline-offset-2">
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
          <div className="bg-white border border-[#CBD9EE] rounded-2xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">👋</span>
            <div>
              <p className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>
                {t("namaste")}, {currentUser.name?.split(" ")[0] || currentUser.name}
              </p>
              <p className="text-sm text-[#64748B]">{t("whatDoYouNeed")}</p>
            </div>
          </div>
        </div>
      )}
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-10 pt-12 pb-16 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#0EA5E9] mb-5 border border-[#0EA5E9]/40 bg-[#0EA5E9]/10 px-3 py-1 rounded-full">
              {t("heroTag")}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] font-semibold mb-6 text-[#0F1E3D]" style={{ fontFamily: "'Fraunces', serif" }}>
              {t("heroHeadline1")}
              <br />
              <em className="text-[#1D4ED8] not-italic">{t("heroHeadlineEm")}</em>{lang === "en" ? " your" : ""}
              <br />
              {t("heroHeadline2")}
            </h1>
            <p className="text-[#64748B] text-lg leading-relaxed max-w-md mb-8">
              {t("heroSubtext")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleServiceClick("all")}
                className="bg-[#1D4ED8] text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-[#1E3A8A] transition-all hover:shadow-lg hover:shadow-[#1D4ED8]/20"
              >
                {t("findAService")}
              </button>
              <button onClick={openJoinWorker} className="border border-[#CBD9EE] text-[#0F1E3D] font-medium px-7 py-3.5 rounded-xl hover:bg-[#E6EEFB] transition-colors">
                {t("becomeAMember")}
              </button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-2xl font-semibold text-[#0F1E3D]" style={{ fontFamily: "'Fraunces', serif" }}>2,400+</div>
                <div className="text-[#64748B] text-xs sm:text-sm">{t("statVerifiedWorkers")}</div>
              </div>
              <div className="border-x border-[#CBD9EE] px-3">
                <div className="text-2xl font-semibold text-[#0F1E3D]" style={{ fontFamily: "'Fraunces', serif" }}>18,000+</div>
                <div className="text-[#64748B] text-xs sm:text-sm">{t("statBookingsDone")}</div>
              </div>
              <div className="pl-3">
                <div className="text-2xl font-semibold text-[#0F1E3D]" style={{ fontFamily: "'Fraunces', serif" }}>90%</div>
                <div className="text-[#64748B] text-xs sm:text-sm">{t("statEarningsKept")}</div>
              </div>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="absolute -top-4 -right-4 w-72 h-72 rounded-3xl overflow-hidden shadow-2xl bg-[#DCE7F8]">
              <img
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=600&fit=crop&auto=format"
                alt="Cleaner at work"
                className="w-full h-full object-cover"
                onError={(e) => handleImgError(e, categoryImgFallback("cleaner-hero"))}
              />
            </div>
            <div className="absolute top-40 -left-8 w-52 h-52 rounded-2xl overflow-hidden shadow-xl border-4 border-[#F3F7FE] bg-[#DCE7F8]">
              <img
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&auto=format"
                alt="Home cooking"
                className="w-full h-full object-cover"
                onError={(e) => handleImgError(e, categoryImgFallback("home-cooking-hero"))}
              />
            </div>
            <div className="absolute bottom-4 right-12 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-[#CBD9EE]">
              <div className="w-10 h-10 rounded-full bg-[#1D4ED8] flex items-center justify-center text-white font-bold text-sm">4.9</div>
              <div>
                <div className="font-semibold text-sm">Top rated workers</div>
                <div className="text-xs text-[#64748B]">Community verified ✓</div>
              </div>
            </div>
            <div className="w-full h-80" />
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,#0F1E3D 0,#0F1E3D 1px,transparent 0,transparent 50%)", backgroundSize: "12px 12px" }} />
      </section>

      {/* ── SERVICE CATEGORIES ── */}
      <section id="services" className="bg-[#FFFFFF] border-y border-[#CBD9EE] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-semibold leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                What do you need<br />done today?
              </h2>
            </div>
            <p className="text-[#64748B] max-w-xs text-sm leading-relaxed">
              Click any service to browse verified cooperative workers near you.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {serviceCategories.slice(0, 6).map((cat) => (
              <button
                key={cat.id}
                onClick={() => goToServiceDetail(cat.id)}
                className="group flex flex-col rounded-2xl border border-[#CBD9EE] bg-white overflow-hidden text-left transition-all hover:border-[#1D4ED8] hover:shadow-md"
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
                  <div className="font-semibold text-sm text-[#0F1E3D]">{cat.label}</div>
                  <div className="text-xs text-[#64748B]">{cat.count} workers</div>
                </div>
              </button>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={goToServicesPage}
              className="text-sm font-semibold text-[#1D4ED8] border border-[#1D4ED8]/40 px-6 py-2.5 rounded-xl hover:bg-[#E4EEFC] transition-colors"
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
            <span className="text-xs font-semibold tracking-widest uppercase text-[#64748B]">{t("simpleProcess")}</span>
            <h2 className="text-4xl md:text-5xl font-semibold mt-2" style={{ fontFamily: "'Fraunces', serif" }}>{t("howKaamsetuWorks")}</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-px bg-[#CBD9EE] z-0" />
            {howItWorks.map((step) => (
              <div key={step.step} className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl bg-[#FFFFFF] border border-[#CBD9EE]">
                <div className="w-14 h-14 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center text-xl mb-4 shadow-md">{step.icon}</div>
                <div className="text-xs font-mono text-[#64748B] mb-2">{step.step}</div>
                <h3 className="font-semibold text-lg mb-2" style={{ fontFamily: "'Fraunces', serif" }}>{step.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI WORKFORCE INTELLIGENCE ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#64748B]">{t("cooperativeInsights")}</span>
            <h2 className="text-4xl md:text-5xl font-semibold mt-2" style={{ fontFamily: "'Fraunces', serif" }}>{t("aiWorkforceIntelligence")}</h2>
            <p className="text-[#64748B] max-w-xl mx-auto mt-3 text-sm leading-relaxed">
              {t("aiWorkforceIntelligenceDesc")}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {demandByCategory.slice(0, 5).map((cat) => (
              <div key={cat.id} className="bg-[#FFFFFF] border border-[#CBD9EE] rounded-2xl p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{cat.icon}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    cat.level === "High" ? "bg-red-50 text-red-600" :
                    cat.level === "Moderate" ? "bg-[#EAF2FE] text-[#0EA5E9]" :
                    "bg-[#E4EEFC] text-[#1D4ED8]"
                  }`}>{cat.level.toUpperCase()} DEMAND</span>
                </div>
                <div className="font-semibold text-sm text-[#0F1E3D]">{cat.label}</div>
                <div className="text-xs text-[#64748B]">{cat.requests} live booking{cat.requests === 1 ? "" : "s"} · {cat.workerCount} workers</div>
                {cat.level === "High" && (
                  <div className="text-xs font-semibold text-[#0EA5E9] mt-1">→ Recommend onboarding more {cat.label.toLowerCase()} workers</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKER LISTINGS ── */}
      <section id="workers" ref={workersRef} className="bg-[#FFFFFF] border-t border-[#CBD9EE] py-16 md:py-24 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="flex flex-col gap-6 mb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <h2 className="text-4xl md:text-5xl font-semibold leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                Meet your<br />cooperative workers
              </h2>
              {activeFilter !== "all" && (
                <button
                  onClick={() => setActiveFilter("all")}
                  className="self-start md:self-auto text-sm text-[#1D4ED8] border border-[#1D4ED8]/40 px-4 py-1.5 rounded-full hover:bg-[#E4EEFC] transition-colors"
                >
                  ✕ Clear filter
                </button>
              )}
            </div>

            {/* Search + flexible pricing filter */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, work type, or skill..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F1E3D] text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 bg-white border border-[#CBD9EE] rounded-xl px-4 py-2.5 text-sm">
                <span className="text-[#64748B] whitespace-nowrap">Max rate</span>
                <input
                  type="range"
                  min={200}
                  max={550}
                  step={10}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-32 md:w-40 accent-[#1D4ED8]"
                />
                <span className="font-semibold text-[#0F1E3D] whitespace-nowrap">₹{maxPrice}/hr</span>
              </div>
            </div>

            {/* AI-Powered Fair Match — sort mode */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs font-semibold text-[#64748B]">Sort:</span>
              {([
                { id: "ai", label: "⚡ AI Match" },
                { id: "rating", label: "Top Rated" },
                { id: "price", label: "Lowest Price" },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSortMode(opt.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    sortMode === opt.id ? "bg-[#1D4ED8] text-white border-[#1D4ED8]" : "bg-white text-[#1E293B] border-[#CBD9EE] hover:border-[#1D4ED8]"
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
                      ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                      : "bg-white text-[#1E293B] border-[#CBD9EE] hover:border-[#1D4ED8]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-[#64748B]">
              No workers match your search yet. Try a different keyword or increase the max rate.
              <div className="mt-4">
                <button
                  onClick={() => { setSearchQuery(""); setActiveFilter("all"); setMaxPrice(550); }}
                  className="text-[#1D4ED8] font-semibold underline"
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
                  className="bg-white rounded-2xl border border-[#CBD9EE] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="p-5 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img
                          src={worker.image}
                          alt={worker.name}
                          className="w-16 h-16 rounded-xl object-cover bg-[#DCE7F8]"
                          onError={(e) => handleImgError(e, personImgFallback(worker.name, "1B6B5E"))}
                        />
                        {worker.available && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-[#0F1E3D] truncate flex items-center gap-1">
                              {worker.name}
                              {isVerified(worker) && <VerifiedTick />}
                            </h3>
                            <p className="text-sm text-[#64748B]">{worker.role}</p>
                          </div>
                          {worker.cooperative && (
                            <span className="shrink-0 text-xs bg-[#E4EEFC] text-[#1D4ED8] font-semibold px-2 py-0.5 rounded-full border border-[#1D4ED8]/20">
                              Co-op
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[#0EA5E9]">★</span>
                          <span className="font-semibold text-sm">{worker.rating}</span>
                          <span className="text-xs text-[#64748B]">({worker.reviews})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      {sortMode === "ai" && idx < 3 && (
                        <span className="text-xs bg-[#0EA5E9]/10 text-[#0EA5E9] font-semibold px-2 py-0.5 rounded-full border border-[#0EA5E9]/30">⚡ AI Recommended</span>
                      )}
                      {isVerified(worker) ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-[#E4EEFC] text-[#1D4ED8] font-semibold px-2 py-0.5 rounded-full border border-[#1D4ED8]/20">
                          <VerifiedTick size={12} /> Verified
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">Verification pending</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-[#64748B]">
                      <span>📍</span><span>{worker.location}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {worker.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-[#F3F7FE] text-[#1E293B] px-2 py-0.5 rounded-md border border-[#CBD9EE]">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-[#CBD9EE] px-5 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-lg text-[#0F1E3D]" style={{ fontFamily: "'Fraunces', serif" }}>₹{worker.hourlyRate}</span>
                      <span className="text-xs text-[#64748B]">/hr</span>
                    </div>
                    <button
                      onClick={() => openBooking(worker)}
                      className="bg-[#1D4ED8] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-[#1E3A8A] transition-colors"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <button className="border border-[#1D4ED8] text-[#1D4ED8] font-semibold px-8 py-3 rounded-xl hover:bg-[#1D4ED8] hover:text-white transition-all">
              View all 2,400+ workers →
            </button>
          </div>
        </div>
      </section>

      {/* ── COOPERATIVE BANNER ── */}
      <section className="bg-[#1D4ED8] text-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-5 md:px-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#BFDBFE] mb-4 block">Worker Cooperative</span>
            <h2 className="text-4xl md:text-5xl font-semibold leading-tight mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
              Work that<em className="text-[#60A5FA] not-italic"> belongs</em><br />to you.
            </h2>
            <p className="text-[#BFDBFE] leading-relaxed mb-7 max-w-md">
              Kaamsetu is owned by its workers. Every member has a vote in platform decisions,
              earns cooperative dividends, and builds their own client base — not ours.
            </p>
            <button onClick={openJoinWorker} className="bg-[#0EA5E9] text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-[#0284C7] transition-colors">
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
                <div className="text-sm text-[#BFDBFE]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="stories" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#64748B]">Community stories</span>
            <h2 className="text-4xl md:text-5xl font-semibold mt-2" style={{ fontFamily: "'Fraunces', serif" }}>Heard from our community</h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#FFFFFF] border border-[#CBD9EE] rounded-3xl p-8 md:p-12 relative">
              <div className="text-5xl text-[#CBD9EE] font-serif leading-none mb-4">"</div>
              <p className="text-xl md:text-2xl leading-relaxed text-[#0F1E3D] mb-8" style={{ fontFamily: "'Fraunces', serif" }}>
                {testimonials[activeTestimonial].text}
              </p>
              <div className="flex items-center gap-4">
                <img
                  src={testimonials[activeTestimonial].avatar}
                  alt={testimonials[activeTestimonial].name}
                  className="w-12 h-12 rounded-full object-cover bg-[#DCE7F8]"
                  onError={(e) => handleImgError(e, personImgFallback(testimonials[activeTestimonial].name, "7A7469"))}
                />
                <div>
                  <div className="font-semibold">{testimonials[activeTestimonial].name}</div>
                  <div className="text-sm text-[#64748B]">{testimonials[activeTestimonial].location} · {testimonials[activeTestimonial].service}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-3 mt-6">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className={`h-2 rounded-full transition-all ${i === activeTestimonial ? "w-8 bg-[#1D4ED8]" : "w-2 bg-[#CBD9EE]"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#FFFFFF] border-t border-[#CBD9EE] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-5 md:px-10 text-center">
          <h2 className="text-4xl md:text-6xl font-semibold leading-tight mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
            Your neighbourhood,<br />
            <em className="text-[#1D4ED8] not-italic">stronger together.</em>
          </h2>
          <p className="text-[#64748B] text-lg max-w-xl mx-auto mb-8">
            Join thousands of households and workers building a fairer local economy — one booking at a time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="text"
              placeholder="Enter your pincode or area..."
              className="flex-1 max-w-xs px-5 py-3.5 rounded-xl border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
            />
            <button className="bg-[#0EA5E9] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[#0284C7] transition-colors whitespace-nowrap">
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
            <button onClick={goHome} className="text-sm text-[#64748B] hover:text-[#0F1E3D] mb-6 flex items-center gap-1">← Back to home</button>
            <h2 className="text-4xl md:text-5xl font-semibold leading-tight mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
              All services
            </h2>
            <p className="text-[#64748B] mb-10 max-w-lg">
              Pick a service to see verified cooperative workers with their experience and ratings.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {serviceCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => goToServiceDetail(cat.id)}
                  className="group flex flex-col rounded-2xl border border-[#CBD9EE] bg-white overflow-hidden text-left transition-all hover:border-[#1D4ED8] hover:shadow-md"
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
                    <div className="font-semibold text-sm text-[#0F1E3D]">{cat.label}</div>
                    <div className="text-xs text-[#64748B]">{cat.count} workers</div>
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
            <button onClick={goToServicesPage} className="text-sm text-[#64748B] hover:text-[#0F1E3D] mb-6 flex items-center gap-1">← Back to all services</button>
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
                      <p className="text-[#64748B] text-sm mt-1">{catWorkers.length} verified worker{catWorkers.length !== 1 ? "s" : ""} available near you</p>
                    </div>
                  </div>

                  {catWorkers.length === 0 ? (
                    <div className="text-center py-16 text-[#64748B]">No workers listed for this service yet.</div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {catWorkers.map((worker) => (
                        <div key={worker.id} className="bg-white border border-[#CBD9EE] rounded-2xl overflow-hidden flex flex-col">
                          <img
                            src={worker.image}
                            alt={worker.name}
                            className="w-full h-40 object-cover"
                            onError={(e) => handleImgError(e, personImgFallback(worker.name, "1B6B5E"))}
                          />
                          <div className="p-5 flex flex-col gap-2 flex-1">
                            <div className="font-semibold text-[#0F1E3D] flex items-center gap-1">
                              {worker.name}
                              {isVerified(worker) && <VerifiedTick size={14} />}
                            </div>
                            <div className="text-xs text-[#64748B]">{worker.role}</div>
                            <div className="flex items-center gap-3 text-xs text-[#1E293B] mt-1">
                              <span className="flex items-center gap-1">★ {worker.rating} <span className="text-[#64748B]">({worker.reviews})</span></span>
                              <span>•</span>
                              <span>{worker.experience} yrs experience</span>
                            </div>
                            <div className="text-xs text-[#64748B]">{worker.location}</div>
                            <div className="flex items-center justify-between mt-auto pt-3">
                              <span className="font-semibold text-[#1D4ED8]">₹{worker.hourlyRate}/hr</span>
                              <button
                                onClick={() => openBooking(worker)}
                                className="bg-[#1D4ED8] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1E3A8A] transition-colors"
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
        <section className="pb-24 md:pb-28">
          <div className="max-w-5xl mx-auto px-5 md:px-10 py-14 md:py-20">
            <button onClick={goHome} className="text-sm text-[#64748B] hover:text-[#0F1E3D] mb-6 flex items-center gap-1">← Back to home</button>

            <div className="flex items-center gap-4 mb-8">
              <img
                src={currentUser?.photoURL || personImgFallback(currentUser?.name || "Worker", "1B6B5E")}
                alt={currentUser?.name || "Worker"}
                className="w-16 h-16 rounded-full object-cover"
                onError={(e) => handleImgError(e, personImgFallback(currentUser?.name || "Worker", "1B6B5E"))}
              />
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{currentUser?.name}</h2>
                <p className="text-sm text-[#64748B]">{currentUser?.email}</p>
              </div>
            </div>

            {/* ── JOBS TAB ── */}
            {workerTab === "jobs" && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white border border-[#CBD9EE] rounded-xl p-4">
                    <div className="text-2xl font-semibold text-[#1D4ED8]" style={{ fontFamily: "'Fraunces', serif" }}>{acceptedJobs.length}</div>
                    <div className="text-xs text-[#64748B]">{t("jobsCompleted")}</div>
                  </div>
                  <div className="bg-white border border-[#CBD9EE] rounded-xl p-4">
                    <div className="text-2xl font-semibold text-[#1D4ED8]" style={{ fontFamily: "'Fraunces', serif" }}>₹{totalEarnings}</div>
                    <div className="text-xs text-[#64748B]">{t("totalEarnings")}</div>
                  </div>
                  <div className="bg-white border border-[#CBD9EE] rounded-xl p-4">
                    <div className="text-2xl font-semibold text-[#0EA5E9]" style={{ fontFamily: "'Fraunces', serif" }}>{pendingRequestsCount}</div>
                    <div className="text-xs text-[#64748B]">Pending requests</div>
                  </div>
                </div>

                <h3 className="font-semibold text-xl mb-4" style={{ fontFamily: "'Fraunces', serif" }}>{t("incomingRequests")}</h3>
                {myIncomingRequests.length === 0 ? (
                  <div className="text-center py-12 text-[#64748B] bg-white border border-[#CBD9EE] rounded-xl">
                    <div className="text-3xl mb-2">✓</div>
                    No new requests
                    <p className="text-xs text-[#64748B] mt-1">When a customer books you, the request appears here for a one-tap accept.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {myIncomingRequests.map((req) => (
                      <div key={req.id} className={`bg-white border rounded-xl p-5 ${req.urgent && req.status === "pending" ? "border-red-400 ring-1 ring-red-200" : "border-[#CBD9EE]"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            {req.urgent && (
                              <span className="inline-block mb-1 text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 px-2 py-0.5 rounded-full">🔴 Urgent — needed now</span>
                            )}
                            <div className="font-semibold text-[#0F1E3D]">{req.customerName}</div>
                            <div className="text-sm text-[#64748B]">{req.service}</div>
                            <div className="text-xs text-[#64748B] mt-1">{req.date} · {req.time}</div>
                            <div className="text-xs text-[#64748B]">{req.address}</div>
                            {req.lat != null && req.lng != null && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${req.lat},${req.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                              >
                                📍 Open in Google Maps
                              </a>
                            )}
                            <div className="text-xs font-semibold text-[#1D4ED8] mt-1">₹{req.rate}/hr</div>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                            req.status === "pending" ? "bg-[#EAF2FE] text-[#0EA5E9]" :
                            req.status === "accepted" ? "bg-[#E4EEFC] text-[#1D4ED8]" :
                            req.status === "completed" ? "bg-green-50 text-green-700" :
                            "bg-red-50 text-red-600"
                          }`}>
                            {req.status === "pending" ? t("pending") : req.status === "accepted" ? t("accepted") : req.status === "completed" ? "Completed" : t("rejected")}
                          </span>
                        </div>
                        {req.status === "pending" && (
                          <div className="flex gap-3 mt-4">
                            <button onClick={() => rejectRequest(req.id)} className="flex-1 border border-[#CBD9EE] text-[#0F1E3D] font-medium py-2 rounded-lg hover:bg-[#E6EEFB] transition-colors">
                              {t("reject")}
                            </button>
                            <button onClick={() => acceptRequest(req.id)} className="flex-1 bg-[#1D4ED8] text-white font-semibold py-2 rounded-lg hover:bg-[#1E3A8A] transition-colors">
                              {t("accept")}
                            </button>
                          </div>
                        )}
                        {req.status === "accepted" && req.etaMinutes != null && (
                          <div className="mt-3 text-sm text-[#1D4ED8] font-medium">Arriving in ~{req.etaMinutes} minutes</div>
                        )}
                        {req.status === "accepted" && (
                          <button onClick={() => completeJob(req.id)} className="mt-3 w-full bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 transition-colors">
                            ✓ Mark job complete
                          </button>
                        )}
                        {req.status === "completed" && (
                          <>
                            <button onClick={() => openFeedback(req.id, "worker")} className="mt-3 w-full border border-[#CBD9EE] text-[#0F1E3D] font-medium py-2 rounded-lg hover:bg-[#E6EEFB] transition-colors">
                              {req.workerRating ? `⭐ Your feedback: ${req.workerRating}/5` : "⭐ Rate customer & give feedback"}
                            </button>
                            {complaints.some((c) => c.bookingId === req.id && c.filedByRole === "worker") ? (
                              <div className="mt-2 text-xs text-center text-[#64748B]">🚩 Complaint filed — Federation is reviewing it</div>
                            ) : (
                              <button onClick={() => openComplaint(req.id, "worker")} className="mt-2 w-full text-xs font-semibold text-red-600 hover:underline py-1">
                                🚩 File a complaint against this customer
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="font-semibold text-sm uppercase tracking-widest text-[#64748B] mt-10 mb-3">Forecast for your ward</h3>
                <div className="bg-[#E4EEFC] border border-[#1D4ED8]/20 rounded-xl p-4 flex items-start gap-3 mb-10">
                  <span className="text-lg">📈</span>
                  <p className="text-sm text-[#0F1E3D]">{demoForecastText}</p>
                </div>

                <h3 className="font-semibold text-sm uppercase tracking-widest text-[#64748B] mb-3">Recent completed</h3>
                <div className="bg-white border border-[#CBD9EE] rounded-xl divide-y divide-[#E6EEFB]">
                  {demoRecentCompletedJobs.map((job, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className="text-[#0F1E3D]">Job · {job.customer}</span>
                      <span className="font-semibold text-[#1D4ED8]">₹{job.amount}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── EARNINGS TAB ── */}
            {workerTab === "earnings" && (() => {
              const maxIncome = Math.max(...demoMonthlyIncomeTrend.map((d) => d.amount));
              const maxPayout = Math.max(...demoPayoutHistory.map((p) => p.amount));
              return (
                <div className="flex flex-col gap-6">
                  <h3 className="font-semibold text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>Earnings & Welfare</h3>

                  <div className="bg-white border border-[#CBD9EE] rounded-2xl p-6">
                    <div className="text-xs text-[#64748B] mb-1">This month</div>
                    <div className="text-4xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>₹{demoThisMonthTotal.toLocaleString("en-IN")}</div>
                    <div className="text-xs text-[#64748B] mt-1">from {demoThisMonthJobs} completed jobs</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-[#64748B] mb-2">Welfare status</div>
                    <div className="bg-white border border-[#CBD9EE] rounded-2xl divide-y divide-[#E6EEFB]">
                      <div className="flex justify-between items-center px-5 py-4">
                        <span className="text-sm text-[#0F1E3D]">Health insurance (PMJAY-linked)</span>
                        <span className="text-xs font-semibold bg-[#E4EEFC] text-[#1D4ED8] px-2 py-1 rounded-full">ACTIVE</span>
                      </div>
                      <div className="flex justify-between items-center px-5 py-4">
                        <span className="text-sm text-[#0F1E3D]">Cooperative welfare fund</span>
                        <span className="text-xs font-semibold text-[#0F1E3D]">₹2,100 saved</span>
                      </div>
                      <div className="flex justify-between items-center px-5 py-4">
                        <span className="text-sm text-[#0F1E3D]">Accident cover</span>
                        <span className="text-xs font-semibold bg-[#E4EEFC] text-[#1D4ED8] px-2 py-1 rounded-full">ACTIVE</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-[#64748B] mb-2">Monthly income trend</div>
                    <div className="bg-white border border-[#CBD9EE] rounded-2xl p-5">
                      <div className="relative h-28" onMouseLeave={() => setHoveredIncomeIdx(null)}>
                        <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none">
                          <polyline
                            fill="none"
                            stroke="#1D4ED8"
                            strokeWidth="2"
                            points={demoMonthlyIncomeTrend.map((d, i) => `${(i / (demoMonthlyIncomeTrend.length - 1)) * 300},${100 - (d.amount / maxIncome) * 90}`).join(" ")}
                          />
                          {hoveredIncomeIdx !== null && (
                            <line
                              x1={(hoveredIncomeIdx / (demoMonthlyIncomeTrend.length - 1)) * 300}
                              x2={(hoveredIncomeIdx / (demoMonthlyIncomeTrend.length - 1)) * 300}
                              y1="0" y2="100"
                              stroke="#CBD9EE" strokeWidth="1" strokeDasharray="3,3"
                            />
                          )}
                          {demoMonthlyIncomeTrend.map((d, i) => (
                            <circle
                              key={d.month}
                              cx={(i / (demoMonthlyIncomeTrend.length - 1)) * 300}
                              cy={100 - (d.amount / maxIncome) * 90}
                              r={hoveredIncomeIdx === i ? 5 : 3}
                              fill="#1D4ED8"
                            />
                          ))}
                        </svg>
                        {/* Invisible hover columns — one per data point, for easy mouse targeting */}
                        <div className="absolute inset-0 flex">
                          {demoMonthlyIncomeTrend.map((d, i) => (
                            <div
                              key={d.month}
                              className="flex-1 h-full cursor-pointer"
                              onMouseEnter={() => setHoveredIncomeIdx(i)}
                            />
                          ))}
                        </div>
                        {hoveredIncomeIdx !== null && (
                          <div
                            className="absolute bg-white border border-[#CBD9EE] rounded-lg px-3 py-1.5 shadow-md text-xs whitespace-nowrap pointer-events-none"
                            style={{
                              left: `${(hoveredIncomeIdx / (demoMonthlyIncomeTrend.length - 1)) * 100}%`,
                              top: `${100 - (demoMonthlyIncomeTrend[hoveredIncomeIdx].amount / maxIncome) * 90}%`,
                              transform: "translate(-50%, -125%)",
                            }}
                          >
                            <div className="font-semibold uppercase text-[10px] text-[#64748B]">{demoMonthlyIncomeTrend[hoveredIncomeIdx].month}</div>
                            <div className="font-semibold text-[#0F1E3D]">₹{demoMonthlyIncomeTrend[hoveredIncomeIdx].amount.toLocaleString("en-IN")}</div>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between text-xs text-[#64748B] mt-1">
                        {demoMonthlyIncomeTrend.map((d) => (
                          <span key={d.month}>{d.month}</span>
                        ))}
                      </div>
                      <p className="text-xs text-[#64748B] mt-3">Last 6 months · visit fee + parts, net of society fee.</p>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-[#64748B] mb-2">Payout history</div>
                    <div className="bg-white border border-[#CBD9EE] rounded-2xl p-5">
                      <div className="flex items-end justify-between gap-3 h-32" onMouseLeave={() => setHoveredPayoutIdx(null)}>
                        {demoPayoutHistory.map((p, i) => {
                          const isHovered = hoveredPayoutIdx === i;
                          const isDefaultHighlight = i === 0 && hoveredPayoutIdx === null;
                          return (
                            <div
                              key={p.label}
                              className="relative flex-1 flex flex-col items-center gap-2 h-full justify-end cursor-pointer"
                              onMouseEnter={() => setHoveredPayoutIdx(i)}
                            >
                              {isHovered && (
                                <div className="absolute inset-x-0 top-0 bottom-6 bg-[#DCEAFE] rounded-md -z-0" />
                              )}
                              {isHovered && (
                                <div className="absolute -top-2 -translate-y-full bg-white border border-[#CBD9EE] rounded-lg px-3 py-1.5 shadow-md text-xs whitespace-nowrap z-10">
                                  <div className="font-semibold uppercase text-[10px] text-[#64748B]">{p.label}</div>
                                  <div className="font-semibold text-[#0F1E3D]">₹{p.amount.toLocaleString("en-IN")}</div>
                                </div>
                              )}
                              <div
                                className={`relative w-full rounded-t-md z-[1] ${isHovered || isDefaultHighlight ? "bg-[#0EA5E9]" : "bg-[#DCE7F8]"}`}
                                style={{ height: `${(p.amount / maxPayout) * 100}%` }}
                              />
                              <span className="relative text-[10px] text-[#64748B] z-[1]">{p.label}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-[#64748B] mt-3">Most recent week highlighted · settled to society account.</p>
                    </div>
                    <div className="bg-white border border-[#CBD9EE] rounded-2xl divide-y divide-[#E6EEFB] mt-3">
                      {demoPayoutHistory.map((p) => (
                        <div key={p.label} className="flex justify-between items-center px-5 py-4 text-sm">
                          <span className="text-[#0F1E3D]">{p.label} · {p.jobs} jobs</span>
                          <span className="font-semibold text-[#1D4ED8]">₹{p.amount.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleWithdraw} className="border border-[#1D4ED8] text-[#1D4ED8] font-semibold py-3 rounded-xl hover:bg-[#E4EEFC] transition-colors flex items-center justify-center gap-2">
                    🏦 Withdraw to bank
                  </button>
                  {withdrawStatus && (
                    <p className="text-xs text-[#1D4ED8] text-center -mt-3">{withdrawStatus}</p>
                  )}
                  <p className="text-xs text-[#64748B] text-center -mt-3">Settlements are processed via the cooperative society account.</p>
                </div>
              );
            })()}

            {/* ── PROFILE TAB ── */}
            {workerTab === "profile" && (
              <div className="flex flex-col gap-6 max-w-md">
                <div className="bg-white border border-[#CBD9EE] rounded-2xl p-6 flex flex-col items-center text-center gap-3">
                  <img
                    src={currentUser?.photoURL || personImgFallback(currentUser?.name || "Worker", "1B6B5E")}
                    alt={currentUser?.name || "Worker"}
                    className="w-20 h-20 rounded-full object-cover"
                    onError={(e) => handleImgError(e, personImgFallback(currentUser?.name || "Worker", "1B6B5E"))}
                  />
                  <div>
                    <div className="font-semibold text-lg flex items-center gap-1.5 justify-center">
                      {currentUser?.name}
                      {myWorkerProfile?.verified !== false && <VerifiedTick size={18} />}
                    </div>
                    <div className="text-sm text-[#64748B]">{myWorkerProfile ? myWorkerProfile.role : demoWorkerSociety}</div>
                    {myWorkerProfile?.verified === false && (
                      <span className="inline-block text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                        Verification pending with the federation
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white border border-[#CBD9EE] rounded-xl p-4">
                    <div className="text-xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{myWorkerProfile && myWorkerProfile.rating > 0 ? myWorkerProfile.rating : "New"}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">Rating</div>
                  </div>
                  <div className="bg-white border border-[#CBD9EE] rounded-xl p-4">
                    <div className="text-xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{myWorkerProfile ? myCompletedJobsCount : demoWorkerJobsDone}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">Jobs done</div>
                  </div>
                  <div className="bg-white border border-[#CBD9EE] rounded-xl p-4">
                    <div className="text-xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{myWorkerProfile ? myWorkerProfile.experience : demoWorkerExperienceYears} yr</div>
                    <div className="text-xs text-[#64748B] mt-0.5">Experience</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[#64748B] mb-2">Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {(myWorkerProfile ? [myWorkerProfile.role] : demoWorkerSkills).map((skill) => (
                      <span key={skill} className="bg-[#F3F7FE] border border-[#CBD9EE] text-sm px-3 py-1.5 rounded-full">{skill}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[#64748B] mb-2">Certifications</div>
                  <div className="bg-white border border-[#CBD9EE] rounded-2xl divide-y divide-[#E6EEFB]">
                    {(myWorkerProfile
                      ? [
                          { name: "Cooperative Verification", status: myWorkerProfile.verified !== false ? "Verified" : "Pending" },
                          ...(myWorkerProfile.certificateNote ? [{ name: myWorkerProfile.certificateNote, status: "On file" }] : []),
                        ]
                      : demoWorkerCertifications
                    ).map((cert) => (
                      <div key={cert.name} className="flex justify-between items-center px-5 py-4 text-sm">
                        <span className="text-[#0F1E3D]">{cert.name}</span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cert.status === "Active" || cert.status === "Verified" ? "bg-[#EAF2FE] text-[#0EA5E9]" : "bg-[#E4EEFC] text-[#1D4ED8]"}`}>
                          {cert.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#CBD9EE] rounded-2xl divide-y divide-[#E6EEFB] text-sm">
                  <div className="flex justify-between px-5 py-3"><span className="text-[#64748B]">Email</span><span className="font-medium">{currentUser?.email}</span></div>
                  <div className="flex justify-between px-5 py-3"><span className="text-[#64748B]">Jobs completed</span><span className="font-medium">{acceptedJobs.length}</span></div>
                  <div className="flex justify-between px-5 py-3"><span className="text-[#64748B]">This month earnings</span><span className="font-medium">₹{demoThisMonthTotal.toLocaleString("en-IN")}</span></div>
                </div>

                <div className="bg-[#E4EEFC] border border-[#1D4ED8]/20 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-lg">🛡️</span>
                  <p className="text-sm text-[#0F1E3D]">Federation-verified worker. Your profile carries the cooperative trust seal shown to customers.</p>
                </div>

                <button onClick={handleSignOut} className="border border-red-200 text-red-600 font-semibold py-3 rounded-xl hover:bg-red-50 transition-colors">
                  {t("signOut")}
                </button>
              </div>
            )}
          </div>

          {/* Bottom tab bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#CBD9EE] z-40">
            <div className="max-w-5xl mx-auto grid grid-cols-3 text-center">
              <button
                onClick={() => setWorkerTab("jobs")}
                className={`py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${workerTab === "jobs" ? "text-[#1D4ED8]" : "text-[#64748B]"}`}
              >
                <span className="text-lg leading-none">💼</span>
                Jobs
              </button>
              <button
                onClick={() => setWorkerTab("earnings")}
                className={`py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${workerTab === "earnings" ? "text-[#1D4ED8]" : "text-[#64748B]"}`}
              >
                <span className="text-lg leading-none">💳</span>
                Earnings
              </button>
              <button
                onClick={() => setWorkerTab("profile")}
                className={`py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${workerTab === "profile" ? "text-[#1D4ED8]" : "text-[#64748B]"}`}
              >
                <span className="text-lg leading-none">👤</span>
                Profile
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── WORK HISTORY PAGE (customer) ── */}
      {page === "workHistory" && (
        <section className="py-14 md:py-20">
          <div className="max-w-4xl mx-auto px-5 md:px-10">
            <button onClick={goHome} className="text-sm text-[#64748B] hover:text-[#0F1E3D] mb-6 flex items-center gap-1">← Back to home</button>
            <div className="flex items-center gap-4 mb-8">
              <img
                src={currentUser?.photoURL || personImgFallback(currentUser?.name || "U", "1B6B5E")}
                alt={currentUser?.name || "Account"}
                className="w-14 h-14 rounded-full object-cover"
                onError={(e) => handleImgError(e, personImgFallback(currentUser?.name || "U", "1B6B5E"))}
              />
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{t("workHistory")}</h2>
                <p className="text-sm text-[#64748B]">{currentUser?.email}</p>
              </div>
            </div>
            {myBookings.length === 0 ? (
              <div className="text-center py-12 text-[#64748B] bg-white border border-[#CBD9EE] rounded-xl">No bookings yet.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {myBookings.map((b) => (
                  <div key={b.id} className="bg-white border border-[#CBD9EE] rounded-xl p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        {b.urgent && (
                          <span className="inline-block mb-1 text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 px-2 py-0.5 rounded-full">🔴 Urgent</span>
                        )}
                        <div className="font-semibold text-[#0F1E3D]">{b.workerName} · {b.service}</div>
                        <div className="text-xs text-[#64748B] mt-1">{b.date} · {b.time}</div>
                        <div className="text-xs text-[#64748B]">{b.address}</div>
                        {b.lat != null && b.lng != null && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                          >
                            📍 View on map
                          </a>
                        )}
                        {b.status === "accepted" && b.etaMinutes != null && (
                          <div className="text-xs font-semibold text-[#1D4ED8] mt-1">Arriving in ~{b.etaMinutes} minutes</div>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                        b.status === "pending" ? "bg-[#EAF2FE] text-[#0EA5E9]" :
                        b.status === "accepted" ? "bg-[#E4EEFC] text-[#1D4ED8]" :
                        b.status === "completed" ? "bg-green-50 text-green-700" :
                        "bg-red-50 text-red-600"
                      }`}>
                        {b.status === "pending" ? t("pending") : b.status === "accepted" ? t("accepted") : b.status === "completed" ? "Completed" : t("rejected")}
                      </span>
                    </div>
                    {b.status === "completed" && (
                      <div className="border-t border-[#E6EEFB] pt-3 flex flex-col gap-2">
                        <button onClick={() => openFeedback(b.id, "customer")} className="w-full border border-[#CBD9EE] text-[#0F1E3D] font-medium py-2 rounded-lg hover:bg-[#E6EEFB] transition-colors text-sm">
                          {b.customerRating ? `⭐ Your feedback: ${b.customerRating}/5 — tap to edit` : "⭐ Leave feedback for this job"}
                        </button>
                        {complaints.some((c) => c.bookingId === b.id && c.filedByRole === "customer") ? (
                          <div className="text-xs text-center text-[#64748B]">🚩 Complaint filed — Federation is reviewing it</div>
                        ) : (
                          <button onClick={() => openComplaint(b.id, "customer")} className="w-full text-xs font-semibold text-red-600 hover:underline py-1">
                            🚩 File a complaint against this worker
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {page === "admin" && !isSignedIn && (
        <section className="py-14 md:py-20 min-h-[60vh] bg-[#F3F7FE]">
          <div className="max-w-4xl mx-auto px-5 md:px-10">
            <button onClick={goHome} className="text-sm text-[#64748B] hover:text-[#0F1E3D] mb-6 flex items-center gap-1">← {t("exitAdminPortal")}</button>
            <h2 className="text-3xl md:text-4xl font-semibold leading-tight mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              {t("federationTab")}
            </h2>
            <p className="text-[#64748B] mb-8 max-w-lg">
              Cooperative membership verification. Sign in with your account email to continue.
            </p>
            <div className="max-w-sm bg-white border border-[#CBD9EE] rounded-2xl p-6">
              {fedError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{fedError}</div>
              )}
              <button
                onClick={submitFederationGoogleLogin}
                disabled={fedGoogleLoading}
                className="w-full flex items-center justify-center gap-2 border border-[#CBD9EE] bg-white text-[#0F1E3D] font-semibold py-3 rounded-xl hover:bg-[#E6EEFB] transition-colors disabled:opacity-50 mb-4"
              >
                <span className="text-base font-bold" style={{ color: "#4285F4" }}>G</span> {fedGoogleLoading ? "Please wait…" : "Continue with Google"}
              </button>
              <div className="flex items-center gap-3 text-xs text-[#64748B] mb-4">
                <div className="flex-1 h-px bg-[#CBD9EE]" /> or use email <div className="flex-1 h-px bg-[#CBD9EE]" />
              </div>
              <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Email address</label>
              <input
                type="email"
                value={fedEmail}
                onChange={(e) => setFedEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
              />
              <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Password</label>
              <input
                type="password"
                value={fedPassword}
                onChange={(e) => setFedPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                onKeyDown={(e) => { if (e.key === "Enter") submitFederationLogin(); }}
              />
              <button
                disabled={fedLoading || !fedEmail.trim() || fedPassword.trim().length < 6}
                onClick={submitFederationLogin}
                className="w-full bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1E3A8A] transition-colors"
              >
                {fedLoading ? "Please wait…" : "Sign In"}
              </button>
            </div>
          </div>
        </section>
      )}

      {page === "admin" && isSignedIn && currentUser?.email !== FEDERATION_ADMIN_EMAIL && (
        <section className="py-14 md:py-20 min-h-[60vh] bg-[#F3F7FE] flex items-center justify-center">
          <div className="max-w-sm bg-white border border-[#CBD9EE] rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🤝</div>
            <div className="text-3xl font-semibold text-[#1D4ED8] mb-1" style={{ fontFamily: "'Fraunces', serif" }}>{communityWorkers.length}</div>
            <p className="text-sm text-[#64748B]">members have joined the cooperative so far. This number updates in real time.</p>
          </div>
        </section>
      )}

      {page === "admin" && currentUser?.email === FEDERATION_ADMIN_EMAIL && (() => {
        const totalMembers = federationBranches.reduce((s, b) => s + b.members, 0);
        const totalActive = federationBranches.reduce((s, b) => s + b.activeMembers, 0);
        const totalRevenue = federationBranches.reduce((s, b) => s + b.monthlyRevenue, 0);
        const verifiedWorkersCount = communityWorkers.filter((w) => w.verified).length;
        const pendingWorkers = communityWorkers.filter((w) => !w.verified);
        const platformRevenue = allRequests.reduce((s, r) => s + (Number(r.rate) || 0), 0);
        const openComplaints = complaints.filter((c) => c.status === "open");
        return (
          <section className="py-14 md:py-20 bg-[#0F1E3D] text-white min-h-screen">
            <div className="max-w-6xl mx-auto px-5 md:px-10">
              <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
                <div>
                  <button onClick={goHome} className="text-sm text-white/60 hover:text-white mb-2 flex items-center gap-1">← {t("exitAdminPortal")}</button>
                  <h2 className="text-3xl md:text-4xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>🏛️ {t("adminPortal")}</h2>
                  <p className="text-white/60 text-sm mt-1">{t("adminPortalSubtitle")}</p>
                </div>
                <div className="flex gap-2 bg-white/10 rounded-xl p-1 flex-wrap">
                  {([
                    { id: "overview", label: t("adminOverview") },
                    { id: "verification", label: `${t("adminVerification")}${pendingWorkers.length ? ` (${pendingWorkers.length})` : ""}` },
                    { id: "complaints", label: `🚩 Complaints${openComplaints.length ? ` (${openComplaints.length})` : ""}` },
                    { id: "bookings", label: t("adminBookingsDemand") },
                  ] as const).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setAdminView(v.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${adminView === v.id ? "bg-white text-[#0F1E3D]" : "text-white/70 hover:text-white"}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {adminView === "overview" && (
                <>
                  <div className="grid sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/10 rounded-2xl p-5"><div className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{verifiedWorkersCount}</div><div className="text-xs text-white/60 mt-1">{t("memberCooperatives")}</div></div>
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
                          <div className="h-full bg-[#1D4ED8]" style={{ width: `${Math.round((b.activeMembers / b.members) * 100)}%` }} />
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
                      <div key={w.id} className="bg-white/10 rounded-xl p-5 flex flex-col gap-4">
                        {/* Applicant summary */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <img src={w.image} alt={w.name} className="w-14 h-14 rounded-lg object-cover" onError={(e) => handleImgError(e, personImgFallback(w.name, "D97840"))} />
                          <div className="flex-1 min-w-[160px]">
                            <div className="font-semibold flex items-center gap-1.5">
                              {w.name}
                              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-full">Pending review</span>
                            </div>
                            <div className="text-xs text-white/60">{w.role} · {w.experience} {t("yrsExperience")} · ₹{w.hourlyRate}/hr</div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => adminRejectWorker(w.id)} className="text-sm font-semibold border border-white/20 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">{t("reject")}</button>
                            <button onClick={() => adminApproveWorker(w.id)} className="text-sm font-semibold bg-[#1D4ED8] px-4 py-2 rounded-lg hover:bg-[#1E3A8A] transition-colors">{t("accept")}</button>
                          </div>
                        </div>

                        {/* Full application details — what the federation checks before
                            approving: contact info, address, and the certificate on file. */}
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm bg-black/20 rounded-lg p-4">
                          <div className="flex justify-between sm:block">
                            <span className="text-white/50 text-xs uppercase tracking-wide">Email</span>
                            <div className="sm:mt-0.5 break-all">{w.email || "—"}</div>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-white/50 text-xs uppercase tracking-wide">Phone</span>
                            <div className="sm:mt-0.5">{w.phone || "—"}</div>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-white/50 text-xs uppercase tracking-wide">Age</span>
                            <div className="sm:mt-0.5">{w.age ? `${w.age} yrs` : "—"}</div>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-white/50 text-xs uppercase tracking-wide">Address</span>
                            <div className="sm:mt-0.5">{w.address || "—"}</div>
                          </div>
                          <div className="flex justify-between sm:block sm:col-span-2">
                            <span className="text-white/50 text-xs uppercase tracking-wide">Certificate file</span>
                            {w.certificateDataUrl ? (
                              <div className="sm:mt-1 flex items-center gap-3">
                                {w.certificateDataUrl.startsWith("data:image") ? (
                                  <a href={w.certificateDataUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={w.certificateDataUrl} alt="Certificate" className="w-16 h-16 object-cover rounded-lg border border-white/20" />
                                  </a>
                                ) : null}
                                <a
                                  href={w.certificateDataUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={w.certificateFileName || "certificate"}
                                  className="text-sm font-semibold text-[#60A5FA] hover:underline"
                                >
                                  📄 View {w.certificateFileName || "certificate"}
                                </a>
                              </div>
                            ) : (
                              <div className="sm:mt-0.5">{w.certificateFileName || "No file uploaded"}</div>
                            )}
                          </div>
                          {w.certificateNote && (
                            <div className="flex justify-between sm:block sm:col-span-2">
                              <span className="text-white/50 text-xs uppercase tracking-wide">Certificate / ID note</span>
                              <div className="sm:mt-0.5">{w.certificateNote}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {adminView === "complaints" && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-white/60">Complaints filed by customers against workers, and by workers against customers, land here for cooperative review — each with the accused member's profile attached.</p>
                  {complaints.length === 0 ? (
                    <div className="text-center py-16 text-white/50 bg-white/5 rounded-2xl">No complaints filed. 🎉</div>
                  ) : (
                    complaints.map((c) => {
                      const accusedWorker = c.againstRole === "worker"
                        ? communityWorkers.find((w) => w.email && c.againstEmail && w.email === c.againstEmail)
                        : undefined;
                      return (
                        <div key={c.id} className="bg-white/10 rounded-xl p-5 flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-4">
                              {accusedWorker ? (
                                <img src={accusedWorker.image} alt={accusedWorker.name} className="w-14 h-14 rounded-lg object-cover" onError={(e) => handleImgError(e, personImgFallback(accusedWorker.name, "D97840"))} />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center text-xl shrink-0">
                                  {c.againstRole === "worker" ? "🧑‍🔧" : "🧑"}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold flex items-center gap-1.5">
                                  {c.againstName}
                                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                    c.status === "open" ? "text-amber-300 bg-amber-500/10 border border-amber-400/30" :
                                    c.status === "resolved" ? "text-green-300 bg-green-500/10 border border-green-400/30" :
                                    "text-white/50 bg-white/5 border border-white/20"
                                  }`}>
                                    {c.status === "open" ? "Needs review" : c.status === "resolved" ? "Resolved" : "Dismissed"}
                                  </span>
                                </div>
                                <div className="text-xs text-white/60">
                                  Accused ({c.againstRole}) · Complaint by {c.filedByName} ({c.filedByRole})
                                </div>
                                <div className="text-xs text-white/60">{c.service} · Booking #{c.bookingId}</div>
                              </div>
                            </div>
                            {c.status === "open" && (
                              <div className="flex gap-2 shrink-0">
                                <button onClick={() => adminUpdateComplaintStatus(c.id, "dismissed")} className="text-sm font-semibold border border-white/20 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">
                                  Dismiss
                                </button>
                                <button onClick={() => adminUpdateComplaintStatus(c.id, "resolved")} className="text-sm font-semibold bg-[#1D4ED8] px-4 py-2 rounded-lg hover:bg-[#1E3A8A] transition-colors">
                                  Mark resolved
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="bg-black/20 rounded-lg p-4 text-sm">
                            <span className="text-white/50 text-xs uppercase tracking-wide">Complaint</span>
                            <p className="mt-1">{c.reason}</p>
                          </div>

                          {/* Accused member's profile, so the Federation has everything on
                              hand to investigate without hunting through other tabs. */}
                          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm bg-black/20 rounded-lg p-4">
                            <div className="flex justify-between sm:block">
                              <span className="text-white/50 text-xs uppercase tracking-wide">Email</span>
                              <div className="sm:mt-0.5 break-all">{c.againstEmail || accusedWorker?.email || "—"}</div>
                            </div>
                            {accusedWorker && (
                              <>
                                <div className="flex justify-between sm:block">
                                  <span className="text-white/50 text-xs uppercase tracking-wide">Phone</span>
                                  <div className="sm:mt-0.5">{accusedWorker.phone || "—"}</div>
                                </div>
                                <div className="flex justify-between sm:block">
                                  <span className="text-white/50 text-xs uppercase tracking-wide">Skill</span>
                                  <div className="sm:mt-0.5">{accusedWorker.role}</div>
                                </div>
                                <div className="flex justify-between sm:block">
                                  <span className="text-white/50 text-xs uppercase tracking-wide">Address</span>
                                  <div className="sm:mt-0.5">{accusedWorker.address || "—"}</div>
                                </div>
                                <div className="flex justify-between sm:block">
                                  <span className="text-white/50 text-xs uppercase tracking-wide">Federation verified</span>
                                  <div className="sm:mt-0.5">{accusedWorker.verified ? "Yes ✓" : "No — still pending"}</div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {adminView === "bookings" && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/10 rounded-2xl p-5"><div className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{allRequests.length}</div><div className="text-xs text-white/60 mt-1">{t("totalPlatformBookings")}</div></div>
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
      <footer className="border-t border-[#CBD9EE] py-12">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-[#1D4ED8] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">KS</span>
                </div>
                <span className="font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>Kaamsetu</span>
              </div>
              <p className="text-sm text-[#64748B] leading-relaxed">{t("footerTagline")}</p>
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
                      <a href="#" className="text-sm text-[#64748B] hover:text-[#0F1E3D] transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-[#CBD9EE] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#64748B]">
            <span>{t("footerCopyright")}</span>
            <div className="flex items-center gap-4">
              {installPromptEvent && !appInstalled && (
                <button onClick={handleInstallApp} className="flex items-center gap-1.5 font-semibold text-[#1D4ED8] hover:underline">
                  📲 {t("installApp")}
                </button>
              )}
              <button onClick={goToAdmin} className="hover:text-[#0F1E3D] transition-colors underline-offset-2 hover:underline">{t("adminPortal")}</button>
              <span>Delhi NCR · Mumbai · Bengaluru · More cities coming soon</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── BOOKING MODAL ── */}
      {bookingWorker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={closeBooking}>
          <div
            className="bg-[#FFFFFF] rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#CBD9EE] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#CBD9EE]">
              <div className="flex items-center gap-3">
                <img
                  src={bookingWorker.image}
                  alt={bookingWorker.name}
                  className="w-11 h-11 rounded-lg object-cover"
                  onError={(e) => handleImgError(e, personImgFallback(bookingWorker.name, "1B6B5E"))}
                />
                <div>
                  <div className="font-semibold text-[#0F1E3D]">{bookingWorker.name}</div>
                  <div className="text-xs text-[#64748B]">{bookingWorker.role}</div>
                </div>
              </div>
              <button onClick={closeBooking} className="text-[#64748B] hover:text-[#0F1E3D] text-lg leading-none">✕</button>
            </div>

            {/* Step indicator */}
            {bookingStep < 5 && (
              <div className="flex items-center gap-2 px-6 pt-5">
                {["Schedule", "Details", "Confirm", "Payment"].map((label, i) => (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                      bookingStep >= i + 1 ? "bg-[#1D4ED8] text-white" : "bg-[#E6EEFB] text-[#64748B]"
                    }`}>{i + 1}</div>
                    <span className={`text-xs font-medium hidden sm:inline ${bookingStep >= i + 1 ? "text-[#0F1E3D]" : "text-[#64748B]"}`}>{label}</span>
                    {i < 3 && <div className={`flex-1 h-px ${bookingStep > i + 1 ? "bg-[#1D4ED8]" : "bg-[#CBD9EE]"}`} />}
                  </div>
                ))}
              </div>
            )}

            <div className="p-6">
              {/* Step 1: Schedule */}
              {bookingStep === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-2 bg-[#F3F7FE] rounded-xl p-1">
                    <button
                      onClick={() => setBookingForm({ ...bookingForm, urgent: false })}
                      className={`text-sm font-semibold py-2.5 rounded-lg transition-colors ${!bookingForm.urgent ? "bg-white shadow-sm text-[#0F1E3D]" : "text-[#64748B]"}`}
                    >
                      🗓️ Schedule for later
                    </button>
                    <button
                      onClick={() => setBookingForm({ ...bookingForm, urgent: true, date: "Today", time: "ASAP" })}
                      className={`text-sm font-semibold py-2.5 rounded-lg transition-colors ${bookingForm.urgent ? "bg-red-600 text-white shadow-sm" : "text-[#64748B]"}`}
                    >
                      🔴 Need it right now
                    </button>
                  </div>

                  {bookingForm.urgent ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                      Your request will be sent as an <strong>urgent, right-now</strong> booking. The worker sees it flagged at the top of their list and, once they accept, you'll get an ETA for arrival.
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Pick a date</label>
                        <input
                          type="date"
                          value={bookingForm.date}
                          onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Pick a time slot</label>
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => setBookingForm({ ...bookingForm, time: slot })}
                              className={`text-xs sm:text-sm font-medium px-2 py-2 rounded-lg border transition-colors ${
                                bookingForm.time === slot
                                  ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                                  : "bg-white text-[#1E293B] border-[#CBD9EE] hover:border-[#1D4ED8]"
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <button
                    disabled={!bookingForm.date || !bookingForm.time}
                    onClick={() => setBookingStep(2)}
                    className="mt-2 bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1E3A8A] transition-colors"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 2: Details + flexible pricing */}
              {bookingStep === 2 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-[#0F1E3D] block">Service address</label>
                      <button
                        type="button"
                        onClick={useCurrentLocation}
                        disabled={locatingMe}
                        className="text-xs font-semibold text-[#1D4ED8] hover:underline disabled:opacity-50 flex items-center gap-1"
                      >
                        📍 {locatingMe ? "Locating…" : "Use my current location"}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={bookingForm.address}
                      onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                      placeholder="House no., street, area, city"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                    {locateError && <p className="text-xs text-red-600 mt-1">{locateError}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Pincode</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={bookingForm.pincode}
                      onChange={(e) => setBookingForm({ ...bookingForm, pincode: e.target.value.replace(/[^0-9]/g, "") })}
                      placeholder="e.g. 273001"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Notes for the worker (optional)</label>
                    <textarea
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                      placeholder="Any specific requirements..."
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 resize-none"
                    />
                  </div>

                  <div className="bg-[#E4EEFC] border border-[#1D4ED8]/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#0F1E3D]">Flexible pricing</span>
                      <label className="flex items-center gap-2 text-xs text-[#1E293B] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bookingForm.useCustomRate}
                          onChange={(e) => setBookingForm({ ...bookingForm, useCustomRate: e.target.checked })}
                          className="accent-[#1D4ED8]"
                        />
                        Propose my own rate
                      </label>
                    </div>
                    {bookingForm.useCustomRate ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[#0F1E3D] font-semibold">₹</span>
                        <input
                          type="number"
                          value={bookingForm.proposedRate}
                          onChange={(e) => setBookingForm({ ...bookingForm, proposedRate: e.target.value })}
                          className="w-28 px-3 py-2 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                        />
                        <span className="text-xs text-[#64748B]">/hr — worker can accept or counter this offer</span>
                      </div>
                    ) : (
                      <p className="text-xs text-[#1E293B]">
                        Listed rate: <strong>₹{bookingWorker.hourlyRate}/hr</strong>. No middleman commission — the full amount goes to {bookingWorker.name.split(" ")[0]}.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 mt-1">
                    <button onClick={() => setBookingStep(1)} className="flex-1 border border-[#CBD9EE] text-[#0F1E3D] font-medium py-3 rounded-xl hover:bg-[#E6EEFB] transition-colors">
                      Back
                    </button>
                    <button
                      disabled={!bookingForm.address}
                      onClick={() => setBookingStep(3)}
                      className="flex-1 bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1E3A8A] transition-colors"
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
                  <div className="bg-white border border-[#CBD9EE] rounded-xl divide-y divide-[#E6EEFB] text-sm">
                    <div className="flex justify-between px-4 py-3"><span className="text-[#64748B]">Worker</span><span className="font-medium">{bookingWorker.name}</span></div>
                    <div className="flex justify-between px-4 py-3"><span className="text-[#64748B]">Service</span><span className="font-medium">{bookingWorker.role}</span></div>
                    <div className="flex justify-between px-4 py-3"><span className="text-[#64748B]">Date & time</span><span className="font-medium">{bookingForm.date} · {bookingForm.time}</span></div>
                    <div className="flex justify-between px-4 py-3"><span className="text-[#64748B]">Address</span><span className="font-medium text-right max-w-[60%]">{bookingForm.address}</span></div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-[#64748B]">Rate</span>
                      <span className="font-semibold text-[#1D4ED8]">
                        ₹{bookingForm.useCustomRate ? bookingForm.proposedRate : bookingWorker.hourlyRate}/hr
                        {bookingForm.useCustomRate && <span className="text-xs text-[#0EA5E9] ml-1">(proposed)</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setBookingStep(2)} className="flex-1 border border-[#CBD9EE] text-[#0F1E3D] font-medium py-3 rounded-xl hover:bg-[#E6EEFB] transition-colors">
                      Back
                    </button>
                    <button onClick={() => setBookingStep(4)} className="flex-1 bg-[#0EA5E9] text-white font-semibold py-3 rounded-xl hover:bg-[#0284C7] transition-colors">
                      Continue to Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Payment */}
              {bookingStep === 4 && (
                <div className="flex flex-col gap-4">
                  <h3 className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>Payment</h3>
                  <div className="bg-white border border-[#CBD9EE] rounded-xl px-4 py-3 flex justify-between text-sm">
                    <span className="text-[#64748B]">Amount due</span>
                    <span className="font-semibold text-[#1D4ED8]">₹{bookingForm.useCustomRate ? bookingForm.proposedRate : bookingWorker.hourlyRate}/hr</span>
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
                          bookingForm.paymentMethod === m.id ? "bg-[#E4EEFC] border-[#1D4ED8] text-[#1D4ED8]" : "bg-white border-[#CBD9EE] text-[#1E293B]"
                        }`}
                      >
                        <span className="text-lg">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#64748B]">Payment is held securely and released to the worker once you confirm the job is done. An invoice is generated after payment.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setBookingStep(3)} className="flex-1 border border-[#CBD9EE] text-[#0F1E3D] font-medium py-3 rounded-xl hover:bg-[#E6EEFB] transition-colors">
                      Back
                    </button>
                    <button onClick={confirmBooking} className="flex-1 bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl hover:bg-[#1E3A8A] transition-colors">
                      Pay & Confirm
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Success */}
              {bookingStep === 5 && (
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-[#E4EEFC] text-[#1D4ED8] flex items-center justify-center text-3xl">✓</div>
                  <h3 className="font-semibold text-xl" style={{ fontFamily: "'Fraunces', serif" }}>Booking confirmed & paid!</h3>
                  <p className="text-sm text-[#64748B] max-w-xs">
                    {bookingWorker.name} has been notified for {bookingForm.date} at {bookingForm.time}. Booking ID:
                  </p>
                  <div className="bg-[#F3F7FE] border border-[#CBD9EE] rounded-lg px-4 py-2 font-mono text-sm font-semibold">{bookingId}</div>
                  <button onClick={downloadInvoice} className="w-full border border-[#1D4ED8] text-[#1D4ED8] font-semibold py-2.5 rounded-xl hover:bg-[#E4EEFC] transition-colors">
                    📄 Download Invoice
                  </button>
                  <button onClick={closeBooking} className="w-full bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl hover:bg-[#1E3A8A] transition-colors">
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
          <div className="bg-[#FFFFFF] rounded-3xl max-w-sm w-full border border-[#CBD9EE] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#CBD9EE]">
              <div>
                <h3 className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>
                  {signInStep === 2 ? t("welcomeExclaim") : t("welcomeBack")}
                </h3>
                {signInStep === 1 && (
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {authMode === "signup"
                      ? (authRole === "worker" ? t("createWorkerAccount") : t("createCustomerAccount"))
                      : (authRole === "worker" ? t("logInAsWorker") : t("logInToAccount"))}
                  </p>
                )}
              </div>
              <button onClick={closeSignIn} className="text-[#64748B] hover:text-[#0F1E3D] text-lg leading-none">✕</button>
            </div>

            {signInStep === 1 && (
              <div className="p-6 flex flex-col gap-4">
                {authMode === "signup" && (
                  <div className="grid grid-cols-2 gap-2 bg-[#F3F7FE] rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setAuthRole("customer")}
                      className={`text-sm font-semibold py-2 rounded-lg transition-colors ${authRole === "customer" ? "bg-white shadow-sm text-[#0F1E3D]" : "text-[#64748B]"}`}
                    >
                      I'm a Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthRole("worker")}
                      className={`text-sm font-semibold py-2 rounded-lg transition-colors ${authRole === "worker" ? "bg-white shadow-sm text-[#0F1E3D]" : "text-[#64748B]"}`}
                    >
                      I'm a Worker
                    </button>
                  </div>
                )}
                {authError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{authError}</div>
                )}

                <button
                  onClick={signInWithGoogle}
                  disabled={authLoading}
                  className="flex items-center justify-center gap-2 border border-[#CBD9EE] bg-white text-[#0F1E3D] font-semibold py-3 rounded-xl hover:bg-[#E6EEFB] transition-colors disabled:opacity-50"
                >
                  <span className="text-base font-bold" style={{ color: "#4285F4" }}>G</span> {t("continueWithGoogle")}
                </button>

                <div className="flex items-center gap-3 text-xs text-[#64748B]">
                  <div className="flex-1 h-px bg-[#CBD9EE]" /> {t("orEmail")} <div className="flex-1 h-px bg-[#CBD9EE]" />
                </div>

                {authMode === "signup" && (
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">{t("fullName")}</label>
                    <input
                      type="text"
                      value={signInName}
                      onChange={(e) => setSignInName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">{t("email")}</label>
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                  />
                </div>
                <button
                  disabled={authLoading || !signInEmail.trim() || (authMode === "signup" && !signInName.trim())}
                  onClick={submitEmailAuth}
                  className="bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1E3A8A] transition-colors"
                >
                  {authLoading ? "Please wait…" : "Continue"}
                </button>
                <button
                  onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setAuthError(""); }}
                  className="text-sm text-center text-[#1D4ED8] font-semibold hover:underline"
                >
                  {authMode === "signup" ? t("alreadyHaveAccount") : t("needAccount")}
                </button>
              </div>
            )}

            {signInStep === 2 && (
              <div className="p-6 flex flex-col items-center text-center gap-2 py-8">
                <div className="w-14 h-14 rounded-full bg-[#E4EEFC] text-[#1D4ED8] flex items-center justify-center text-2xl">✓</div>
                <p className="font-semibold">Signed in successfully!</p>
                <p className="text-sm text-[#64748B]">{currentUser?.name}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── JOIN AS WORKER MODAL ── */}
      {showJoinWorker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={closeJoinWorker}>
          <div className="bg-[#FFFFFF] rounded-3xl max-w-md w-full border border-[#CBD9EE] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#CBD9EE]">
              <h3 className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>Join the cooperative</h3>
              <button onClick={closeJoinWorker} className="text-[#64748B] hover:text-[#0F1E3D] text-lg leading-none">✕</button>
            </div>
            <div className="p-6">
              {joinStep === 1 && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-[#64748B]">Fill in your details — our cooperative team will verify and onboard you within 3 working days.</p>

                  {/* Profile photo upload */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#CBD9EE] bg-[#F3F7FE] flex items-center justify-center overflow-hidden shrink-0">
                      {joinPhotoPreview ? (
                        <img src={joinPhotoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl text-[#64748B]">👤</span>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Profile photo</label>
                      <label className="inline-block cursor-pointer text-xs font-semibold bg-[#E4EEFC] text-[#1D4ED8] px-3 py-2 rounded-lg hover:bg-[#DCE7F8] transition-colors">
                        {joinPhotoName ? "Change photo" : "Upload photo"}
                        <input type="file" accept="image/*" onChange={handleJoinPhotoChange} className="hidden" />
                      </label>
                      {joinPhotoName && <p className="text-xs text-[#64748B] mt-1 truncate max-w-[10rem]">{joinPhotoName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Full name</label>
                    <input
                      type="text"
                      value={joinForm.name}
                      onChange={(e) => setJoinForm({ ...joinForm, name: e.target.value })}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Email address</label>
                    <input
                      type="email"
                      value={joinForm.email}
                      onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                  </div>
                  {joinAuthError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{joinAuthError}</div>
                  )}
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Mobile number</label>
                    <input
                      type="tel"
                      value={joinForm.phone}
                      onChange={(e) => setJoinForm({ ...joinForm, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Skill</label>
                      <select
                        value={joinForm.category}
                        onChange={(e) => setJoinForm({ ...joinForm, category: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                      >
                        {serviceCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Age</label>
                      <input
                        type="number"
                        min={16}
                        max={80}
                        value={joinForm.age}
                        onChange={(e) => setJoinForm({ ...joinForm, age: e.target.value })}
                        placeholder="e.g. 28"
                        className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Work experience (years)</label>
                    <input
                      type="number"
                      value={joinForm.experience}
                      onChange={(e) => setJoinForm({ ...joinForm, experience: e.target.value })}
                      placeholder="e.g. 3"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Your rate (₹ per hour)</label>
                    <input
                      type="number"
                      min={0}
                      value={joinForm.hourlyRate}
                      onChange={(e) => setJoinForm({ ...joinForm, hourlyRate: e.target.value })}
                      placeholder="e.g. 300"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                    <p className="text-xs text-[#64748B] mt-1">This is what customers will see and pay you directly — no middleman commission. You can change it later.</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-[#0F1E3D] block">Address</label>
                      <button
                        type="button"
                        onClick={useCurrentLocationForJoin}
                        disabled={joinLocating}
                        className="text-xs font-semibold text-[#1D4ED8] hover:underline disabled:opacity-50 flex items-center gap-1"
                      >
                        📍 {joinLocating ? "Locating…" : "Use my current location"}
                      </button>
                    </div>
                    <textarea
                      value={joinForm.address}
                      onChange={(e) => setJoinForm({ ...joinForm, address: e.target.value })}
                      placeholder="House no., street, area, city, PIN code"
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 resize-none"
                    />
                    {joinLocateError && <p className="text-xs text-red-600 mt-1">{joinLocateError}</p>}
                  </div>

                  {/* Dedicated certificate upload slot */}
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Skill certificate</label>
                    <label className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border-2 border-dashed border-[#CBD9EE] bg-[#F3F7FE] cursor-pointer hover:border-[#1D4ED8]/50 transition-colors">
                      <span className="text-xl">📄</span>
                      <span className="text-sm text-[#64748B] truncate">
                        {joinCertificateName || "Upload certificate (PDF or image)"}
                      </span>
                      <input type="file" accept="image/*,.pdf" onChange={handleJoinCertificateChange} className="hidden" />
                    </label>
                    {joinCertificateError && (
                      <p className="text-xs text-red-600 mt-1">{joinCertificateError}</p>
                    )}
                    {joinCertificateDataUrl && joinCertificateDataUrl.startsWith("data:image") && (
                      <img src={joinCertificateDataUrl} alt="Certificate preview" className="mt-2 w-20 h-20 object-cover rounded-lg border border-[#CBD9EE]" />
                    )}
                    <input
                      type="text"
                      value={joinForm.certificateNote}
                      onChange={(e) => setJoinForm({ ...joinForm, certificateNote: e.target.value })}
                      placeholder="Certificate number, Aadhaar last 4 digits, etc. (optional)"
                      className="w-full mt-2 px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                    <p className="text-xs text-[#64748B] mt-1">Used for digital verification of your skills and identity.</p>
                  </div>

                  <button
                    disabled={!joinForm.name || !joinForm.email.trim() || joinForm.phone.trim().length < 10 || !joinForm.hourlyRate || Number(joinForm.hourlyRate) <= 0}
                    onClick={submitJoinWorker}
                    className="mt-1 bg-[#0EA5E9] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0284C7] transition-colors"
                  >
                    Submit Application
                  </button>
                  <button
                    type="button"
                    onClick={() => { closeJoinWorker(); openSignIn("worker"); }}
                    className="text-sm text-[#64748B] hover:text-[#1D4ED8] text-center"
                  >
                    Already a member? <span className="font-semibold">Sign in</span>
                  </button>
                </div>
              )}
              {joinStep === 2 && (
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-[#E4EEFC] text-[#1D4ED8] flex items-center justify-center text-3xl">✓</div>
                  <h3 className="font-semibold text-xl" style={{ fontFamily: "'Fraunces', serif" }}>Application submitted!</h3>
                  <p className="text-sm text-[#64748B] max-w-xs">
                    Welcome to the process, {joinForm.name.split(" ")[0]}! Our digital verification is running now — you're listed as searchable already, and a "Verified" badge appears on your profile within moments.
                  </p>
                  <div className="bg-[#F3F7FE] border border-[#CBD9EE] rounded-lg px-4 py-2 font-mono text-sm font-semibold">{joinRefId}</div>
                  <button
                    onClick={() => {
                      closeJoinWorker();
                      setWorkerTab("profile");
                      setPage("workerDashboard");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="mt-3 w-full bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl hover:bg-[#1E3A8A] transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── JOIN AS CUSTOMER MODAL ── */}
      {showJoinCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={closeJoinCustomer}>
          <div className="bg-[#FFFFFF] rounded-3xl max-w-md w-full border border-[#CBD9EE] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#CBD9EE]">
              <h3 className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>Create your customer account</h3>
              <button onClick={closeJoinCustomer} className="text-[#64748B] hover:text-[#0F1E3D] text-lg leading-none">✕</button>
            </div>
            <div className="p-6">
              {joinCustomerStep === 1 && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-[#64748B]">Tell us a bit about yourself so workers know who they're helping.</p>

                  {/* Profile photo upload */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#CBD9EE] bg-[#F3F7FE] flex items-center justify-center overflow-hidden shrink-0">
                      {joinCustomerPhotoPreview ? (
                        <img src={joinCustomerPhotoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl text-[#64748B]">👤</span>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Profile photo</label>
                      <label className="inline-block cursor-pointer text-xs font-semibold bg-[#E4EEFC] text-[#1D4ED8] px-3 py-2 rounded-lg hover:bg-[#DCE7F8] transition-colors">
                        {joinCustomerPhotoName ? "Change photo" : "Upload photo"}
                        <input type="file" accept="image/*" onChange={handleJoinCustomerPhotoChange} className="hidden" />
                      </label>
                      {joinCustomerPhotoName && <p className="text-xs text-[#64748B] mt-1 truncate max-w-[10rem]">{joinCustomerPhotoName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Full name</label>
                    <input
                      type="text"
                      value={joinCustomerForm.name}
                      onChange={(e) => setJoinCustomerForm({ ...joinCustomerForm, name: e.target.value })}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Email address</label>
                    <input
                      type="email"
                      value={joinCustomerForm.email}
                      onChange={(e) => setJoinCustomerForm({ ...joinCustomerForm, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Mobile number</label>
                    <input
                      type="tel"
                      value={joinCustomerForm.phone}
                      onChange={(e) => setJoinCustomerForm({ ...joinCustomerForm, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">Address</label>
                    <textarea
                      value={joinCustomerForm.address}
                      onChange={(e) => setJoinCustomerForm({ ...joinCustomerForm, address: e.target.value })}
                      placeholder="House no., street, area, city, PIN code"
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 resize-none"
                    />
                  </div>
                  <p className="text-xs text-[#64748B]">This address is saved as your default booking address — you can change it any time you book a worker.</p>

                  <button
                    disabled={!joinCustomerForm.name || joinCustomerForm.phone.trim().length < 10}
                    onClick={submitJoinCustomer}
                    className="mt-1 bg-[#0EA5E9] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0284C7] transition-colors"
                  >
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => { closeJoinCustomer(); openSignIn("customer"); }}
                    className="text-sm text-[#64748B] hover:text-[#1D4ED8] text-center"
                  >
                    Already a member? <span className="font-semibold">Sign in</span>
                  </button>
                </div>
              )}
              {joinCustomerStep === 2 && (
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-[#E4EEFC] text-[#1D4ED8] flex items-center justify-center text-3xl">✓</div>
                  <h3 className="font-semibold text-xl" style={{ fontFamily: "'Fraunces', serif" }}>Welcome to Kaamsetu!</h3>
                  <p className="text-sm text-[#64748B] max-w-xs">
                    You're all set, {joinCustomerForm.name.split(" ")[0]}! Your customer account is ready — start browsing verified local workers whenever you need one.
                  </p>
                  <div className="bg-[#F3F7FE] border border-[#CBD9EE] rounded-lg px-4 py-2 font-mono text-sm font-semibold">{joinCustomerRefId}</div>
                  <button
                    onClick={() => {
                      closeJoinCustomer();
                      setPage("workHistory");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="mt-3 w-full bg-[#1D4ED8] text-white font-semibold py-3 rounded-xl hover:bg-[#1E3A8A] transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FEEDBACK MODAL — same form for customer and worker, shown once a
           job's status is "completed" ── */}
      {feedbackTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={closeFeedback}>
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#CBD9EE] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#CBD9EE]">
              <h3 className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>
                {feedbackTarget.role === "customer" ? "Rate your worker" : "Rate your customer"}
              </h3>
              <button onClick={closeFeedback} className="text-[#64748B] hover:text-[#0F1E3D] text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-6 flex flex-col gap-4">
              <p className="text-sm text-[#64748B]">
                {feedbackTarget.role === "customer"
                  ? "How was the job? Your feedback helps other members choose trusted workers."
                  : "How was this customer to work with? Your feedback stays on their booking record."}
              </p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedbackStars(star)}
                    className={`text-3xl leading-none ${feedbackStars >= star ? "text-[#0EA5E9]" : "text-[#CBD9EE]"}`}
                    aria-label={`Rate ${star} star`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">
                  {feedbackTarget.role === "customer" ? "Comments about the worker (optional)" : "Comments about the customer (optional)"}
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  placeholder="Tell us more about your experience..."
                  className="w-full border border-[#CBD9EE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 resize-none"
                />
              </div>
              <button
                onClick={submitFeedback}
                disabled={feedbackStars === 0}
                className="w-full bg-[#1D4ED8] text-white font-semibold py-2.5 rounded-lg hover:bg-[#1E3A8A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FILE A COMPLAINT MODAL ── */}
      {complaintTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={closeComplaint}>
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#CBD9EE] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#CBD9EE]">
              <h3 className="font-semibold text-lg" style={{ fontFamily: "'Fraunces', serif" }}>
                🚩 File a complaint
              </h3>
              <button onClick={closeComplaint} className="text-[#64748B] hover:text-[#0F1E3D] text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-6 flex flex-col gap-4">
              <p className="text-sm text-[#64748B]">
                {complaintTarget.role === "customer"
                  ? "Tell the Federation what went wrong with this worker. Their profile is sent to the cooperative's Complaints queue for review."
                  : "Tell the Federation what went wrong with this customer. Their profile is sent to the cooperative's Complaints queue for review."}
              </p>
              <div>
                <label className="text-sm font-semibold text-[#0F1E3D] mb-1.5 block">What happened?</label>
                <textarea
                  value={complaintReason}
                  onChange={(e) => setComplaintReason(e.target.value)}
                  rows={4}
                  placeholder="Describe the issue in a few sentences..."
                  className="w-full border border-[#CBD9EE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 resize-none"
                />
              </div>
              <button
                onClick={submitComplaint}
                disabled={!complaintReason.trim() || complaintSubmitting}
                className="w-full bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {complaintSubmitting ? "Submitting…" : "Submit complaint to Federation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHATBOT ── */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-5 right-5 z-[90] w-14 h-14 rounded-full bg-[#1D4ED8] text-white text-2xl shadow-xl hover:bg-[#1E3A8A] transition-colors flex items-center justify-center"
        aria-label="Open support chat"
      >
        {chatOpen ? "✕" : "💬"}
      </button>

      {chatOpen && (
        <div className="fixed bottom-24 right-5 z-[90] w-[90vw] max-w-sm h-[28rem] bg-[#FFFFFF] border border-[#CBD9EE] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-[#1D4ED8] text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">KS</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Kaamsetu Assistant</div>
              <div className="text-xs text-[#BFDBFE]">Usually replies instantly</div>
            </div>
            <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Chat language">
              <button
                onClick={() => switchChatLang("en")}
                className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${chatLang === "en" ? "bg-white text-[#1D4ED8] border-white" : "border-white/50 text-white/80 hover:text-white"}`}
              >
                EN
              </button>
              <button
                onClick={() => switchChatLang("hi")}
                className={`text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${chatLang === "hi" ? "bg-white text-[#1D4ED8] border-white" : "border-white/50 text-white/80 hover:text-white"}`}
              >
                हिं
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.sender === "bot"
                  ? "bg-white border border-[#CBD9EE] self-start rounded-bl-sm"
                  : "bg-[#1D4ED8] text-white self-end rounded-br-sm"
              }`}>
                {msg.text}
              </div>
            ))}
            {chatTyping && (
              <div className="bg-white border border-[#CBD9EE] self-start rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-[#64748B]">{chatLang === "hi" ? "टाइप कर रहा है..." : "typing..."}</div>
            )}
          </div>

          <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {chatQuickRepliesByLang[chatLang].map((q) => (
              <button
                key={q}
                onClick={() => sendChatMessage(q)}
                className="shrink-0 text-xs font-medium bg-white border border-[#CBD9EE] text-[#1E293B] px-3 py-1.5 rounded-full hover:border-[#1D4ED8] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }}
            className="border-t border-[#CBD9EE] p-3 flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={chatLang === "hi" ? "संदेश लिखें..." : "Type a message..."}
              className="flex-1 px-3 py-2 rounded-lg border border-[#CBD9EE] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30"
            />
            <button type="submit" className="bg-[#1D4ED8] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1E3A8A] transition-colors">
              {chatLang === "hi" ? "भेजें" : "Send"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
