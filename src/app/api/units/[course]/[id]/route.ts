import { NextResponse } from 'next/server';
import { getUnitById } from '@/lib/content/loader';
import { CourseIdSchema } from '@/lib/content/schema';

export async function GET(
  _request: Request,
  context: { params: Promise<{ course: string; id: string }> },
) {
  const { course: rawCourse, id } = await context.params;
  const parsedCourse = CourseIdSchema.safeParse(rawCourse);

  if (!parsedCourse.success || !/^[a-z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid unit request' }, { status: 400 });
  }

  const unit = getUnitById(parsedCourse.data, id);
  if (!unit) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  }

  return NextResponse.json(unit, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
