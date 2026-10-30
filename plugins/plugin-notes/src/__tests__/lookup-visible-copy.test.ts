import { describe, expect, it } from "bun:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NotesService } from "../service.js";
import { NotesStore } from "../store.js";

async function serviceFor(): Promise<NotesService> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "notes-lookup-"));
  let tick = 0;
  const epoch = Date.parse("2026-07-16T12:00:00.000Z");
  const now = () => new Date(epoch + tick++ * 1_000);
  let next = 1;
  const service = new NotesService(undefined, {
    store: new NotesStore({
      filePath: path.join(dir, "notes", "state.json"),
      now,
    }),
    now,
    createId: () => `note-test-${next++}`,
  });
  await service.initialize();
  return service;
}

describe("lookup over identical copies", () => {
  it("resolves to the copy the list shows", async () => {
    const service = await serviceFor();
    // The owner edits the older note until it matches a newer one.
    const typed = await service.createNote({
      title: "Mil",
      body: "",
      color: "yellow",
    });
    const newer = await service.createNote({
      title: "Milk",
      body: "",
      color: "yellow",
    });
    await service.updateNoteWithCommit(
      typed.id,
      { title: "Milk" },
      service.snapshot().revision,
    );

    // The list shows the copy edited last (#38165).
    expect(service.snapshot().notes.map((note) => note.id)).toEqual([typed.id]);

    // A lookup must resolve to the note the owner sees, not the hidden copy.
    expect(service.getNoteByLookup("title", "Milk").id).toBe(typed.id);
    const result = await service.updateNoteByLookupWithCommit(
      "title",
      "Milk",
      { color: "green" },
      service.snapshot().revision,
    );
    expect(result.value.id).toBe(typed.id);
    expect(result.consolidatedIds).toEqual([newer.id]);
    expect(service.getNote(typed.id)).toMatchObject({
      title: "Milk",
      color: "green",
    });
  });
});
