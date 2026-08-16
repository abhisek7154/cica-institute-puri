import { CourseItem, DownloadItem } from "@/lib/types";

export const navigationLinks = [
  { href: "#home", label: "Home" },
  { href: "#gallery", label: "Gallery" },
  { href: "#notices", label: "Notices" },
  { href: "#courses", label: "Courses" },
  { href: "#contact", label: "Contact" }
];

export const fallbackHeroSlides = [
  {
    id: "hero-1",
    url: "/images/New Building.jpeg",
    alt: "A Campus Designed to Inspire Learning and Growth"
  },
  {
    id: "hero-2",
    url: "/images/indoor_corridor.jpeg",
    alt: "Where Curiosity Comes Alive"
  },
  {
    id: "hero-3",
    url: "/images/X_mas.JPG",
    alt: "Spreading Joy, Learning and cheer"
  },
  {
    id: "hero-4",
    url: "/images/Republic_day.jpeg",
    alt: "Proud to Learn, Proud to Be Indian"
  }
];

export const courseItems: CourseItem[] = [
  {
    id: "course-1",
    name: "Graphic Design",
    level: "Creative & Design",
    description: "Learn layout, visual composition, branding basics, and digital design workflows.",
    image: "/Course/card-graphic-design.jpeg"
  },
  {
    id: "course-2",
    name: "C & C++",
    level: "Programming Fundamentals",
    description: "Build strong coding basics with structured programming and problem-solving practice.",
    image: "/Course/CC++.jpg"
  },
  {
    id: "course-3",
    name: "DCA",
    level: "Diploma Course",
    description: "Cover computer fundamentals, office applications, internet usage, and essential digital skills.",
    image: "/Course/DCA_1.jpg"
  },
  {
    id: "course-4",
    name: "DEO",
    level: "Office & Productivity",
    description: "Develop practical data entry, typing, filing, and office workflow capabilities.",
    image: "/Course/DEO.png"
  },
  {
    id: "course-5",
    name: "DTP",
    level: "Publishing & Layout",
    description: "Train in page layout, document formatting, and print-ready publishing tasks.",
    image: "/Course/DTP.png"
  },
  {
    id: "course-6",
    name: "Java",
    level: "Programming Course",
    description: "Explore core Java concepts for application development and object-oriented thinking.",
    image: "/Course/java.jpeg"
  },
  {
    id: "course-7",
    name: "Office",
    level: "Computer Basics",
    description: "Gain confidence with Word, Excel, PowerPoint, and everyday office computer tasks.",
    image: "/Course/Office.jpg"
  },
  {
    id: "course-8",
    name: "OSCIT A, A++",
    level: "Certificate Course",
    description: "Strengthen computer literacy through practical modules focused on everyday digital work.",
    image: "/Course/oscit a,a++.jpg"
  },
  {
    id: "course-9",
    name: "OSCIT",
    level: "Certificate Course",
    description: "Learn foundational computer operation, internet usage, and productivity tools in one course.",
    image: "/Course/oscit.jpeg"
  },
  {
    id: "course-10",
    name: "PGDCA",
    level: "Post Graduate Diploma",
    description: "Advance into software, office automation, and applied computing for professional readiness.",
    image: "/Course/PGDCA.jpg"
  },
  {
    id: "course-11",
    name: "Python",
    level: "Programming Course",
    description: "Practice modern programming with readable syntax, logic building, and real coding exercises.",
    image: "/Course/python.jpg"
  },
  {
    id: "course-12",
    name: "Tally",
    level: "Accounting Software",
    description: "Learn computerized accounting workflows, voucher handling, and business record management.",
    image: "/Course/Tally.png"
  }
];

export const downloadItems: DownloadItem[] = [
  {
    id: "download-1",
    title: "Admission Brochure 2026",
    date: "2026-02-10",
    fileUrl: "/downloads/admission-brochure.pdf"
  },
  {
    id: "download-2",
    title: "Fee Structure 2026-27",
    date: "2026-03-01",
    fileUrl: "/downloads/fee-structure.pdf"
  },
  {
    id: "download-3",
    title: "Transport Routes",
    date: "2026-03-15",
    fileUrl: "/downloads/transport-routes.pdf"
  }
];
