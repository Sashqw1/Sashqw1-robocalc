/**
 * Компонентные тесты числового поля формы (shared/ui/Field.tsx → NumberField).
 * Проверяется, что показанное в поле значение совпадает с тем, что уходит в данные.
 */
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumberField } from './Field';

/** Обёртка с состоянием: ведёт себя так же, как форма визарда */
function Harness({ onValue }: { onValue: (v: number | null) => void }) {
  const [value, setValue] = useState<number | null>(100);
  return (
    <NumberField
      label="Площадь"
      unit="м²"
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue(v);
      }}
    />
  );
}

describe('NumberField — ввод числовых значений', () => {
  it('принимает обычное число', async () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '2500');
    expect(onValue).toHaveBeenLastCalledWith(2500);
  });

  it('принимает дробное число с запятой — как принято в русской локали', async () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '12,5');
    expect(onValue).toHaveBeenLastCalledWith(12.5);
  });

  // Падает: BUG-004 — поле показывает «12абв», в данные уходит 12.
  it.fails('при вводе текста поле и данные не расходятся', async () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, '12абв');

    // Поле показывает то, что набрал пользователь
    expect(input.value).toBe('12абв');
    // Но в данные ушло только «12»: дальше поле и состояние расходятся,
    // а пользователю об этом ничего не сообщается
    const lastValue = onValue.mock.calls.at(-1)?.[0];
    expect(
      String(lastValue),
      `в поле «${input.value}», в данных «${lastValue}» — расхождение без предупреждения`,
    ).toBe(input.value);
  });

  // Падает: BUG-005 — «0x10» интерпретируется как 16.
  it.fails('не принимает шестнадцатеричную запись как число', async () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '0x10');
    const lastValue = onValue.mock.calls.at(-1)?.[0];
    expect(lastValue, '«0x10» интерпретировано как число 16').not.toBe(16);
  });
});
