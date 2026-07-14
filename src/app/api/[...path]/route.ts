import { NextRequest, NextResponse } from 'next/server';

const backendBase = (process.env.API_BASE_URL || '').replace(/\/$/, '');

function isValidUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://');
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(req: NextRequest, context: RouteContext) {
  if (!isValidUrl(backendBase)) {
    return NextResponse.json(
      {
        error: {
          code: 'CONFIG_MISSING',
          message:
            'API 설정이 구성되지 않았습니다. .env.local 파일에 API_BASE_URL이 유효하게 입력되어 있는지 확인해 주세요.',
        },
      },
      { status: 503 }
    );
  }

  const { path } = await context.params;
  const targetPath = path.join('/');
  const targetUrl = `${backendBase}/api/${targetPath}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) {
    headers.set('content-type', contentType);
  }
  headers.set('accept', req.headers.get('accept') || 'application/json');

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'UPSTREAM_UNAVAILABLE',
          message: '백엔드 서버에 연결할 수 없습니다.',
        },
      },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get('content-type');
  if (upstreamContentType) {
    responseHeaders.set('content-type', upstreamContentType);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest, context: RouteContext) {
  return proxy(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return proxy(req, context);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return proxy(req, context);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return proxy(req, context);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return proxy(req, context);
}
