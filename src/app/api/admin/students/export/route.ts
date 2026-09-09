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
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const sql = getSql();
    const query = req.nextUrl.searchParams.get('q') ?? '';
    const students = filterStudents(await fetchJoinedStudents(sql), query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QRious';
    const sheet = workbook.addWorksheet('참가자');

    sheet.columns = [
      { header: '이름', key: 'name', width: 12 },
      { header: '이메일', key: 'email', width: 28 },
      { header: '학과', key: 'major', width: 22 },
      { header: '전화번호', key: 'phone', width: 16 },
      { header: '성별', key: 'gender', width: 8 },
      { header: '나이', key: 'age', width: 8 },
      { header: '선호 연령', key: 'age_prefs', width: 18 },
      { header: 'MBTI', key: 'mbti', width: 10 },
      { header: '매력', key: 'have', width: 40 },
      { header: '이상형', key: 'want', width: 40 },
      { header: '기타 매력', key: 'ex_have', width: 40 },
      { header: '기타 이상형', key: 'ex_want', width: 40 },
      { header: '동의 여부', key: 'consent_agreed', width: 12 },
      { header: '동의 시각', key: 'consented_at', width: 22 },
      { header: '동의문 버전', key: 'consent_version', width: 16 },
      { header: '제3자 제공 동의', key: 'third_party_consent_agreed', width: 16 },
      { header: '제3자 제공 동의 시각', key: 'third_party_consented_at', width: 22 },
      { header: '제3자 제공 동의문 버전', key: 'third_party_consent_version', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true };

    for (const s of students) {
      sheet.addRow({
        name: s.name,
        email: s.email ?? '',
        major: s.major ?? '',
        phone: s.phone,
        gender: s.gender ? '여자' : '남자',
        age: s.age ?? '',
        age_prefs: s.age_prefs.join(', '),
        mbti: s.mbti,
        have: s.have.join(', '),
        want: s.want.join(', '),
        ex_have: s.ex_have ?? '',
        ex_want: s.ex_want ?? '',
        consent_agreed: s.consent_agreed === true ? '동의' : '미확인',
        consented_at: s.consented_at ?? '',
        consent_version: s.consent_version ?? '',
        third_party_consent_agreed:
          s.third_party_consent_agreed === true ? '동의' : '미확인',
        third_party_consented_at: s.third_party_consented_at ?? '',
        third_party_consent_version: s.third_party_consent_version ?? '',
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
