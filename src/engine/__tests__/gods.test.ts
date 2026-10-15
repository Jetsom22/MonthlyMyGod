// 영원·욕망·무위 고유 규칙 테스트
import { describe, expect, it } from 'vitest';
import { applyAction, createMatch, effLife, effRaid, effectiveCost, mood, wardCount } from '../rules';
import type { GameAction, GameState, Seat, Unit, Zone } from '../types';

const ETN = 'ETN-G-001';
const DSR = 'DSR-G-001';
const VOI = 'VOI-G-001';
const PAT = 'PAT-G-001';
const WCH = 'WCH-G-001';

function blank(g0: string, g1: string): GameState {
  const s = createMatch({ gods: [g0, g1], ai: [false, false], seed: 3, first: 0 });
  for (const p of s.players) {
    p.hand = [];
    p.day = [];
    p.sanct = [];
    p.graveyard = [];
    p.op = 0;
  }
  s.players[0].faith = 9;
  return s;
}

function put(s: GameState, seat: Seat, cardId: string, zone: Zone): Unit {
  const u: Unit = {
    uid: s.nextUid++,
    cardId,
    owner: seat,
    zone,
    dmg: 0,
    enteredTurn: -1,
    moved: false,
    raided: false,
    doomed: false,
    temp: { offering: 0, raid: 0, life: 0 },
    perm: { offering: 0, raid: 0, life: 0 },
    granted: [],
  };
  (zone === 'day' ? s.players[seat].day : s.players[seat].sanct).push(u);
  return u;
}

const ok = (s: GameState, a: GameAction) => {
  const r = applyAction(s, a);
  expect(r.error).toBeUndefined();
  return r.state;
};

describe('영원 — 병실 무덤', () => {
  it('삼종 유품이 안치되면 《영원의 순간》으로 단계를 통째로 뛴다', () => {
    let s = blank(ETN, PAT);
    s.players[0].hand = ['ETN-R-001'];
    expect(applyAction(s, { type: 'playCard', handIndex: 0 }).error).toContain('유품');
    s.players[0].graveyard = ['ETN-U-001', 'ETN-U-002', 'ETN-U-003'];
    s = ok(s, { type: 'playCard', handIndex: 0 });
    expect(s.players[0].op).toBe(12);
    s = ok(s, { type: 'endTurn' });
    expect(s.players[0].stage).toBe(1);
    expect(s.players[0].graveyard).toEqual(expect.arrayContaining(['ETN-U-001', 'ETN-U-002', 'ETN-U-003']));
  });

  it('《영원의 제단》 — 봉헌은 OP가 안 되고, 유품 안치 시 영원의 순간이 공짜', () => {
    let s = blank(ETN, PAT);
    s.players[0].shrines = [{ cardId: 'ETN-S-001', slot: 'special' }];
    put(s, 0, 'ETN-U-007', 'day'); // 봉헌 2
    expect(effectiveCost(s, 0, 'ETN-R-001')).toBe(3);
    s.players[0].graveyard = ['ETN-U-001', 'ETN-U-002', 'ETN-U-003'];
    expect(effectiveCost(s, 0, 'ETN-R-001')).toBe(0);
    s = ok(s, { type: 'endTurn' });
    expect(s.players[0].op).toBe(0);
  });

  it('조짐 권능 — 병실에서 일그러진 채(목숨 1) 되살린다, 그 카드는 병실을 떠난다', () => {
    let s = blank(ETN, PAT);
    s.players[0].stage = 1;
    s.players[0].graveyard = ['ETN-U-007'];
    s = ok(s, { type: 'power', target: { kind: 'ward', index: 0 } });
    const u = s.players[0].day[0];
    expect(u.cardId).toBe('ETN-U-007');
    expect(effLife(s, u)).toBe(1);
    expect(u.twisted).toBe(true);
    expect(s.players[0].graveyard).toHaveLength(0);
  });

  it('《병실》 성지 — 내 신도가 죽으면 병실이 2장 늘어난다', () => {
    let s = blank(ETN, PAT);
    s.players[0].shrines = [{ cardId: 'ETN-S-002', slot: 'sanct' }];
    const u = put(s, 0, 'ETN-U-006', 'day');
    s.players[0].hand = ['ETN-R-002']; // 유품 정리
    s = ok(s, { type: 'playCard', handIndex: 0, target: { kind: 'unit', uid: u.uid } });
    // 죽은 신도 1 + 병실 성지 덤 1 + 쓴 의식 1
    expect(wardCount(s.players[0])).toBe(3);
  });

  it('병실 참조 — 《오래된 인형들》 습격력 = 병실 5장당 +1', () => {
    const s = blank(ETN, PAT);
    const u = put(s, 0, 'ETN-U-009', 'sanct'); // 기본 습격력 0
    expect(effRaid(s, u)).toBe(0);
    s.players[0].graveyard = Array(10).fill('ETN-U-006');
    expect(effRaid(s, u)).toBe(2); // 병실 10장 → +2
  });
});

