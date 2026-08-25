export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    const message =
      body?.error?.message || body?.message || `요청에 실패했습니다 (${res.status})`;
    const code = body?.error?.code;
    return new ApiError(message, res.status, code);
  } catch {
    return new ApiError(`요청에 실패했습니다 (${res.status})`, res.status);
  }
}

/** Same-origin calls to Next.js Route Handlers (Neon on the server). */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export type Charm = {
  charm_id: string;
  name: string;
};

export type SurveyStats = {
  total: number;
  male: number;
  female: number;
};

export type SurveyPayload = {
  student_id: string;
  name: string;
  gender: boolean;
  age: number;
  mbti: string;
  have_charm_ids: string[];
  want_charm_ids: string[];
  ex_have?: string | null;
  ex_want?: string | null;
};

export type SurveyResponse = {
  student_id: string;
};

export async function getCharms(): Promise<Charm[]> {
  const data = await request<{ charms: Charm[] }>('/api/charms');
  return data.charms ?? [];
}

export async function getStats(): Promise<SurveyStats> {
  return request<SurveyStats>('/api/stats');
}

export async function submitSurvey(
  payload: SurveyPayload
): Promise<SurveyResponse> {
  return request<SurveyResponse>('/api/surveys', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type AdminStudent = {
  student_id: string;
  name: string;
  gender: boolean;
  age: number | null;
  mbti: string;
  have: string[];
  want: string[];
  ex_have: string | null;
  ex_want: string | null;
};

export async function getAdminSession(): Promise<{ authenticated: boolean }> {
  return request<{ authenticated: boolean }>('/api/admin/session');
}

export async function adminLogin(password: string): Promise<void> {
  await request<{ ok: boolean }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function adminLogout(): Promise<void> {
  await request<{ ok: boolean }>('/api/admin/logout', { method: 'POST' });
}

export async function getAdminStudents(): Promise<AdminStudent[]> {
  const data = await request<{ students: AdminStudent[] }>(
    '/api/admin/students'
  );
  return data.students ?? [];
}

export async function createCharm(name: string): Promise<Charm> {
  return request<Charm>('/api/admin/charms', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteCharm(charmId: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/admin/charms/${charmId}`, {
    method: 'DELETE',
  });
}

export async function deleteAdminStudent(studentId: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/admin/students/${studentId}`, {
    method: 'DELETE',
  });
}

export async function downloadAdminStudentsXlsx(query = ''): Promise<void> {
  const params = query.trim()
    ? `?q=${encodeURIComponent(query.trim())}`
    : '';
  const res = await fetch(`/api/admin/students/export${params}`, {
    headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const header = res.headers.get('Content-Disposition') ?? '';
  const matched = header.match(/filename="([^"]+)"/);
  anchor.href = url;
  anchor.download = matched?.[1] ?? 'qrious-students.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
