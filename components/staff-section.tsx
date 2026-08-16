"use client";

import { useState } from "react";
import Image from "next/image";
import { CourseItem } from "@/lib/types";
import { SectionHeading } from "@/components/section-heading";
import { motion } from "framer-motion";

interface CoursesSectionProps {
  initialCourses?: CourseItem[];
}

export function CoursesSection({ initialCourses }: CoursesSectionProps) {
  const courses = initialCourses ?? [];
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);

  return (
    <section
      id="courses"
      className="section-shell section-spacing"
      aria-labelledby="courses-heading"
    >
      <SectionHeading
        title="COURSES"
        subtitle="Our Courses"
        headingId="courses-heading"
      />

      <div className="mt-8 overflow-hidden">
        <motion.div
          className="flex w-max gap-6"
          animate={{
            x: ["0%", "-50%"]
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {[...courses, ...courses].map((course, index) => (
            <article
              key={`${course.id}-${index}`}
              className="group flex h-[430px] w-[260px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="relative h-52 shrink-0 overflow-hidden rounded-t-2xl bg-slate-100">
                <Image
                  src={course.image}
                  alt={`${course.name} course at CICA Institute, Puri`}
                  width={960}
                  height={960}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  loading="lazy"
                  quality={90}
                  className="h-full w-full object-cover object-[center_20%] transition duration-500 group-hover:scale-105"
                />
              </div>

              <div className="flex flex-1 flex-col p-3">
                <h3 className="line-clamp-2 min-h-[48px] break-words text-[clamp(14px,1vw,18px)] font-bold leading-tight text-slate-900 dark:text-slate-100">
                  {course.name}
                </h3>

                <p className="break-words text-sm font-medium text-brand-700 dark:text-brand-300">
                  {course.level}
                </p>

                <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                  {course.description}
                </p>

                <button
                  type="button"
                  onClick={() => setSelectedCourse(course)}
                  className="mt-3 text-left text-sm font-semibold text-brand-600 hover:underline"
                >
                  See More
                </button>
              </div>
            </article>
          ))}
        </motion.div>
      </div>

      {selectedCourse ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <Image
              src={selectedCourse.image}
              alt={selectedCourse.name}
              width={300}
              height={300}
              className="mx-auto h-40 w-40 rounded-full object-cover"
            />

            <h2 className="mt-4 text-center text-2xl font-bold">
              {selectedCourse.name}
            </h2>

            <p className="text-center font-medium text-brand-600">
              {selectedCourse.level}
            </p>

            <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
              {selectedCourse.description}
            </p>

            <button
              type="button"
              onClick={() => setSelectedCourse(null)}
              className="mt-6 w-full rounded-xl bg-brand-600 py-2 text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

    </section>
  );
}
