import { NavbarSkeleton } from "@/components/navbar-skeleton";
import { AnnouncementBarSkeleton } from "@/components/announcement-bar-skeleton";
import {
  HeroSkeleton,
  GallerySkeleton,
  NoticeBoardSkeleton,
  CoursesSkeleton,
  DownloadsSkeleton
} from "@/components/section-skeletons";

export default function Loading() {
  return (
    <>
      <AnnouncementBarSkeleton />
      <NavbarSkeleton />

      <main>
        <HeroSkeleton />
        <GallerySkeleton />
        <NoticeBoardSkeleton />
        <CoursesSkeleton />
        <DownloadsSkeleton />
      </main>
    </>
  );
}
