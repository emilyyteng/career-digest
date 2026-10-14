import type { Pool, PoolClient } from "pg";
import {
  CAT_CAKE_FLAVOR_IDS,
  friendshipLevel,
  isCatCakeFlavorId,
  nightUnlocked,
  refundableCount,
  type CatCakeEdition,
  type CatCakeFlavorId,
  type CatCakeLook,
} from "./catCakeCatalog.js";

type Queryable = Pool | PoolClient;

export type CatCakeVariantView = {
  flavorId: CatCakeFlavorId;
  edition: CatCakeEdition;
  copies: number;
  friendshipLevel: number;
  refundable: number;
  /** Collector only: true once owned CE copies ≥ 2. */
  nightUnlocked: boolean | null;
  /** Collector only: selected Day/Night look (default day). */
  selectedLook: CatCakeLook | null;
};

export type CatCakeCollectionView = {
  pity: number;
  variants: CatCakeVariantView[];
};

async function ensurePityRow(db: Queryable): Promise<void> {
  await db.query(
    `INSERT INTO cat_cake_pity (singleton, pity) VALUES (true, 0)
     ON CONFLICT (singleton) DO NOTHING`,
  );
}

export async function getPity(db: Queryable): Promise<number> {
  await ensurePityRow(db);
  const { rows } = await db.query<{ pity: number }>(
    `SELECT pity FROM cat_cake_pity WHERE singleton = true`,
  );
  return rows[0]?.pity ?? 0;
}

/** Test / pull-API helper. */
export async function setPity(db: Queryable, pity: number): Promise<void> {
  await ensurePityRow(db);
  await db.query(`UPDATE cat_cake_pity SET pity = $1 WHERE singleton = true`, [
    Math.max(0, Math.floor(pity)),
  ]);
}

/** Test / pull-API helper: set absolute owned count for a variant. */
export async function setOwnedCopies(
  db: Queryable,
  flavorId: CatCakeFlavorId,
  edition: CatCakeEdition,
  copies: number,
): Promise<void> {
  const n = Math.max(0, Math.floor(copies));
  if (n === 0) {
    await db.query(
      `DELETE FROM cat_cake_owned WHERE flavor_id = $1 AND edition = $2`,
      [flavorId, edition],
    );
    return;
  }
  await db.query(
    `INSERT INTO cat_cake_owned (flavor_id, edition, copies)
     VALUES ($1, $2, $3)
     ON CONFLICT (flavor_id, edition) DO UPDATE SET copies = EXCLUDED.copies`,
    [flavorId, edition, n],
  );
}

export async function setSelectedLook(
  db: Queryable,
  flavorId: CatCakeFlavorId,
  look: CatCakeLook,
): Promise<void> {
  await db.query(
    `INSERT INTO cat_cake_ce_look (flavor_id, selected_look)
     VALUES ($1, $2)
     ON CONFLICT (flavor_id) DO UPDATE SET selected_look = EXCLUDED.selected_look`,
    [flavorId, look],
  );
}

export async function getCatCakeCollection(
  db: Queryable,
): Promise<CatCakeCollectionView> {
  const pity = await getPity(db);
  const owned = await db.query<{
    flavor_id: string;
    edition: CatCakeEdition;
    copies: number;
  }>(`SELECT flavor_id, edition, copies FROM cat_cake_owned`);
  const looks = await db.query<{ flavor_id: string; selected_look: CatCakeLook }>(
    `SELECT flavor_id, selected_look FROM cat_cake_ce_look`,
  );

  const ownedMap = new Map<string, number>();
  for (const row of owned.rows) {
    if (!isCatCakeFlavorId(row.flavor_id)) continue;
    ownedMap.set(`${row.flavor_id}:${row.edition}`, row.copies);
  }
  const lookMap = new Map<string, CatCakeLook>();
  for (const row of looks.rows) {
    if (!isCatCakeFlavorId(row.flavor_id)) continue;
    lookMap.set(row.flavor_id, row.selected_look);
  }

  const variants: CatCakeVariantView[] = [];
  for (const flavorId of CAT_CAKE_FLAVOR_IDS) {
    for (const edition of ["classic", "collector"] as const) {
      const copies = ownedMap.get(`${flavorId}:${edition}`) ?? 0;
      const isCollector = edition === "collector";
      const unlocked = isCollector ? nightUnlocked(copies) : false;
      variants.push({
        flavorId,
        edition,
        copies,
        friendshipLevel: friendshipLevel(copies),
        refundable: refundableCount(copies),
        nightUnlocked: isCollector ? unlocked : null,
        selectedLook: isCollector
          ? unlocked
            ? (lookMap.get(flavorId) ?? "day")
            : "day"
          : null,
      });
    }
  }

  return { pity, variants };
}
