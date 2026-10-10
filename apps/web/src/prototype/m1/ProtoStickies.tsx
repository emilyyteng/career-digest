import type { ProtoSticky } from "./fixtures";

/** Placeholder Reflections / stickies block for M1 prototypes (not wired). */
export default function ProtoStickies({
  items,
  sectionByStep = false,
  /** Match edit-details column height with internal scroll */
  fillHeight = false,
}: {
  items: ProtoSticky[];
  sectionByStep?: boolean;
  fillHeight?: boolean;
}) {
  const groups = sectionByStep
    ? groupByStep(items)
    : [{ key: "all", label: null as string | null, items }];

  return (
    <section className={`proto-stickies${fillHeight ? " is-fill" : ""}`}>
      <header className="proto-stickies-head">
        <h3 className="proto-section-title">Reflections</h3>
        <span className="proto-pill muted">prototype · M2</span>
      </header>
      <div className="proto-stickies-scroll">
        {items.length === 0 ? (
          <p className="muted proto-stickies-empty">
            No stickies yet. Completing work will offer an optional reflection here.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.key} className="proto-stickies-group">
              {group.label && <h4 className="proto-stickies-group-label">{group.label}</h4>}
              <ul className="proto-stickies-list">
                {group.items.map((item) => (
                  <li key={item.id} className="proto-sticky">
                    <div className="proto-sticky-bar">
                      <strong>{item.title}</strong>
                      <span className="muted">{item.when}</span>
                      {item.deepWork && <span className="proto-pill proto-pill-dw">deep work</span>}
                    </div>
                    <p className="proto-sticky-body">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
      <button type="button" className="secondary" disabled>
        Add reflection…
      </button>
    </section>
  );
}

function groupByStep(items: ProtoSticky[]) {
  const map = new Map<string, ProtoSticky[]>();
  for (const item of items) {
    const key = item.stepLabel ?? "Other";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()].map(([label, groupItems]) => ({
    key: label,
    label,
    items: groupItems,
  }));
}
