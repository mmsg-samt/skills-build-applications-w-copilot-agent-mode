import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getJson } from '../api/client.js';

type Props<T> = {
  title: string;
  description: string;
  endpoint: string;
  collection: string;
  emptyMessage: string;
  renderItem: (item: T) => ReactNode;
};

export function CapabilityCard<T>({ title, description, endpoint, collection, emptyMessage, renderItem }: Props<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    getJson<Record<string, T[]>>(endpoint)
      .then((response) => {
        if (isCurrent) setItems(response[collection] ?? []);
      })
      .catch(() => {
        if (isCurrent) setHasError(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [collection, endpoint]);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">{title}</h2>
    <p>{description}</p>
    {hasError
      ? <p role="alert">Unable to load {title.toLowerCase()}. Please try again.</p>
      : items === null
        ? <p role="status">Loading {title.toLowerCase()}...</p>
        : items.length === 0
          ? <p>{emptyMessage}</p>
          : <ul className="list-group">{items.map((item, index) => <li className="list-group-item" key={index}>{renderItem(item)}</li>)}</ul>}
  </div></section>;
}
