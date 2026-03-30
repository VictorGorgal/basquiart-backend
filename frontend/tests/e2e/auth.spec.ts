import { expect, test } from '@playwright/test';
import {
  createFakeJwt,
  mockCommonRequests,
  mockGroups,
  mockLoginFailure,
  mockLoginSuccess,
  mockRegisterSuccess,
} from './support/network';

test.beforeEach(async ({ page }) => {
  await mockCommonRequests(page);
});

test('renderiza a tela inicial de login', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: /Bem-vindo/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar no Estúdio' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible();
});

test('mostra erro amigável quando o login falha', async ({ page }) => {
  await mockLoginFailure(page, 'Usuário ou senha inválidos.');
  await page.goto('/');

  await page.getByLabel(/Nome de usuário/i).fill('usuario-invalido');
  await page.getByLabel(/Senha/i).fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar no Estúdio' }).click();

  await expect(page.getByText(/nao autorizado\. faca login novamente\./i)).toBeVisible();
});

test('faz login com sucesso e mantém a sessão salva no navegador', async ({ page }) => {
  const token = await mockLoginSuccess(page, { id: 7, username: 'vinicius' });
  await page.goto('/');

  await page.getByLabel('Nome de usuário').fill('vinicius');
  await page.getByLabel('Senha').fill('123456');
  await page.getByRole('button', { name: 'Entrar no Estúdio' }).click();

  await expect(page.getByRole('button', { name: /ENVIAR ARTE/i })).toBeVisible();
  await expect(page.getByText('A galeria aguarda sua primeira pincelada.')).toBeVisible();

  await expect.poll(async () => page.evaluate(() => localStorage.getItem('basquiart_jwt_token'))).toBe(token);
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('basquiart_user')))
    .toContain('vinicius');
});

test('carrega os coletivos do usuário com sessão previamente autenticada', async ({ page }) => {
  const token = createFakeJwt({ sub: '12' });

  await page.addInitScript(({ authToken }) => {
    localStorage.setItem('basquiart_jwt_token', authToken);
    localStorage.setItem(
      'basquiart_user',
      JSON.stringify({
        id: 12,
        username: 'grupo-teste',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=grupo-teste',
      })
    );
  }, { authToken: token });

  await mockGroups(page, {
    mine: [
      {
        groupId: 12,
        name: 'Curadoria Interna',
        role: 'OWNER',
        lastPost: {
          content: 'Última rodada de feedback',
          author: 'grupo-teste',
          createdAt: '2026-03-30T15:00:00.000Z',
        },
      },
    ],
    publicGroups: [
      {
        id: 45,
        name: 'Laboratório de Cores',
        description: 'Espaço aberto para estudos cromáticos.',
        member_count: 18,
        invite_code: 'CORES45',
        visibility: 'public',
        creator_id: 3,
        created_at: '2026-03-30T15:00:00.000Z',
      },
    ],
  });

  await page.goto('/');
  await page.getByTitle('Grupos').click();

  await expect(page.getByRole('heading', { name: 'Coletivos de Arte' })).toBeVisible();
  await expect(page.getByText('Curadoria Interna')).toBeVisible();
  await expect(page.getByText('Laboratório de Cores')).toBeVisible();
});

test('permite cadastro de um novo usuário pelo fluxo principal', async ({ page }) => {
  await mockRegisterSuccess(page, { id: 21, username: 'novo-artista' });
  await page.goto('/');

  await page.getByLabel('Nome de usuário').fill('novo-artista');
  await page.getByLabel('Senha').fill('senha123');
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page.getByRole('button', { name: /ENVIAR ARTE/i })).toBeVisible();
  await expect(page.getByText('A galeria aguarda sua primeira pincelada.')).toBeVisible();
});
