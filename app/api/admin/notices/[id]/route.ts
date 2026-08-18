import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { readJsonFile, writeJsonFile } from "@/lib/file-store";
import { NoticeItem } from "@/lib/types";
import { noticeSchema, reorderSchema } from "@/lib/validation";
import { syncNoticeToGoogleCalendar } from "@/lib/google-calendar";

export const runtime = "nodejs";

/**
 * POST /api/admin/notices
 *
 * Creates a notice and automatically syncs it
 * with Google Calendar.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json(
      { message: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const payload = await request.json();
    const parsed = noticeSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ??
            "Invalid notice data.",
        },
        { status: 400 }
      );
    }

    const notices = await readJsonFile<NoticeItem[]>(
      "notices.json",
      []
    );

    const nextNotice: NoticeItem = {
      id: `notice-${Date.now()}`,
      ...parsed.data,
    };

    /*
     * Save the notice first.
     *
     * This ensures a Google Calendar failure does not
     * prevent the CICA notice from being created.
     */
    notices.unshift(nextNotice);

    await writeJsonFile("notices.json", notices);

    /*
     * Create the Google Calendar event.
     *
     * The helper returns the Google Calendar event ID.
     */
    const gcalEventId =
      await syncNoticeToGoogleCalendar(nextNotice);

    /*
     * Save the Google Calendar event ID with the notice.
     *
     * This prevents duplicate Calendar events when the
     * notice is edited later.
     */
    if (gcalEventId) {
      nextNotice.gcalEventId = gcalEventId;

      const index = notices.findIndex(
        (notice) => notice.id === nextNotice.id
      );

      if (index !== -1) {
        notices[index] = nextNotice;

        await writeJsonFile(
          "notices.json",
          notices
        );
      }
    }

    return NextResponse.json({
      message: "Notice added successfully.",
      notice: nextNotice,
    });
  } catch (error) {
    console.error(
      "[Notice POST] Failed to create notice:",
      error
    );

    return NextResponse.json(
      {
        message: "Failed to create notice.",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/notices
 *
 * Reorders notices.
 *
 * Calendar events are not affected by reordering.
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json(
      { message: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const payload = await request.json();
    const parsed = reorderSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid reorder payload.",
        },
        { status: 400 }
      );
    }

    const notices = await readJsonFile<NoticeItem[]>(
      "notices.json",
      []
    );

    if (parsed.data.ids.length !== notices.length) {
      return NextResponse.json(
        {
          message:
            "Reorder list must include all notice IDs.",
        },
        { status: 400 }
      );
    }

    const noticeMap = new Map(
      notices.map((notice) => [notice.id, notice])
    );

    const reordered = parsed.data.ids
      .map((id) => noticeMap.get(id))
      .filter(
        (notice): notice is NoticeItem =>
          Boolean(notice)
      );

    if (reordered.length !== notices.length) {
      return NextResponse.json(
        {
          message:
            "Reorder payload has unknown IDs.",
        },
        { status: 400 }
      );
    }

    await writeJsonFile(
      "notices.json",
      reordered
    );

    return NextResponse.json({
      message: "Notices reordered.",
      notices: reordered,
    });
  } catch (error) {
    console.error(
      "[Notice PATCH] Failed to reorder notices:",
      error
    );

    return NextResponse.json(
      {
        message: "Failed to reorder notices.",
      },
      { status: 500 }
    );
  }
}