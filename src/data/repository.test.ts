import { describe, expect, it } from "vitest";
import { LocalRepository, migrate, validate } from "./repository";
import { seed } from "./seed";
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}
describe("versioned persistence", () => {
  it("seeds only an absent store and retains edits", () => {
    const memory = new MemoryStorage(),
      repo = new LocalRepository(memory),
      s = repo.load();
    s.missions[0].name = "Changed";
    repo.save(s);
    expect(repo.load().missions[0].name).toBe("Changed");
    expect(repo.load().measurements).toEqual([]);
  });
  it("preserves corrupt storage and refuses to load it", () => {
    const memory = new MemoryStorage();
    memory.setItem("summit.store", "broken");
    expect(() => new LocalRepository(memory).load()).toThrow();
    expect(memory.getItem("summit.store")).toBe("broken");
  });
  it("accepts version 1, refuses unsupported migrations", () => {
    expect(migrate(seed()).version).toBe(1);
    expect(() => migrate({ ...seed(), version: 2 })).toThrow("Unsupported");
    expect(() => migrate({ ...seed(), version: 0 })).toThrow("Unsupported");
  });
  it("round trips export/import and retains a recovery copy", () => {
    const memory = new MemoryStorage(),
      repo = new LocalRepository(memory),
      s = repo.load();
    const backup = repo.export();
    s.missions[0].name = "Later";
    repo.save(s);
    expect(repo.import(backup).missions[0].name).toBe(
      "Operation Winter Summit",
    );
    expect(
      JSON.parse(memory.getItem("summit.store.backup")!).missions[0].name,
    ).toBe("Later");
  });
  it("rejects malformed imports without changing existing data", () => {
    const memory = new MemoryStorage(),
      repo = new LocalRepository(memory);
    repo.load();
    const before = repo.export();
    expect(() => repo.import('{"version":1}')).toThrow();
    expect(repo.export()).toBe(before);
  });
  it("rejects invalid dates, broken references and duplicate IDs", () => {
    const badDate = seed();
    badDate.missions[0].startDate = "2026-02-30";
    expect(() => validate(badDate)).toThrow();
    const badRef = seed();
    badRef.sessions[0].missionId = "missing";
    expect(() => validate(badRef)).toThrow("references");
    const duplicate = seed();
    duplicate.missions.push(duplicate.missions[0]);
    expect(() => validate(duplicate)).toThrow();
  });
  it("does not overwrite data if backup storage is full", () => {
    const memory = new MemoryStorage(),
      repo = new LocalRepository(memory);
    repo.load();
    const before = repo.export();
    memory.setItem = (k: string) => {
      if (k.endsWith("backup")) throw new Error("Quota exceeded");
    };
    expect(() => repo.reset()).toThrow("Quota");
    expect(repo.export()).toBe(before);
  });
});
