
import { NoteManager } from './note-manager.ts';
import type { Note, NotePlan, NoteDraft, NoteReview } from './note-types.ts';

export class NoteService {
  private noteManager: NoteManager;

  constructor() {
    this.noteManager = new NoteManager();
  }

  async createNoteFromTopic(topic: string): Promise<Note> {
    // This is a simplified workflow for MVP
    console.log(`Starting note generation workflow for topic: ${topic}`);

    // 1. Planning
    const plan = await this.noteManager.startPlanning(topic);
    console.log('Plan created:', plan);

    // 2. Writing
    const draft = await this.noteManager.generateDraft(plan);
    console.log('Draft generated:', draft);

    // 3. Reviewing (Simplified - assuming approval for now)
    const review = await this.noteManager.reviewDraft(draft);
    console.log('Draft reviewed:', review);

    // 4. Publishing
    // In a real scenario, we would handle the approval logic here.
    // For MVP, we'll proceed to publish if it's not explicitly disapproved.
    const publishedNote = await this.noteManager.publish(draft);
    console.log('Note published:', publishedNote);

    return publishedNote;
  }

  getNote(id: string): Note | undefined {
    return this.noteManager.getNote(id);
  }
}
