import { useState } from 'react';
import { catalogById } from '../../../shared/mock/catalog';
import { Button, Card, Chip, Segmented, Stat, Stub } from '../../../shared/ui';
import { GuestLock } from '../GuestLock';
import { useWizard } from '../context';
import { WizardFooter } from '../WizardFooter';

type View = '2d' | '3d';

/**
 * Шаг 7. Визуализация — ЗАГЛУШКА.
 * Каркас экрана (панели, списки, KPI) уже на месте; 2D-редактор, 3D-вьювер
 * и проигрывание симуляции встраиваются в отмеченные области позже.
 */
export function StepTopology() {
  const { draft, isDemo, next } = useWizard();
  const [view, setView] = useState<View>('2d');

  if (isDemo) {
    return <GuestLock title="Визуализация доступна после регистрации" benefit="На плане объекта можно расставить роботов, проиграть симуляцию и найти узкие места." />;
  }

  const type = draft.objectType ?? 'warehouse';
  const zones = ((draft.params[type]?.working_zones as string[] | undefined) ?? ['Приёмка', 'Хранение', 'Отгрузка', 'Зарядка']).slice(0, 6);
  const robots = draft.selected.map((id) => ({ id, name: catalogById(id)?.identification.product_name ?? id, qty: draft.quantities[id] ?? 1 }));

  return (
    <>
      <div className="page wizard-body" style={{ maxWidth: 'none' }}>
        <div className="page-head">
          <div className="page-head__text">
            <span className="label">Шаг 7 из 8 · необязательный</span>
            <h1>Визуализация и симуляция</h1>
            <p className="muted">Расставьте зоны и роботов на плане объекта и проверьте, справится ли техника с нагрузкой. Шаг можно пропустить — экономика от него не зависит.</p>
          </div>
          <div className="page-head__actions">
            <Segmented<View>
              label="Вид"
              value={view}
              onChange={setView}
              options={[
                { value: '2d', label: '2D-план' },
                { value: '3d', label: '3D-вид' },
              ]}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) 280px', gap: 16, alignItems: 'start' }}>
          <Card title="Инструменты">
            <div className="stack stack--sm">
              {['Зона', 'Маршрут', 'Точка операции', 'Зарядка', 'Робот'].map((tool) => (
                <Button key={tool} block variant="secondary" disabled title="Появится вместе с редактором">
                  + {tool}
                </Button>
              ))}
              <p className="faint" style={{ marginTop: 6 }}>
                Масштаб: 1 клетка = 1 м
              </p>
            </div>
          </Card>

          <div className="stack">
            {view === '2d' ? (
              <Stub
                title="2D-редактор плана объекта"
                owner="Алексей (editor2d)"
                contracts={['TopologyConfig', 'Zone', 'Route', 'OperationPoint', 'RobotPlacement']}
                minHeight={440}
                planned={[
                  'Подложка — план объекта (загрузка изображения или DXF), масштаб в метрах',
                  'Рисование зон (хранение, операции, зарядка, ограниченный доступ, транзит) полигонами',
                  'Маршруты ломаными и точки операций/зарядки',
                  'Расстановка роботов из состава оборудования — перетаскиванием из правой панели',
                  'Проверка: ширина проходов против требований выбранной техники',
                ]}
              >
                Здесь встраивается редактор. Экран вокруг — панели, список роботов, KPI и управление симуляцией — уже готов и ждёт данные.
              </Stub>
            ) : (
              <Stub
                title="3D-вид объекта"
                owner="Алексей (viewer3d)"
                contracts={['TopologyConfig', 'SimulationTimeline']}
                minHeight={440}
                planned={['Та же сцена, что в 2D, в объёме', 'Проигрывание таймлайна симуляции: роботы движутся по кадрам', 'Подсветка узких мест и заблокированных роботов']}
              />
            )}

            <Card>
              <div className="row" style={{ gap: 14 }}>
                <Button variant="primary" disabled title="Появится вместе с симуляцией">
                  ▶ Запустить симуляцию
                </Button>
                <div className="progress" style={{ flex: 1 }} aria-hidden>
                  <span style={{ width: '0%' }} />
                </div>
                <span className="mono faint">00:00 / 60:00</span>
                <Chip tone="warn" plain>
                  Симуляция — заглушка
                </Chip>
              </div>
              <p className="faint" style={{ marginTop: 10 }}>
                Таймлайн считается на бэкенде один раз (до 60 с, со статусом) и здесь только проигрывается — без физики в браузере.
              </p>
            </Card>
          </div>

          <div className="stack">
            <Card title="Роботы на сцене">
              {robots.length ? (
                <div className="stack stack--sm">
                  {robots.map((r) => (
                    <div key={r.id} className="row row--between">
                      <span>{r.name}</span>
                      <span className="num muted">0 из {r.qty}</span>
                    </div>
                  ))}
                  <p className="faint">Расставлено 0 — перетащите на план.</p>
                </div>
              ) : (
                <p className="muted">Состав оборудования пуст — вернитесь на шаг «Сравнение».</p>
              )}
            </Card>
            <Card title="Зоны объекта">
              <div className="row">
                {zones.map((z) => (
                  <Chip key={z} plain>
                    {z}
                  </Chip>
                ))}
              </div>
              <p className="faint" style={{ marginTop: 8 }}>
                Из параметров объекта. На плане пока не нарисованы.
              </p>
            </Card>
            <div className="grid grid--2" style={{ gap: 10 }}>
              <Stat label="Загрузка" value="—" sub="utilization_pct" />
              <Stat label="Простой" value="—" sub="idle_time_pct" />
              <Stat label="Производит." value="—" sub="операций/ч" />
              <Stat label="Узкие места" value="—" sub="после симуляции" />
            </div>
          </div>
        </div>
      </div>
      <WizardFooter nextLabel="Пропустить и перейти к сохранению →" onNext={next} />
    </>
  );
}
