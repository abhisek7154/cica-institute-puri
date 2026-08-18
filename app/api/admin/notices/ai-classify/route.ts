import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { classifyNoticeWithAI } from "@/lib/ai-classifier";
import { aiClassifySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = aiClassifySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid notice text." },
        { status: 400 }
      );
    }

    const classification = await classifyNoticeWithAI(parsed.data.text);

    if (!classification) {
      return NextResponse.json(
        { message: "AI classification failed or is unconfigured. Please enter details manually." },
        { status: 422 }
      );
    }

    return NextResponse.json({ classification });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to classify notice."
      },
      { status: 500 }
    );
  }
}
