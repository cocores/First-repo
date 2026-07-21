import type { ScriptBlock } from '../types';

interface SceneNavigatorProps {
  isOpen: boolean;
  blocks: ScriptBlock[];
  currentSceneId: string | null;
  onJump: (id: string) => void;
}

export function SceneNavigator({ isOpen, blocks, currentSceneId, onJump }: SceneNavigatorProps) {
  const scenes = blocks.filter((b) => b.type === 'scene_heading' && b.text.trim().length > 0);

  return (
    <aside className={`scene-nav${isOpen ? ' open' : ''}`} aria-hidden={!isOpen} inert={!isOpen}>
      <div className="scene-nav-header">Scenes</div>
      {scenes.length === 0 ? (
        <p className="scene-nav-empty">No scenes yet — start a line with Scene Heading.</p>
      ) : (
        <ol className="scene-nav-list">
          {scenes.map((scene, i) => (
            <li key={scene.id}>
              <button
                type="button"
                className={scene.id === currentSceneId ? 'active' : ''}
                onClick={() => onJump(scene.id)}
              >
                <span className="scene-nav-num">{i + 1}</span>
                <span className="scene-nav-text">{scene.text}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
