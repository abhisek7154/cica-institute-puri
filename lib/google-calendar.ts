import { NoticeItem } from "@/lib/types";
import { getUpcomingInfo } from "@/lib/upcoming-utils";

interface GoogleCalendarEnv {
  calendarId: string | null;
  accessToken: string | null;
}

/**
 * Reads Google Calendar configuration.
 *
 * These variables MUST remain server-side.
 */
function getGoogleCalendarEnv(): GoogleCalendarEnv {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;

  return {
    calendarId: calendarId?.trim() || null,
    accessToken: accessToken?.trim() || null,
  };
}

/**
 * Returns the day after the supplied date.
 *
 * Google Calendar uses an exclusive end date for all-day events.
 *
 * Example:
 *   start = 2026-08-28
 *   end   = 2026-08-29
 *
 * means the event appears on August 28.
 */
function getNextDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid notice date: ${dateStr}`);
  }

  date.setDate(date.getDate() + 1);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Builds the Google Calendar event.
 *
 * Notices are created as ALL-DAY events.
 */
function buildEventPayload(notice: NoticeItem) {
  return {
    summary: `[CICA] ${notice.title}`,

    description: [
      `Type: ${notice.type}`,
      "",
      notice.content,
    ].join("\n"),

    start: {
      date: notice.date,
    },

    end: {
      date: getNextDate(notice.date),
    },
  };
}

/**
 * Syncs a CICA notice with Google Calendar.
 *
 * Current behavior:
 * - Only notices within the 14-day Upcoming window are synced.
 * - Existing Google Calendar events are updated.
 * - New notices create new Calendar events.
 * - If a notice leaves the 14-day window, its Calendar event is deleted.
 * - Google Calendar failures never break notice creation.
 */
export async function syncNoticeToGoogleCalendar(
  notice: NoticeItem
): Promise<string | undefined> {
  const env = getGoogleCalendarEnv();

  /*
   * Keep the existing CICA 14-day Upcoming rule.
   */
  const upcomingInfo = getUpcomingInfo(notice.date);

  if (!upcomingInfo.isUpcoming) {
    /*
     * If the notice previously had a Calendar event,
     * remove it because it is no longer upcoming.
     */
    if (notice.gcalEventId) {
      await deleteGoogleCalendarEvent(notice.gcalEventId);
    }

    return undefined;
  }

  /*
   * Calendar credentials are not configured.
   *
   * Do not break the notice system.
   */
  if (!env.calendarId || !env.accessToken) {
    console.warn(
      "[GCal Sync] GOOGLE_CALENDAR_ID or GOOGLE_CALENDAR_ACCESS_TOKEN is missing."
    );

    return notice.gcalEventId;
  }

  try {
    const eventPayload = buildEventPayload(notice);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${env.accessToken}`,
      "Content-Type": "application/json",
    };

    /*
     * =========================================================
     * UPDATE EXISTING GOOGLE CALENDAR EVENT
     * =========================================================
     */
    if (notice.gcalEventId) {
      const updateUrl =
        `https://www.googleapis.com/calendar/v3/calendars/` +
        `${encodeURIComponent(env.calendarId)}/events/` +
        `${encodeURIComponent(notice.gcalEventId)}`;

      const response = await fetch(updateUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(eventPayload),
      });

      if (response.ok) {
        console.log(
          `[GCal Sync] Updated event: ${notice.gcalEventId}`
        );

        return notice.gcalEventId;
      }

      /*
       * Event may have been manually deleted from Google Calendar.
       * In that case, create it again.
       */
      if (response.status === 404) {
        console.warn(
          `[GCal Sync] Event ${notice.gcalEventId} no longer exists. Creating a new event.`
        );
      } else {
        const errorText = await response.text();

        console.warn(
          `[GCal Sync] Failed to update event. Status: ${response.status}`,
          errorText
        );

        return notice.gcalEventId;
      }
    }

    /*
     * =========================================================
     * CREATE NEW GOOGLE CALENDAR EVENT
     * =========================================================
     */
    const createUrl =
      `https://www.googleapis.com/calendar/v3/calendars/` +
      `${encodeURIComponent(env.calendarId)}/events`;

    const response = await fetch(createUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.warn(
        `[GCal Sync] Failed to create event. Status: ${response.status}`,
        errorText
      );

      return notice.gcalEventId;
    }

    const data = await response.json();

    if (!data.id) {
      console.warn(
        "[GCal Sync] Google Calendar response did not contain an event ID."
      );

      return notice.gcalEventId;
    }

    console.log(
      `[GCal Sync] Created event: ${data.id}`
    );

    return data.id as string;
  } catch (error) {
    /*
     * Calendar errors must never prevent the CICA notice
     * from being created or updated.
     */
    console.warn(
      "[GCal Sync] Calendar synchronization failed:",
      error
    );

    return notice.gcalEventId;
  }
}

/**
 * Deletes a Google Calendar event.
 *
 * Used when:
 * - A notice is deleted
 * - A notice moves outside the 14-day Upcoming window
 */
export async function deleteGoogleCalendarEvent(
  gcalEventId: string
): Promise<void> {
  if (!gcalEventId) {
    return;
  }

  const env = getGoogleCalendarEnv();

  if (!env.calendarId || !env.accessToken) {
    console.warn(
      "[GCal Sync] Cannot delete event because Calendar credentials are missing."
    );

    return;
  }

  try {
    const deleteUrl =
      `https://www.googleapis.com/calendar/v3/calendars/` +
      `${encodeURIComponent(env.calendarId)}/events/` +
      `${encodeURIComponent(gcalEventId)}`;

    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${env.accessToken}`,
      },
    });

    /*
     * 204 = deleted successfully.
     *
     * 404 = event is already gone, which is also fine.
     */
    if (response.ok || response.status === 404) {
      console.log(
        `[GCal Sync] Deleted event: ${gcalEventId}`
      );

      return;
    }

    const errorText = await response.text();

    console.warn(
      `[GCal Sync] Failed to delete event. Status: ${response.status}`,
      errorText
    );
  } catch (error) {
    console.warn(
      "[GCal Sync] Delete failed:",
      error
    );
  }
}