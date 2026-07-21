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

export interface ScriptDocument {
  titlePage: TitlePageInfo;
  blocks: ScriptBlock[];
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
