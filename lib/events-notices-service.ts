import { randomUUID } from "crypto";
import { EventItem, NoticeItem, NoticeType } from "@/lib/types";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { readJsonFile, writeJsonFile } from "@/lib/file-store";
import {
  deleteGoogleCalendarEvent,
  syncNoticeToGoogleCalendar
} from "@/lib/google-calendar-service";

interface EventRow {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  description: string;
  type: EventItem["type"];
  created_at: string;
}

interface NoticeRow {
  id: string;
  title: string;
  date: string;
  type: NoticeType;
  content: string;
  created_at: string;
}

interface EventInput {
  title: string;
  date: string;
  location: string;
  category?: string;
  description: string;
  type: EventItem["type"];
}

interface NoticeInput {
  title: string;
  date: string;
  type: NoticeType;
  content: string;
}

const EVENT_COLUMNS =
  "id,title,date,location,category,description,type,created_at";
const NOTICE_COLUMNS = "id,title,date,type,content,created_at";

function formatSupabaseError(scope: string, message?: string) {
  return new Error(message ? `${scope}: ${message}` : scope);
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeCategory(type: EventItem["type"], category?: string) {
  if (category && category.trim().length > 0) {
    return category.trim();
  }

  return type === "exam" ? "Exam" : "General";
}

function createItemId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

function toEventItem(row: EventRow): EventItem {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    location: row.location,
    category: row.category,
    description: row.description,
    type: row.type,
    createdAt: row.created_at
  };
}

function toNoticeItem(row: NoticeRow): NoticeItem {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    type: row.type,
    content: row.content,
    createdAt: row.created_at
  };
}

export async function listEvents(): Promise<EventItem[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .order("date", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data.map((row) => toEventItem(row as EventRow));
    }
  } catch {
    // Fall back to local file store
  }

  return readJsonFile<EventItem[]>("events.json", []);
}

export async function listNotices(): Promise<NoticeItem[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("notices")
      .select(NOTICE_COLUMNS)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data.map((row) => toNoticeItem(row as NoticeRow));
    }
  } catch {
    // Fall back to local file store
  }

  const items = await readJsonFile<NoticeItem[]>("notices.json", []);
  return [...items].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export async function createEvent(input: EventInput): Promise<EventItem> {
  const newEvent: EventItem = {
    id: createItemId("event"),
    title: normalizeText(input.title),
    date: input.date,
    location: normalizeText(input.location),
    category: normalizeCategory(input.type, input.category),
    description: normalizeText(input.description),
    type: input.type,
    createdAt: new Date().toISOString()
  };

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("events")
      .insert({
        id: newEvent.id,
        title: newEvent.title,
        date: newEvent.date,
        location: newEvent.location,
        category: newEvent.category,
        description: newEvent.description,
        type: newEvent.type
      })
      .select(EVENT_COLUMNS)
      .single();

    if (!error && data) {
      return toEventItem(data as EventRow);
    }
  } catch {
    // Fall back to local file store
  }

  const events = await readJsonFile<EventItem[]>("events.json", []);
  const updated = [newEvent, ...events];
  await writeJsonFile("events.json", updated);
  return newEvent;
}

export async function updateEvent(
  id: string,
  input: EventInput
): Promise<EventItem | null> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("events")
      .update({
        title: normalizeText(input.title),
        date: input.date,
        location: normalizeText(input.location),
        category: normalizeCategory(input.type, input.category),
        description: normalizeText(input.description),
        type: input.type
      })
      .eq("id", id)
      .select(EVENT_COLUMNS)
      .maybeSingle();

    if (!error && data) {
      return toEventItem(data as EventRow);
    }
  } catch {
    // Fall back to local file store
  }

  const events = await readJsonFile<EventItem[]>("events.json", []);
  const index = events.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const updatedItem: EventItem = {
    ...events[index],
    title: normalizeText(input.title),
    date: input.date,
    location: normalizeText(input.location),
    category: normalizeCategory(input.type, input.category),
    description: normalizeText(input.description),
    type: input.type
  };

  events[index] = updatedItem;
  await writeJsonFile("events.json", events);
  return updatedItem;
}

export async function deleteEvent(id: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (!error && data) {
      return true;
    }
  } catch {
    // Fall back to local file store
  }

  const events = await readJsonFile<EventItem[]>("events.json", []);
  const filtered = events.filter((item) => item.id !== id);
  if (filtered.length === events.length) return false;
  await writeJsonFile("events.json", filtered);
  return true;
}

