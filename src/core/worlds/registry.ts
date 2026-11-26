import { grove } from './grove';
import { lsystem } from './lsystem';
import type { WorldDefinition, WorldId } from './types';

export const WORLDS: Record<WorldId, WorldDefinition> = { grove, lsystem };
export const WORLD_LIST: WorldDefinition[] = [grove, lsystem];
export const getWorld = (id: WorldId): WorldDefinition => WORLDS[id] ?? grove;
