export type MaterialKind = 'lesson' | 'slides' | 'quiz' | 'practice' | 'flashcards' | 'video';
export type Citation = { sourceId: string; label: string; page?: number; section?: string };
export type Slide = {
  title: string;
  body: string;
  bullets?: string[];
  formula?: string;
  notes?: string;
  image?: { src: string; alt: string; caption?: string };
};
export type Question = {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};
export type Flashcard = { id: string; front: string; back: string };
export type PracticeProblem = { id: string; prompt: string; hint?: string; solution: string };
export type Material = {
  id: string;
  kind: MaterialKind;
  title: string;
  description: string;
  duration: number;
  section: string;
  citations: Citation[];
  content?: string;
  slides?: Slide[];
  questions?: Question[];
  problems?: PracticeProblem[];
  cards?: Flashcard[];
  videoUrl?: string;
  transcript?: string;
};
export type Course = {
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  subject: string;
  color: 'sage' | 'peach' | 'lavender' | 'blue';
  icon: 'calculus' | 'biology' | 'physics' | 'book';
  sourceIds: string[];
  chapters: string;
  createdAt: string;
  updatedAt: string;
  materials: Material[];
};
export type Source = {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'text' | 'document' | 'link';
  size: number;
  createdAt: string;
  url: string;
  text?: string;
};
export type StudyRequest = {
  id: string;
  title: string;
  prompt: string;
  sourceIds: string[];
  formats: MaterialKind[];
  scope: string;
  detail: 'brief' | 'balanced' | 'detailed';
  status: 'pending' | 'completed';
  createdAt: string;
  courseId?: string;
};
export type Workspace = { courses: Course[]; sources: Source[]; requests: StudyRequest[] };
export type Progress = {
  completed: string[];
  quizScores: Record<string, { score: number; total: number }>;
  reviewedCards: Record<string, string[]>;
  activity: Record<string, number>;
  lastMaterialId?: string;
  studyMinutes: number;
};
