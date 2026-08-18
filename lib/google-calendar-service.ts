import { NoticeItem } from "@/lib/types";
import { getUpcomingInfo } from "@/lib/upcoming-utils";

/**
 * Google Calendar REST API Integration for 14-Day Upcoming Notices.
 *
 * Rules:
 * - Only sync notices that are within the 14-day upcoming window.
 * - If notice moves out of the window or is deleted, delete the Google Calendar event.
 * - Stores Google Calendar Event ID (`gcalEventId`) on the notice object to prevent duplicates.
 * - If credentials are missing or API fails, operation fails safely without disrupting notice creation.
 */

function getGoogleCalendarEnv() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;

  return {
    calendarId: calendarId?.trim() || null,
    apiKey: apiKey?.trim() || null,
    accessToken: accessToken?.trim() || null
  };
}

/**
 * Syncs a notice with Google Calendar.
 * Returns updated gcalEventId (string) or undefined if not synced.
 */
export async function syncNoticeToGoogleCalendar(
  notice: NoticeItem
): Promise<string | undefined> {
  const env = getGoogleCalendarEnv();
  const upcomingInfo = getUpcomingInfo(notice.date);

  // Requirement: Only sync notices that are within the 14-day upcoming window
  if (!upcomingInfo.isUpcoming) {
    // If notice had a gcalEventId but is no longer upcoming, remove event from calendar
    if (notice.gcalEventId) {
      await deleteGoogleCalendarEvent(notice.gcalEventId);
    }
    return undefined;
  }

  // If credentials are not configured, skip gracefully
  if (!env.calendarId || (!env.accessToken && !env.apiKey)) {
    return notice.gcalEventId;
  }

  try {
    const startIsoDate = `${notice.date}T09:00:00.000Z`;
    const endIsoDate = `${notice.date}T17:00:00.000Z`;

    const eventPayload = {
      summary: `[CICA Notice] ${notice.title}`,
      description: notice.content,
      start: { dateTime: startIsoDate },
      end: { dateTime: endIsoDate }
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (env.accessToken) {
      headers["Authorization"] = `Bearer ${env.accessToken}`;
    }

    if (notice.gcalEventId) {
      // Update existing Google Calendar event to prevent duplicates
      const updateUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        env.calendarId
      )}/events/${encodeURIComponent(notice.gcalEventId)}${
        env.apiKey ? `?key=${env.apiKey}` : ""
      }`;

      const res = await fetch(updateUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(eventPayload)
      });

      if (res.ok) {
        return notice.gcalEventId;
      }

      if (res.status === 404) {
        // Event was deleted externally, create a new one below
      } else {
        console.warn(`[GCal Sync] Update failed with status ${res.status}`);
        return notice.gcalEventId;
      }
    }

    // Create new Google Calendar event
    const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      env.calendarId
    )}/events${env.apiKey ? `?key=${env.apiKey}` : ""}`;

    const res = await fetch(createUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(eventPayload)
    });

    if (res.ok) {
      const data = await res.json();
      return data.id as string;
    }

    console.warn(`[GCal Sync] Create event failed with status ${res.status}`);
    return notice.gcalEventId;
  } catch (error) {
    console.warn("[GCal Sync] Google Calendar sync failed gracefully:", error);
    return notice.gcalEventId;
  }
}

/**
 * Deletes a Google Calendar event by ID when notice is deleted.
 */
export async function deleteGoogleCalendarEvent(gcalEventId: string): Promise<void> {
  if (!gcalEventId) return;

  const env = getGoogleCalendarEnv();
  if (!env.calendarId || (!env.accessToken && !env.apiKey)) {
    return;
  }

  try {
    const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      env.calendarId
    )}/events/${encodeURIComponent(gcalEventId)}${
      env.apiKey ? `?key=${env.apiKey}` : ""
    }`;

    const headers: Record<string, string> = {};
    if (env.accessToken) {
      headers["Authorization"] = `Bearer ${env.accessToken}`;
    }

    await fetch(deleteUrl, { method: "DELETE", headers });
  } catch (error) {
    console.warn("[GCal Sync] Delete event failed gracefully:", error);
  }
}
