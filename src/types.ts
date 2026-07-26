export type ElementType =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition'
  | 'shot';

export interface ScriptBlock {
  id: string;
  type: ElementType;
  text: string;
}

export interface TitlePageInfo {
  title: string;
  author: string;
  contact: string;
}

export interface Comment {
  id: string;
  blockId: string;
  text: string;
  createdAt: number;
  resolved: boolean;
}

export interface ScriptDocument {
  titlePage: TitlePageInfo;
  blocks: ScriptBlock[];
  comments: Comment[];
}

export interface ExportedTab {
  name: string;
  titlePage: TitlePageInfo;
  blocks: ScriptBlock[];
  comments: Comment[];
}

// The interchange format for sharing a whole project as a file. Deliberately
// excludes undo history (past/future) and ids — those are per-machine, not
// meaningful to hand to a collaborator.
export interface ExportedProjectFile {
  formatVersion: 1;
  name: string;
  tabs: ExportedTab[];
}

export const ELEMENT_LABELS: Record<ElementType, string> = {
  scene_heading: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  parenthetical: 'Parenthetical',
  dialogue: 'Dialogue',
  transition: 'Transition',
  shot: 'Shot',
};

export const ELEMENT_ORDER: ElementType[] = [
  'scene_heading',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
  'shot',
];