export async function listEventsByIds(ids: string[]): Promise<EventItem[]> {
  if (ids.length === 0) {
    return [];
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .in("id", ids);

    if (!error && data) {
      const eventMap = new Map(
        data.map((row) => [row.id, toEventItem(row as EventRow)])
      );
      return ids
        .map((id) => eventMap.get(id))
        .filter((item): item is EventItem => Boolean(item));
    }
  } catch {
    // Fall back to local file store
  }

  const events = await readJsonFile<EventItem[]>("events.json", []);
  const eventMap = new Map(events.map((e) => [e.id, e]));
  return ids
    .map((id) => eventMap.get(id))
    .filter((item): item is EventItem => Boolean(item));
}

export async function createNotice(input: NoticeInput): Promise<NoticeItem> {
  const newNotice: NoticeItem = {
    id: createItemId("notice"),
    title: normalizeText(input.title),
    date: input.date,
    type: input.type,
    content: normalizeText(input.content),
    createdAt: new Date().toISOString()
  };

  const gcalEventId = await syncNoticeToGoogleCalendar(newNotice);
  if (gcalEventId) {
    newNotice.gcalEventId = gcalEventId;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("notices")
      .insert({
        id: newNotice.id,
        title: newNotice.title,
        date: newNotice.date,
        type: newNotice.type,
        content: newNotice.content
      })
      .select(NOTICE_COLUMNS)
      .single();

    if (!error && data) {
      return { ...toNoticeItem(data as NoticeRow), gcalEventId: newNotice.gcalEventId };
    }
  } catch {
    // Fall back to local file store
  }

  const notices = await readJsonFile<NoticeItem[]>("notices.json", []);
  const updated = [newNotice, ...notices];
  await writeJsonFile("notices.json", updated);
  return newNotice;
}

export async function updateNotice(
  id: string,
  input: NoticeInput
): Promise<NoticeItem | null> {
  const notices = await readJsonFile<NoticeItem[]>("notices.json", []);
  const index = notices.findIndex((item) => item.id === id);
  const existingGcalId = index !== -1 ? notices[index]?.gcalEventId : undefined;

  const tempNotice: NoticeItem = {
    id,
    title: normalizeText(input.title),
    date: input.date,
    type: input.type,
    content: normalizeText(input.content),
    gcalEventId: existingGcalId
  };

  const gcalEventId = await syncNoticeToGoogleCalendar(tempNotice);
  tempNotice.gcalEventId = gcalEventId;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("notices")
      .update({
        title: tempNotice.title,
        date: tempNotice.date,
        type: tempNotice.type,
        content: tempNotice.content
      })
      .eq("id", id)
      .select(NOTICE_COLUMNS)
      .maybeSingle();

    if (!error && data) {
      return { ...toNoticeItem(data as NoticeRow), gcalEventId };
    }
  } catch {
    // Fall back to local file store
  }

  if (index === -1) return null;

  const updatedItem: NoticeItem = {
    ...notices[index],
    ...tempNotice
  };

  notices[index] = updatedItem;
  await writeJsonFile("notices.json", notices);
  return updatedItem;
}

export async function deleteNotice(id: string): Promise<boolean> {
  const notices = await readJsonFile<NoticeItem[]>("notices.json", []);
  const target = notices.find((item) => item.id === id);
  if (target?.gcalEventId) {
    await deleteGoogleCalendarEvent(target.gcalEventId);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("notices")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (!error && data) {
      return true;
    }
  } catch {
    // Fall back to local file store
  }

  const filtered = notices.filter((item) => item.id !== id);
  if (filtered.length === notices.length) return false;
  await writeJsonFile("notices.json", filtered);
  return true;
}

export async function listNoticesByIds(ids: string[]): Promise<NoticeItem[]> {
  if (ids.length === 0) {
    return [];
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("notices")
      .select(NOTICE_COLUMNS)
      .in("id", ids);

    if (!error && data) {
      const noticeMap = new Map(
        data.map((row) => [row.id, toNoticeItem(row as NoticeRow)])
      );
      return ids
        .map((id) => noticeMap.get(id))
        .filter((item): item is NoticeItem => Boolean(item));
    }
  } catch {
    // Fall back to local file store
  }

  const notices = await readJsonFile<NoticeItem[]>("notices.json", []);
  const noticeMap = new Map(notices.map((n) => [n.id, n]));
  return ids
    .map((id) => noticeMap.get(id))
    .filter((item): item is NoticeItem => Boolean(item));
}


