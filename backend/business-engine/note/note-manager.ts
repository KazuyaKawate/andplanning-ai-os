
import type { Note, NotePlan, NoteDraft, NoteReview } from './note-types.ts';
import { NoteApi } from './note-api.ts';

export class NoteManager {
  private noteApi: NoteApi;
  private notes: Map<string, Note> = new Map();

  constructor() {
    this.noteApi = new NoteApi();
  }

  async startPlanning(topic: string): Promise<NotePlan> {
    return this.noteApi.createPlan(topic);
  }

  async generateDraft(plan: NotePlan): Promise<NoteDraft> {
    const draft = await this.noteApi.writeDraft(plan);
    // In a real implementation, we would save the draft state
    return draft;
  }

  async reviewDraft(draft: NoteDraft): Promise<NoteReview> {
    return this.noteApi.reviewDraft(draft);
  }

  async publish(draft: NoteDraft): Promise<Note> {
    const publishedNote = await this.noteApi.publishNote(draft);
    this.notes.set(publishedNote.id, publishedNote);
    return publishedNote;
  }

  getNote(id: string): Note | undefined {
    return this.notes.get(id);
  }
}
