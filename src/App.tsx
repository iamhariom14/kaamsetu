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
  deleteDoc,
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

    backToHome: "Back",

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

    backToHome: "वापस",

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

// Shared "is this message asking to file a complaint" check — used both to
// pick the bot's reply and (in sendChatMessage) to decide whether the NEXT
// message the user sends should be filed with the Federation instead of
// pattern-matched again.
function isComplaintIntent(message: string, chatLang: ChatLang): boolean {
  const m = message.toLowerCase();
  if (chatLang === "hi") {
    return (m.includes("complaint") || m.includes("problem") || m.includes("issue") || m.includes("शिकायत") || m.includes("समस्या")) && !m.includes("payment") && !m.includes("भुगतान");
  }
  return (m.includes("complaint") || m.includes("problem") || m.includes("issue")) && !m.includes("payment");
}

// Every real chatbot function (tracking a booking, filing a complaint,
// leaving feedback, a payment dispute, or asking for a human) needs to know
// WHO is asking — so all of them require a signed-in account. A bare "hi" /
// "hello" greeting is the only thing that still works while signed out.
function isFunctionalIntent(message: string, chatLang: ChatLang): boolean {
  const m = message.toLowerCase();
  if (chatLang === "hi") {
    return (
      m.includes("track") || m.includes("status") || m.includes("ट्रैक") || m.includes("स्टेटस") ||
      isComplaintIntent(message, chatLang) ||
      m.includes("feedback") || m.includes("review") || m.includes("suggest") || m.includes("फीडबैक") || m.includes("सुझाव") ||
      m.includes("payment") || m.includes("refund") || m.includes("charge") || m.includes("money") || m.includes("भुगतान") || m.includes("पैसे") || m.includes("रिफंड") ||
      m.includes("human") || m.includes("agent") || m.includes("call") || m.includes("support") || m.includes("व्यक्ति") || m.includes("सहायता") || m.includes("बात")
    );
  }
  return (
    m.includes("track") || m.includes("status") ||
    isComplaintIntent(message, chatLang) ||
    m.includes("feedback") || m.includes("review") || m.includes("suggest") ||
    m.includes("payment") || m.includes("refund") || m.includes("charge") || m.includes("money") ||
    m.includes("human") || m.includes("agent") || m.includes("call") || m.includes("support")
  );
}

function getBotReply(message: string, chatLang: ChatLang = "en"): string {
  const m = message.toLowerCase();
  if (chatLang === "hi") {
    if (m.includes("track") || m.includes("status") || m.includes("ट्रैक") || m.includes("स्टेटस")) {
      return "आप अपनी बुकिंग की स्थिति 'My Bookings' से कभी भी ट्रैक कर सकते हैं। आपका कामगार आने से पहले आपको संदेश भी भेजेगा। 📍";
    }
    // The actual "who is this about?" and "what happened?" questions are
    // asked separately in sendChatMessage (that needs to know if the person
    // is signed in as a customer or a worker — this function doesn't).
    if (isComplaintIntent(message, chatLang)) {
      return "यह सुनकर खेद है।";
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
  if (isComplaintIntent(message, chatLang)) {
    return "I'm sorry to hear that.";
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
  // Filing a complaint via the chatbot is a 2-step conversation: first we
  // ask WHO it's about (so we can pull that worker's real profile — email,
  // phone, address, service — into the Federation's queue), then WHAT
  // happened. `chatComplaintStage` tracks which answer we're waiting for;
  // `chatComplaintTarget` holds the resolved worker/customer info collected
  // in between the two questions.
  const [chatComplaintStage, setChatComplaintStage] = useState<"idle" | "awaitingTarget" | "awaitingReason">("idle");
  const [chatComplaintTarget, setChatComplaintTarget] = useState<{ name: string; email?: string; phone?: string; address?: string; service?: string } | null>(null);

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
  // purely in local state, as before). `liveBookings` m
