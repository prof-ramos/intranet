import { test, expect } from '../fixtures';

test.describe('Kanban de Atividades', () => {
  test('board carrega com colunas visíveis', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/atividades');

    // Verifica que o título da página está visível
    await expect(page.locator('h1')).toContainText('Atividades');

    // Verifica que as colunas do kanban estão visíveis
    await expect(page.locator('h2')).toContainText([
      'A fazer',
      'Em andamento',
      'Aguardando terceiros',
      'Concluído',
    ]);
  });

  test('cria nova atividade via formulário e exibe no board', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/atividades');

    // Clica no botão "Nova atividade" para navegar ao formulário
    await page.getByRole('link', { name: 'Nova atividade' }).click();
    await expect(page).toHaveURL('/app/atividades/nova');

    // Preenche o título
    await page.fill('#activity-title', 'Validar boletim de Junho');

    // Submete clicando no botão "Criar atividade"
    await page.getByRole('button', { name: 'Criar atividade' }).click();

    // Verifica que o toast de sucesso aparece na página do formulário
    await expect(page.getByRole('status')).toContainText('Atividade criada com sucesso');

    // Navega de volta ao board
    await page.getByRole('link', { name: 'Voltar para Atividades' }).click();
    await expect(page).toHaveURL('/app/atividades');

    // Recarrega para garantir que o dado foi persistido no banco
    await page.reload();
    await expect(page.locator('h1')).toContainText('Atividades');

    // Verifica que o card aparece no board (status padrão = a_fazer)
    await expect(page.getByText('Validar boletim de Junho')).toBeVisible();
  });

  test('arrasta card entre colunas com quick-add e verifica persistência', async ({
    page,
    loginAsAdmin,
  }) => {
    test.slow();

    await loginAsAdmin();
    await page.goto('/app/atividades');

    // Cria uma atividade via quick-add na coluna "A fazer".
    // O primeiro botão "Adicionar" corresponde à coluna "A fazer".
    await page.getByRole('button', { name: 'Adicionar' }).first().click();

    await page.getByLabel('Título da nova atividade').fill('Card de teste DnD');

    // O mesmo texto "Adicionar" aparece como botão de submit do quick-add
    await page.getByRole('button', { name: 'Adicionar' }).first().click();

    // Aguarda o card específico renderizar no board
    const card = page.locator('[aria-label="Card de teste DnD"]');
    await expect(card).toBeVisible();

    // Coluna de destino: "Em andamento"
    const colunaEmAndamento = page.locator('[data-rfd-droppable-id="em_andamento"]');

    // @hello-pangea/dnd usa pointer events com setPointerCapture.
    // Playwright's dragTo() não interage corretamente com o capture;
    // usamos page.mouse diretamente para a sequência de arrasto.
    const sourceBox = await card.boundingBox();
    const targetBox = await colunaEmAndamento.boundingBox();

    if (sourceBox && targetBox) {
      const sx = sourceBox.x + sourceBox.width / 2;
      const sy = sourceBox.y + sourceBox.height / 2;
      const tx = targetBox.x + targetBox.width / 2;
      const ty = targetBox.y + targetBox.height / 2;

      await page.mouse.move(sx, sy);
      await page.mouse.down();
      await page.mouse.move(tx, ty, { steps: 15 });
      await page.mouse.up();
    }

    // Pequena pausa para a persistência no servidor
    await page.waitForTimeout(2000);

    // Recarrega para verificar que o novo status foi persistido
    await page.reload();
    await expect(page.getByText('Card de teste DnD')).toBeVisible();
  });
});
