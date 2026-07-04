
import { NoteService } from './note-service.ts';

async function runTest() {
  console.log('--- Starting Note Factory Test ---');
  const noteService = new NoteService();
  const topic = 'The Future of AI in Content Creation';

  try {
    const note = await noteService.createNoteFromTopic(topic);
    console.log('--- Note Generation Successful ---');
    console.log('Final Note:', JSON.stringify(note, null, 2));

    // Verify the note is retrievable
    const retrievedNote = noteService.getNote(note.id);
    if (retrievedNote) {
      console.log('--- Note Retrieval Successful ---');
    } else {
      console.error('--- Note Retrieval Failed ---');
    }

  } catch (error) {
    console.error('--- Note Generation Failed ---');
    console.error(error);
  }
}

runTest();
