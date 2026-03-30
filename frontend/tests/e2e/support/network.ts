import type { Page } from '@playwright/test';

type MockGroupSummary = {
  groupId: number;
  name: string;
  role: 'OWNER' | 'MEMBER';
  lastPost?: {
    content: string;
    author: string;
    createdAt: string;
  } | null;
};

type PublicGroup = {
  id: number;
  name: string;
  description: string;
  member_count: number;
  invite_code: string;
  visibility: 'public' | 'private';
  creator_id: number;
  created_at: string;
  cover_url?: string;
};

function toBase64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

export function createFakeJwt(overrides: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: '1',
    exp: now + 60 * 60,
    ...overrides,
  };

  return [
    toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    toBase64Url(JSON.stringify(payload)),
    'playwright-signature',
  ].join('.');
}

export async function mockCommonRequests(page: Page): Promise<void> {
  await page.route('https://api.dicebear.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"></svg>',
    });
  });

  await page.route('https://placehold.co/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"></svg>',
    });
  });

  await page.route('**/api/artworks**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

export async function mockLoginSuccess(page: Page, user = { id: 1, username: 'playwright-user' }): Promise<string> {
  const token = createFakeJwt({ sub: String(user.id) });

  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        JWT: token,
        user: {
          ...user,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`,
        },
      }),
    });
  });

  return token;
}

export async function mockLoginFailure(page: Page, detail = 'Credenciais inválidas.'): Promise<void> {
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail }),
    });
  });
}

export async function mockRegisterSuccess(page: Page, user = { id: 2, username: 'novo-artista' }): Promise<string> {
  const token = createFakeJwt({ sub: String(user.id) });

  await page.route('**/auth/register', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        JWT: token,
        user: {
          ...user,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`,
        },
      }),
    });
  });

  return token;
}

export async function mockGroups(
  page: Page,
  {
    mine = [
      {
        groupId: 10,
        name: 'Ateliê Central',
        role: 'OWNER',
        lastPost: {
          content: 'Estudo de luz e sombra',
          author: 'playwright-user',
          createdAt: '2026-03-30T12:00:00.000Z',
        },
      },
    ] satisfies MockGroupSummary[],
    publicGroups = [
      {
        id: 99,
        name: 'Coletivo Aberto',
        description: 'Grupo público para novos artistas.',
        member_count: 12,
        invite_code: 'ABERTO99',
        visibility: 'public',
        creator_id: 5,
        created_at: '2026-03-30T12:00:00.000Z',
      },
    ] satisfies PublicGroup[],
    searchResults = [] as PublicGroup[],
  } = {}
): Promise<void> {
  await page.route('**/group/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mine),
    });
  });

  await page.route('**/api/groups/public', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(publicGroups),
    });
  });

  await page.route('**/api/groups/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(searchResults),
    });
  });
}
