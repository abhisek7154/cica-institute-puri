import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { NewsletterSection } from "@/components/newsletter-section";
import { MapSection } from "@/components/map-section";
import { Footer } from "@/components/footer";
import { WhatsAppButton } from "@/components/whatsapp-button";
import {
  ContactSectionContent,
  CoursesSectionContent,
  DownloadsSectionContent,
  GallerySectionContent,
  HeroSectionContent,
  NoticeBoardSectionContent
} from "@/components/home-sections";
import {
  CoursesSkeleton,
  DownloadsSkeleton,
  GallerySkeleton,
  HeroSkeleton,
  NoticeBoardSkeleton
} from "@/components/section-skeletons";
import { AnnouncementBar } from "@/components/announcement-bar";
export const dynamic = "force-dynamic";
import { siteConfig } from "@/lib/site-config";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  ""
);

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "CICA Institute, Puri",
  alternateName: "Collaborative Institute Of Computer Application",
  url: siteUrl,
  image: `${siteUrl}/images/New Building.jpeg`,
  logo: `${siteUrl}${siteConfig.logo.imagePath}`,
  description: siteConfig.description,
  email: siteConfig.contact.email,
  telephone: "+91 8339012220",
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "Plot no 408, beside Hanuman Temple, near Dr.Baren Pattanaik Eye Clinic, Duttatota",
    addressLocality: "Puri",
    addressRegion: "Odisha",
    postalCode: "752001",
    addressCountry: "IN"
  },
  sameAs: [siteConfig.socials.instagram, siteConfig.socials.youtube]
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <AnnouncementBar />
      <Navbar />
      <AnnouncementBar />
      <main id="main-content" aria-label="CICA Institute, Puri homepage">
        <Suspense fallback={<HeroSkeleton />}>
          <HeroSectionContent />
        </Suspense>

        <Suspense fallback={<GallerySkeleton />}>
          <GallerySectionContent />
        </Suspense>

        <Suspense fallback={<NoticeBoardSkeleton />}>
          <NoticeBoardSectionContent />
        </Suspense>

        <Suspense fallback={<CoursesSkeleton />}>
          <CoursesSectionContent />
        </Suspense>

        <Suspense fallback={<DownloadsSkeleton />}>
          <DownloadsSectionContent />
        </Suspense>

        <NewsletterSection />
        <ContactSectionContent />
        <MapSection />
      </main>

      <Footer />
      <WhatsAppButton />
    </>
  );
}
