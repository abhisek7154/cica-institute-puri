import { GalleryImage as PrismaGalleryImage } from "@prisma/client";
import {
  deleteImageFromCloudinary,
  listCloudinaryImagesForSync,
  uploadImageToCloudinary
} from "@/lib/cloudinary";
import { readJsonFile, writeJsonFile } from "@/lib/file-store";
import { prisma } from "@/lib/prisma";
import { GalleryImage } from "@/lib/types";

interface GalleryCreateInput {
  imageUrl: string;
  publicId: string;
  category: string;
  title: string;
}

interface UploadMeta {
  title?: string;
  alt?: string;
  category?: string;
}

interface LocalGallerySeed {
  id?: string;
  url: string;
  alt?: string;
  title?: string;
  category?: string;
}

function normalizeCategory(value?: string) {
  const category = value?.trim();
  return category && category.length > 0 ? category : "Campus";
}

function normalizeCategoryKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizeTitle(value: string | undefined, fallback: string) {
  const title = value?.trim();
  return title && title.length > 0 ? title : fallback;
}

function toClientImage(image: PrismaGalleryImage): GalleryImage {
  return {
    id: image.id,
    url: image.imageUrl,
    alt: image.title,
    title: image.title,
    category: image.category,
    publicId: image.publicId,
    sortOrder: image.sortOrder
  };
}

async function getTopSortStart(offset = 0) {
  const top = await prisma.galleryImage.findFirst({
    select: { sortOrder: true },
    orderBy: { sortOrder: "asc" }
  });
  return (top?.sortOrder ?? 0) - 1 - offset;
}

async function bootstrapGalleryFromCloudinaryIfEmpty() {
  const count = await prisma.galleryImage.count();
  if (count > 0) {
    return;
  }

  const cloudinaryImages = await listCloudinaryImagesForSync();
  if (cloudinaryImages.length === 0) {
    return;
  }

  const deduped = Array.from(
    new Map(cloudinaryImages.map((item) => [item.publicId, item])).values()
  );

  await prisma.galleryImage.createMany({
    data: deduped.map((image, index) => ({
      imageUrl: image.secureUrl,
      publicId: image.publicId,
      title: image.title,
      category: normalizeCategory(image.category),
      sortOrder: index
    })),
    skipDuplicates: true
  });
}

function getCloudinaryPublicIdFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("res.cloudinary.com")) {
      return null;
    }

    const marker = "/upload/";
    const pathname = parsed.pathname;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }

    const suffix = pathname.slice(markerIndex + marker.length);
    const rawParts = suffix.split("/").filter(Boolean);
    const versionIndex = rawParts.findIndex((part) => /^v\d+$/.test(part));
    const parts =
      versionIndex >= 0 ? rawParts.slice(versionIndex + 1) : rawParts;

    if (parts.length === 0) {
      return null;
    }

    const last = parts[parts.length - 1];
    const dotIndex = last.lastIndexOf(".");
    parts[parts.length - 1] = dotIndex > 0 ? last.slice(0, dotIndex) : last;

    const publicId = parts.join("/").trim();
    return publicId.length > 0 ? publicId : null;
  } catch {
    return null;
  }
}

async function bootstrapGalleryFromLocalFileIfEmpty() {
  const count = await prisma.galleryImage.count();
  if (count > 0) {
    return;
  }

  const localImages = await readJsonFile<LocalGallerySeed[]>("gallery.json", []);
  if (localImages.length === 0) {
    return;
  }

  const data = localImages
    .map((item, index) => {
      const cloudinaryPublicId = getCloudinaryPublicIdFromUrl(item.url);
      const fallbackLocalId = item.id?.trim() || `seed-${index + 1}`;
      const publicId = cloudinaryPublicId ?? `local:${fallbackLocalId}`;
      const title = normalizeTitle(item.title ?? item.alt, "School image");

      return {
        imageUrl: item.url,
        publicId,
        title,
        category: normalizeCategory(item.category),
        sortOrder: index
      };
    })
    .filter((item) => item.imageUrl && item.imageUrl.trim().length > 0);

  if (data.length === 0) {
    return;
  }

  const deduped = Array.from(new Map(data.map((item) => [item.publicId, item])).values());
  await prisma.galleryImage.createMany({
    data: deduped,
    skipDuplicates: true
  });
}

export async function listGalleryImages(category?: string): Promise<GalleryImage[]> {
  try {
    let images: PrismaGalleryImage[] = await prisma.galleryImage.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    });

    if (images.length === 0) {
      try {
        await bootstrapGalleryFromCloudinaryIfEmpty();
        if ((await prisma.galleryImage.count()) === 0) {
          await bootstrapGalleryFromLocalFileIfEmpty();
        }
        images = await prisma.galleryImage.findMany({
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
        });
      } catch {
        // Keep empty list or fallback
      }
    }

    if (images.length > 0) {
      const filterKey = category ? normalizeCategoryKey(category) : null;
      const filtered = filterKey
        ? images.filter((image) => normalizeCategoryKey(image.category) === filterKey)
        : images;

      return filtered.map(toClientImage);
    }
  } catch {
    // Fall through to local json store fallback
  }

  const localSeed = await readJsonFile<Array<{ id?: string; url: string; alt?: string; title?: string; category?: string }>>("gallery.json", []);
  const localImages: GalleryImage[] = localSeed.map((item, index) => ({
    id: item.id || `gallery-${index + 1}`,
    url: item.url,
    alt: item.alt || item.title || "Gallery image",
    title: item.title || item.alt || "Gallery image",
    category: item.category || "Campus",
    sortOrder: index
  }));

  const filterKey = category ? normalizeCategoryKey(category) : null;
  return filterKey
    ? localImages.filter((img) => normalizeCategoryKey(img.category) === filterKey)
    : localImages;
}

