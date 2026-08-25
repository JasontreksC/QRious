import ExcelJS from 'exceljs';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { fetchJoinedStudents, filterStudents } from '@/lib/admin-students';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

function stamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const sql = getSql();
    const query = req.nextUrl.searchParams.get('q') ?? '';
    const students = filterStudents(await fetchJoinedStudents(sql), query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QRious';
    const sheet = workbook.addWorksheet('참가자');

    sheet.columns = [
      { header: '학번', key: 'student_id', width: 14 },
      { header: '이름', key: 'name', width: 12 },
      { header: '성별', key: 'gender', width: 8 },
      { header: '나이', key: 'age', width: 8 },
      { header: 'MBTI', key: 'mbti', width: 10 },
      { header: 'have', key: 'have', width: 40 },
      { header: 'want', key: 'want', width: 40 },
      { header: 'ex_have', key: 'ex_have', width: 40 },
      { header: 'ex_want', key: 'ex_want', width: 40 },
    ];

    sheet.getRow(1).font = { bold: true };

    for (const s of students) {
      sheet.addRow({
        student_id: s.student_id,
        name: s.name,
        gender: s.gender ? '여자' : '남자',
        age: s.age ?? '',
        mbti: s.mbti,
        have: s.have.join(', '),
        want: s.want.join(', '),
        ex_have: s.ex_have ?? '',
        ex_want: s.ex_want ?? '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `qrious-students-${stamp()}.xlsx`;

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('GET /api/admin/students/export', err);
    return jsonError(500, 'INTERNAL_ERROR', '엑셀 파일을 만들지 못했습니다.');
  }
}
