import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { readJsonFile, writeJsonFile } from "@/lib/file-store";
import { NoticeItem } from "@/lib/types";
import { noticeSchema } from "@/lib/validation";
import {
  syncNoticeToGoogleCalendar,
  deleteGoogleCalendarEvent,
} from "@/lib/google-calendar";

export const runtime = "nodejs";

/**
 * PUT /api/admin/notices/[id]
 *
 * Updates a notice and automatically updates
 * its corresponding Google Calendar event.
 */
export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json(
      { message: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;

    const payload = await request.json();

    const parsed = noticeSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ??
            "Invalid notice payload.",
        },
        { status: 400 }
      );
    }

    const notices = await readJsonFile<NoticeItem[]>(
      "notices.json",
      []
    );

    const index = notices.findIndex(
      (notice) => notice.id === id
    );

    if (index === -1) {
      return NextResponse.json(
        { message: "Notice not found." },
        { status: 404 }
      );
    }

    /*
     * Keep the existing Google Calendar event ID.
     *
     * This is important because syncNoticeToGoogleCalendar()
     * will UPDATE the existing event instead of creating
     * another event.
     */
    const existingNotice = notices[index];

    const updatedNotice: NoticeItem = {
      id,
      ...parsed.data,
      gcalEventId: existingNotice.gcalEventId,
    };

    /*
     * Save the updated notice first.
     */
    notices[index] = updatedNotice;

    await writeJsonFile(
      "notices.json",
      notices
    );

    /*
     * Synchronize the updated notice with Google Calendar.
     *
     * If gcalEventId exists:
     *     → existing Calendar event is updated.
     *
     * If it does not exist:
     *     → a new Calendar event is created.
     *
     * If the notice is no longer within the 14-day window:
     *     → the Calendar event is deleted.
     */
    const gcalEventId =
      await syncNoticeToGoogleCalendar(
        updatedNotice
      );

    /*
     * Save the new/updated Google Calendar event ID.
     */
    if (gcalEventId !== updatedNotice.gcalEventId) {
      updatedNotice.gcalEventId = gcalEventId;

      notices[index] = updatedNotice;

      await writeJsonFile(
        "notices.json",
        notices
      );
    }

    return NextResponse.json({
      message: "Notice updated.",
      notice: updatedNotice,
    });
  } catch (error) {
    console.error(
      "[Notice PUT] Failed to update notice:",
      error
    );

    return NextResponse.json(
      {
        message: "Failed to update notice.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/notices/[id]
 *
 * Deletes the notice and its corresponding
 * Google Calendar event.
 */
export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json(
      { message: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;

    const notices = await readJsonFile<NoticeItem[]>(
      "notices.json",
      []
    );

    const notice = notices.find(
      (item) => item.id === id
    );

    if (!notice) {
      return NextResponse.json(
        { message: "Notice not found." },
        { status: 404 }
      );
    }

    /*
     * Delete the Google Calendar event first.
     */
    if (notice.gcalEventId) {
      await deleteGoogleCalendarEvent(
        notice.gcalEventId
      );
    }

    /*
     * Remove the notice from notices.json.
     */
    const filtered = notices.filter(
      (item) => item.id !== id
    );

    await writeJsonFile(
      "notices.json",
      filtered
    );

    return NextResponse.json({
      message: "Notice deleted.",
    });
  } catch (error) {
    console.error(
      "[Notice DELETE] Failed to delete notice:",
      error
    );

    return NextResponse.json(
      {
        message: "Failed to delete notice.",
      },
      { status: 500 }
    );
  }
}