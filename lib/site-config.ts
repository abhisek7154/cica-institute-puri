export const siteConfig = {
  name: "CICA Institute, Puri",
  shortName: "CICA",
  tagline: "Committed To Serve",
  description:
    "Admissions Open 2026 at CICA Institute, Puri, a leading institute in Puri, Odisha focused on computer education, practical learning, and student growth.",
  logo: {
    mode: "image",
    imagePath: "/CICA_logo.png",
    style: "circle"
  },
  contact: {
    email: "dmpublicschoolpuri@gmail.com",
    phone:
      "+91 8339012220, +91 9938702859, +91 8658252927 (Office)",
    address: "CICA Institute, Plot no 408, Puri 1, beside Hanuman Temple, near Dr.Baren Pattanaik Eye Clinic, Duttatota, Puri, Odisha 752001"
  },
  socials: {
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "918658252927",
    instagram:
      process.env.NEXT_PUBLIC_INSTAGRAM_URL ??
      "https://www.instagram.com/d.m.publicschool?igsh=MXRyZWYycDd6MHJszg%3D%3D&utm_source=qr",
    youtube:
      process.env.NEXT_PUBLIC_YOUTUBE_URL ??
      "https://youtube.com/@dmpublicschoolpuri?si=TZD4J29foT59RGLe"
  }
};
