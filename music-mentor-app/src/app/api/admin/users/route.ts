import { supabaseServer } from '@/lib/supabaseServer';

const getAdminSecret = (request: Request) => {
  return request.headers.get('x-admin-secret') || '';
};

const assertAdmin = (request: Request) => {
  const secret = getAdminSecret(request);
  return secret && process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
};

export async function GET(request: Request) {
  try {
    if (!assertAdmin(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseServer.auth.admin.listUsers();
    if (error) {
      console.error('Admin list users error:', error);
      return Response.json({ error: 'Failed to list users' }, { status: 500 });
    }

    const users = (data.users || []).map((user) => ({
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
    }));

    return Response.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    return Response.json({ error: 'Admin request failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!assertAdmin(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const password = typeof body.password === 'string' ? body.password.trim() : '';

    if (!userId || !password) {
      return Response.json({ error: 'userId and password are required' }, { status: 400 });
    }

    const { error } = await supabaseServer.auth.admin.updateUserById(userId, { password });
    if (error) {
      console.error('Admin reset error:', error);
      return Response.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Admin reset error:', error);
    return Response.json({ error: 'Admin request failed' }, { status: 500 });
  }
}