export async function createGalleryImages(
  entries: GalleryCreateInput[]
): Promise<GalleryImage[]> {
  if (entries.length === 0) {
    return [];
  }

  try {
    const startOrder = await getTopSortStart(entries.length - 1);
    const created = await prisma.$transaction(
      entries.map((entry, index) =>
        prisma.galleryImage.create({
          data: {
            ...entry,
            sortOrder: startOrder + index
          }
        })
      )
    );

    return created.map(toClientImage);
  } catch {
    // Fall back to local file store
  }

  const current = await readJsonFile<Array<{ id?: string; url: string; alt?: string; title?: string; category?: string }>>("gallery.json", []);
  const newItems = entries.map((entry, idx) => ({
    id: `gallery-${Date.now()}-${idx}`,
    url: entry.imageUrl,
    alt: entry.title,
    title: entry.title,
    category: entry.category
  }));

  const updated = [...newItems, ...current];
  await writeJsonFile("gallery.json", updated);

  return newItems.map((item, index) => ({
    id: item.id,
    url: item.url,
    alt: item.alt,
    title: item.title,
    category: item.category,
    sortOrder: index
  }));
}

function parseMeta(metaRaw: FormDataEntryValue | null) {
  if (typeof metaRaw !== "string") {
    return [] as UploadMeta[];
  }

  try {
    const parsed = JSON.parse(metaRaw);
    return Array.isArray(parsed) ? (parsed as UploadMeta[]) : [];
  } catch {
    return [] as UploadMeta[];
  }
}

export async function uploadGalleryImagesFromFormData(formData: FormData) {
  const allFiles = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);
  const singleFile = formData.get("file");
  const files =
    allFiles.length > 0
      ? allFiles
      : singleFile instanceof File
        ? [singleFile]
        : [];

  if (files.length === 0) {
    throw new Error("No image files provided.");
  }

  const meta = parseMeta(formData.get("meta"));
  const defaultTitle = String(formData.get("title") ?? formData.get("alt") ?? "Gallery image");
  const defaultCategory = normalizeCategory(String(formData.get("category") ?? "Campus"));
  const createEntries: GalleryCreateInput[] = [];

  for (const [index, file] of files.entries()) {
    const fileMeta = meta[index] ?? {};
    const category = normalizeCategory(fileMeta.category ?? defaultCategory);
    const fallbackTitle = file.name?.trim() ? file.name : defaultTitle;
    const title = normalizeTitle(fileMeta.title ?? fileMeta.alt ?? defaultTitle, fallbackTitle);
    
    let imageUrl = "";
    let publicId = "";
    try {
      const upload = await uploadImageToCloudinary(file, { category, title });
      imageUrl = upload.secureUrl;
      publicId = upload.publicId;
    } catch {
      // If Cloudinary upload fails, use object/data fallback if needed or local placeholder
      imageUrl = `/images/${file.name}`;
      publicId = `local:${Date.now()}-${index}`;
    }

    createEntries.push({
      imageUrl,
      publicId,
      category,
      title
    });
  }

  return createGalleryImages(createEntries);
}

export async function updateGalleryImageMetadata(
  id: string,
  data: { title: string; category: string }
) {
  try {
    const updated = await prisma.galleryImage.update({
      where: { id },
      data: {
        title: normalizeTitle(data.title, "Gallery image"),
        category: normalizeCategory(data.category)
      }
    });

    return toClientImage(updated);
  } catch {
    // Fall back to local file store
  }

  const current = await readJsonFile<Array<{ id?: string; url: string; alt?: string; title?: string; category?: string }>>("gallery.json", []);
  const index = current.findIndex((item, i) => (item.id || `gallery-${i + 1}`) === id);
  if (index !== -1) {
    current[index] = {
      ...current[index],
      title: normalizeTitle(data.title, "Gallery image"),
      category: normalizeCategory(data.category)
    };
    await writeJsonFile("gallery.json", current);
    return {
      id,
      url: current[index].url,
      alt: current[index].title || "",
      title: current[index].title || "",
      category: current[index].category || "Campus"
    };
  }

  return null;
}

export async function reorderGalleryImages(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  try {
    const existingCount = await prisma.galleryImage.count({
      where: { id: { in: ids } }
    });

    if (existingCount === ids.length) {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.galleryImage.update({
            where: { id },
            data: { sortOrder: index }
          })
        )
      );

      return listGalleryImages();
    }
  } catch {
    // Fall back to local file store
  }

  const current = await readJsonFile<Array<{ id?: string; url: string; alt?: string; title?: string; category?: string }>>("gallery.json", []);
  const map = new Map(current.map((item, i) => [item.id || `gallery-${i + 1}`, item]));
  const reordered: typeof current = [];
  for (const id of ids) {
    const found = map.get(id);
    if (found) reordered.push(found);
  }
  await writeJsonFile("gallery.json", reordered);
  return listGalleryImages();
}

export async function deleteGalleryImageById(id: string) {
  try {
    const image = await prisma.galleryImage.findUnique({ where: { id } });
    if (image) {
      if (!image.publicId.startsWith("local:")) {
        try {
          await deleteImageFromCloudinary(image.publicId);
        } catch {
          // ignore cloudinary error
        }
      }
      await prisma.galleryImage.delete({ where: { id } });
      return toClientImage(image);
    }
  } catch {
    // Fall back to local file store
  }

  const current = await readJsonFile<Array<{ id?: string; url: string; alt?: string; title?: string; category?: string }>>("gallery.json", []);
  const filtered = current.filter((item, i) => (item.id || `gallery-${i + 1}`) !== id);
  if (filtered.length !== current.length) {
    await writeJsonFile("gallery.json", filtered);
  }
  return null;
}

