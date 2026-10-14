import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import {
  getCatCakeCollection,
  setOwnedCopies,
  setPity,
  setSelectedLook,
} from "./catCakeCollection.js";
import { apiClient } from "./test/apiClient.js";
import { truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

describe.skipIf(!integrationReady)("cat cake collection", () => {
  it("defaults to empty collection, pity 0, Day look", async () => {
    await truncateAll();
    const view = await getCatCakeCollection(pool);
    expect(view.pity).toBe(0);
    expect(view.variants).toHaveLength(24);
    expect(view.variants.every((v) => v.copies === 0)).toBe(true);
    expect(
      view.variants
        .filter((v) => v.edition === "collector")
        .every((v) => v.nightUnlocked === false && v.selectedLook === "day"),
    ).toBe(true);
  });

  it("tracks ownership, Night unlock, refundable, and selected look", async () => {
    await truncateAll();
    await setPity(pool, 7);
    await setOwnedCopies(pool, "strawberry", "classic", 3);
    await setOwnedCopies(pool, "matcha", "collector", 1);
    expect((await getCatCakeCollection(pool)).pity).toBe(7);

    let matcha = (await getCatCakeCollection(pool)).variants.find(
      (v) => v.flavorId === "matcha" && v.edition === "collector",
    );
    expect(matcha?.copies).toBe(1);
    expect(matcha?.nightUnlocked).toBe(false);
    expect(matcha?.friendshipLevel).toBe(0);
    expect(matcha?.refundable).toBe(0);

    await setOwnedCopies(pool, "matcha", "collector", 2);
    matcha = (await getCatCakeCollection(pool)).variants.find(
      (v) => v.flavorId === "matcha" && v.edition === "collector",
    );
    expect(matcha?.nightUnlocked).toBe(true);
    expect(matcha?.selectedLook).toBe("day");

    await setSelectedLook(pool, "matcha", "night");
    matcha = (await getCatCakeCollection(pool)).variants.find(
      (v) => v.flavorId === "matcha" && v.edition === "collector",
    );
    expect(matcha?.selectedLook).toBe("night");

    await setOwnedCopies(pool, "ube", "classic", 6);
    const ube6 = (await getCatCakeCollection(pool)).variants.find(
      (v) => v.flavorId === "ube" && v.edition === "classic",
    );
    expect(ube6?.friendshipLevel).toBe(5);
    expect(ube6?.refundable).toBe(0);

    await setOwnedCopies(pool, "ube", "classic", 8);
    const ube8 = (await getCatCakeCollection(pool)).variants.find(
      (v) => v.flavorId === "ube" && v.edition === "classic",
    );
    expect(ube8?.refundable).toBe(2);

    const strawberry = (await getCatCakeCollection(pool)).variants.find(
      (v) => v.flavorId === "strawberry" && v.edition === "classic",
    );
    expect(strawberry?.friendshipLevel).toBe(2);
    expect(strawberry?.nightUnlocked).toBeNull();
    expect(strawberry?.selectedLook).toBeNull();
  });

  it("GET /api/rewards/collection returns the snapshot", async () => {
    await truncateAll();
    await setOwnedCopies(pool, "lemon", "collector", 2);
    await setSelectedLook(pool, "lemon", "night");
    await setPity(pool, 3);

    const res = await apiClient().get("/api/rewards/collection");
    expect(res.status).toBe(200);
    const body = res.body as Awaited<ReturnType<typeof getCatCakeCollection>>;
    expect(body.pity).toBe(3);
    expect(body.variants).toHaveLength(24);
    const lemon = body.variants.find(
      (v) => v.flavorId === "lemon" && v.edition === "collector",
    );
    expect(lemon?.nightUnlocked).toBe(true);
    expect(lemon?.selectedLook).toBe("night");
  });
});
