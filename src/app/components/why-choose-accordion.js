"use client";

import { useMemo, useState } from "react";

export default function WhyChooseAccordion({ items = [], styles }) {
  const normalizedItems = useMemo(
    () =>
      items.map((item) => ({
        title: String(item?.title || "").trim(),
        description: String(item?.description || "").trim(),
      })),
    [items],
  );

  const initialOpenIndex = Math.max(
    0,
    items.findIndex((item) => item?.expanded),
  );
  const [openIndex, setOpenIndex] = useState(initialOpenIndex);

  return (
    <div className={styles.whyChooseAccordion} aria-label="Why choose us highlights">
      {normalizedItems.map((item, index) => {
        const isOpen = index === openIndex;
        const panelId = `why-choose-panel-${index}`;
        const triggerId = `why-choose-trigger-${index}`;

        return (
          <article
            key={item.title || `item-${index}`}
            className={`${styles.whyChooseItem} ${isOpen ? styles.whyChooseItemExpanded : ""}`}
          >
            <button
              id={triggerId}
              type="button"
              className={styles.whyChooseItemTrigger}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex((current) => (current === index ? -1 : index))}
            >
              <div className={styles.whyChooseItemHeader}>
                <h3 className={styles.whyChooseItemTitle}>{item.title}</h3>
                <span className={styles.whyChooseItemIcon} aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </div>
            </button>

            {isOpen && item.description ? (
              <p id={panelId} className={styles.whyChooseItemText} role="region" aria-labelledby={triggerId}>
                {item.description}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
