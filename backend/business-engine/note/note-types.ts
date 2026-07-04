
export interface Note {
  id: string;
  title: string;
  content: string;
  status: 'planning' | 'writing' | 'reviewing' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface NotePlan {
  topic: string;
  targetAudience: string;
  keywords: string[];
  outline: string[];
}

export interface NoteDraft {
  noteId: string;
  content: string;
}

export interface NoteReview {
  noteId: string;
  feedback: string;
  approved: boolean;
}
