// 第一章 · 金蝉出关（难 1～9）的固定顺序与赶路分支模板
export type StepTemplate =
  | { kind: 'guanyin' }
  | { kind: 'ordeal'; ordeal: number; event: string; label: string; icon: string }
  | { kind: 'road'; types: ('fight' | 'event' | 'shop' | 'rest')[]; fights?: string[] }
  | { kind: 'end' };

export const CHAPTER1 = {
  id: 1,
  name: '第一章 · 金蝉出关',
  steps: [
    { kind: 'guanyin' },
    { kind: 'ordeal', ordeal: 1, event: 'n1', label: '金蝉遭贬', icon: '🪷' },
    { kind: 'ordeal', ordeal: 2, event: 'n2', label: '出胎几杀', icon: '👶' },
    { kind: 'ordeal', ordeal: 3, event: 'n3', label: '满月抛江', icon: '🌊' },
    { kind: 'ordeal', ordeal: 4, event: 'n4', label: '寻亲报冤', icon: '⚖️' },
    { kind: 'ordeal', ordeal: 5, event: 'n5', label: '出城逢虎', icon: '🐅' },
    { kind: 'road', types: ['fight', 'event'], fights: ['road_pair'] },
    { kind: 'ordeal', ordeal: 6, event: 'n6', label: '折从落坑', icon: '🕳️' },
    { kind: 'ordeal', ordeal: 7, event: 'n7', label: '双叉岭上', icon: '🏹' },
    { kind: 'road', types: ['fight', 'event'], fights: ['road_dao', 'road_dun'] },
    { kind: 'road', types: ['shop'] },
    { kind: 'ordeal', ordeal: 8, event: 'n8', label: '两界山头', icon: '⛰️' },
    { kind: 'road', types: ['fight', 'event'], fights: ['road_pair', 'road_dao'] },
    { kind: 'road', types: ['rest'] },
    { kind: 'ordeal', ordeal: 9, event: 'n9', label: '陡涧换马', icon: '🐲' },
    { kind: 'end' },
  ] as StepTemplate[],
};