describe('욕망 — 의존 대상', () => {
  it('상대 신도를 의존 대상으로 — 그가 봉헌하면 나도 OP (조짐 +1)', () => {
    let s = blank(DSR, PAT);
    s.players[0].stage = 1;
    const enemy = put(s, 1, 'PAT-U-003', 'day'); // 봉헌 2
    s = ok(s, { type: 'power', target: { kind: 'unit', uid: enemy.uid } });
    expect(s.players[0].dependent).toBe(enemy.uid);
    expect(mood(s, s.players[0])).toBe('방긋');
    s = ok(s, { type: 'endTurn' }); // 내 턴 끝
    const before = s.players[0].op;
    s = ok(s, { type: 'endTurn' }); // 상대 턴 끝 — 상대가 봉헌
    expect(s.players[0].op).toBe(before + 1);
  });

  it('이별 — 의존 대상이 죽으면 오열, 《알림 설정》 OP +2', () => {
    let s = blank(DSR, WCH);
    s.players[0].shrines = [{ cardId: 'DSR-S-002', slot: 'sanct' }];
    const mine = put(s, 0, 'DSR-U-001', 'sanct');
    const atk = put(s, 1, 'WCH-U-004', 'sanct');
    s.players[0].dependent = mine.uid;
    s = ok(s, { type: 'endTurn' });
    s = ok(s, { type: 'toAction' });
    s = ok(s, { type: 'raid', uid: atk.uid, target: { kind: 'unit', uid: mine.uid } });
    expect(s.players[0].dependent).toBeNull();
    expect(mood(s, s.players[0])).toBe('오열');
    expect(s.players[0].op).toBe(2);
  });

  it('《애인 납치》 — 상대 일상 신도를 빼앗아 의존 대상으로', () => {
    let s = blank(DSR, PAT);
    const victim = put(s, 1, 'PAT-U-003', 'day');
    s.players[0].hand = ['DSR-R-004'];
    s = ok(s, { type: 'playCard', handIndex: 0, target: { kind: 'unit', uid: victim.uid } });
    expect(s.players[1].day).toHaveLength(0);
    expect(s.players[0].day[0].uid).toBe(victim.uid);
    expect(s.players[0].day[0].owner).toBe(0);
    expect(s.players[0].dependent).toBe(victim.uid);
  });

  it('얼굴 연동 — 《답장 기다리는 아이》는 「울먹」일 때 습격력 +2', () => {
    const s = blank(DSR, PAT);
    const fan = put(s, 0, 'DSR-U-004', 'sanct');
    const dep = put(s, 0, 'DSR-U-001', 'day');
    s.players[0].dependent = dep.uid;
    expect(mood(s, s.players[0])).toBe('방긋');
    dep.dmg = 1;
    expect(mood(s, s.players[0])).toBe('울먹');
    s.phase = 'action';
    // 습격력 1 + 2
    expect(applyAction(s, { type: 'raid', uid: fan.uid, target: { kind: 'track' } }).state.players[1].op).toBe(0);
  });
});

describe('무위 — 가장 조용한 혼돈', () => {
  it('잠복 — 트랙 직격으로 깎이는 OP -1', () => {
    let s = blank(PAT, VOI);
    const atk = put(s, 0, 'PAT-U-007', 'sanct'); // 습격 3
    s.players[1].op = 5;
    s.phase = 'action';
    s = ok(s, { type: 'raid', uid: atk.uid, target: { kind: 'track' } });
    expect(s.players[1].op).toBe(3);
  });

  it('조짐 — 상대가 카드를 낼 때마다 OP +1, 턴당 1회', () => {
    let s = blank(PAT, VOI);
    s.players[1].stage = 1;
    s.players[0].hand = ['NEU-R-003', 'NEU-R-003'];
    s = ok(s, { type: 'playCard', handIndex: 0 });
    s = ok(s, { type: 'playCard', handIndex: 0 });
    expect(s.players[1].op).toBe(1);
  });

  it('현현 — 상대가 봉헌으로 얻는 OP -2', () => {
    let s = blank(PAT, VOI);
    s.players[1].stage = 2;
    put(s, 0, 'PAT-U-003', 'day'); // 봉헌 2
    put(s, 0, 'PAT-U-001', 'day'); // 봉헌 1
    s = ok(s, { type: 'endTurn' });
    expect(s.players[0].op).toBe(1); // 3 - 2
  });

  it('《아무것도 안 하기》 — OP +1, 이번 턴 더는 못 낸다', () => {
    let s = blank(VOI, PAT);
    s.players[0].hand = ['VOI-R-005', 'VOI-U-001'];
    s = ok(s, { type: 'playCard', handIndex: 0 });
    expect(s.players[0].op).toBe(1);
    expect(applyAction(s, { type: 'playCard', handIndex: 0 }).error).toContain('아무것도');
  });
});
