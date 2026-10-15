import { describe, expect, it } from 'vitest';
import { applyAction, createMatch, ghostCount, raidTargets } from '../rules';
import type { GameState, Seat, Unit, Zone } from '../types';

const PAT = 'PAT-G-001';
const WCH = 'WCH-G-001';

/** 빈 판에서 시작하는 테스트용 대전: seat 0 차례, 준비 페이즈 */
function blank(g0 = PAT, g1 = WCH): GameState {
  const s = createMatch({ gods: [g0, g1], ai: [false, false], seed: 7, first: 0 });
  for (const p of s.players) {
    p.hand = [];
    p.day = [];
    p.sanct = [];
    p.op = 0;
  }
  s.players[0].faith = 9;
  return s;
}

function put(s: GameState, seat: Seat, cardId: string, zone: Zone, opts: Partial<Unit> = {}): Unit {
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
    ...opts,
  };
  (zone === 'day' ? s.players[seat].day : s.players[seat].sanct).push(u);
  return u;
}

const ok = (s: GameState, a: Parameters<typeof applyAction>[1]) => {
  const r = applyAction(s, a);
  expect(r.error).toBeUndefined();
  return r.state;
};

describe('배치 규칙', () => {
  it('이번 턴에 낸 신도는 성역에 못 간다', () => {
    let s = blank();
    s.players[0].hand = ['PAT-U-001'];
    s = ok(s, { type: 'playCard', handIndex: 0 });
    const u = s.players[0].day[0];
    expect(applyAction(s, { type: 'move', uid: u.uid }).error).toContain('성역');
  });

  it('한 턴에 한 번만 앉는다', () => {
    let s = blank();
    const u = put(s, 0, 'PAT-U-004', 'day');
    s = ok(s, { type: 'move', uid: u.uid });
    expect(s.players[0].sanct).toHaveLength(1);
    expect(applyAction(s, { type: 'move', uid: u.uid }).error).toBeDefined();
  });
});

describe('습격', () => {
  it('도발 — 상대 성역에 신도가 있으면 그것만 노릴 수 있다', () => {
    const s = blank();
    const atk = put(s, 0, 'PAT-U-007', 'sanct');
    const wall = put(s, 1, 'WCH-U-005', 'sanct');
    put(s, 1, 'WCH-U-002', 'day');
    s.phase = 'action';
    const t = raidTargets(s, atk.uid);
    expect(t).toEqual([{ kind: 'unit', uid: wall.uid }]);
  });

  it('맞트레이드 — 서로 습격력만큼, 순교자는 죽으며 주인에게 OP +2', () => {
    let s = blank();
    const atk = put(s, 0, 'PAT-U-007', 'sanct'); // 습격 3, 목숨 2
    const wall = put(s, 1, 'WCH-U-005', 'sanct'); // 목숨 3, 습격 0, 사망 시 OP+2
    s.phase = 'action';
    s = ok(s, { type: 'raid', uid: atk.uid, target: { kind: 'unit', uid: wall.uid } });
    expect(s.players[1].sanct).toHaveLength(0);
    expect(s.players[1].op).toBe(2);
    expect(s.players[0].sanct[0].dmg).toBe(0);
  });

  it('처형 — 일상 신도가 죽으면 봉헌력만큼 OP 손실, 유령은 손실 없음', () => {
    let s = blank(WCH, PAT);
    const atk = put(s, 0, 'WCH-U-004', 'sanct'); // 습격 3
    const worker = put(s, 1, 'PAT-U-003', 'day'); // 봉헌 2
    const ghost = put(s, 1, 'PAT-T-001', 'day');
    const atk2 = put(s, 0, 'WCH-U-008', 'sanct');
    s.players[1].op = 5;
    s.phase = 'action';
    s = ok(s, { type: 'raid', uid: atk.uid, target: { kind: 'unit', uid: worker.uid } });
    expect(s.players[1].op).toBe(3);
    s = ok(s, { type: 'raid', uid: atk2.uid, target: { kind: 'unit', uid: ghost.uid } });
    expect(s.players[1].op).toBe(3);
  });

  it('트랙 직격 — 현재 OP만 깎고 하한 0', () => {
    let s = blank();
    const atk = put(s, 0, 'PAT-U-007', 'sanct');
    s.players[1].op = 2;
    s.phase = 'action';
    s = ok(s, { type: 'raid', uid: atk.uid, target: { kind: 'track' } });
    expect(s.players[1].op).toBe(0);
  });
});

describe('죽음의 문법', () => {
  it('인내 — 만년 대리가 죽으면 유령 소환, 유령은 유령을 안 낳는다', () => {
    let s = blank();
    const daeri = put(s, 0, 'PAT-U-002', 'day');
    s.players[0].hand = ['PAT-R-001']; // 명예퇴직
    s = ok(s, { type: 'playCard', handIndex: 0, target: { kind: 'unit', uid: daeri.uid } });
    expect(ghostCount(s.players[0])).toBe(1);
    const ghost = s.players[0].day[0];
    s.players[0].hand = ['PAT-R-001'];
    // 명예퇴직은 유령을 대상으로 못 고른다
    expect(applyAction(s, { type: 'playCard', handIndex: 0, target: { kind: 'unit', uid: ghost.uid } }).error).toBeDefined();
  });

  it('인내 권능(잠복) — 각인 후 죽으면 유령, 잠복 동안 1회', () => {
    let s = blank();
    const u = put(s, 0, 'PAT-U-004', 'day');
    s = ok(s, { type: 'power', target: { kind: 'unit', uid: u.uid } });
    expect(s.players[0].day[0].granted).toHaveLength(1);
    s.players[0].powerUsedThisTurn = false;
    expect(applyAction(s, { type: 'power', target: { kind: 'unit', uid: u.uid } }).error).toContain('1회');
  });

  it('마녀 권능 「검은 제물」 — 성역 신도 희생 → 봉헌력 + 사망 OP', () => {
    let s = blank(WCH, PAT);
    const m = put(s, 0, 'WCH-U-005', 'sanct'); // 봉헌 2, 사망 시 OP +2
    s = ok(s, { type: 'power', target: { kind: 'unit', uid: m.uid } });
    expect(s.players[0].op).toBe(4);
    expect(s.players[0].sanct).toHaveLength(0);
  });

  it('인내 현현 「퇴근은 없다」 — 턴 시작에 유령 수만큼 OP', () => {
    let s = blank();
    s.players[0].stage = 2;
    put(s, 0, 'PAT-T-001', 'day');
    put(s, 0, 'PAT-T-001', 'sanct');
    s = ok(s, { type: 'endTurn' }); // 봉헌 1 정산 → 상대 턴
    const opBefore = s.players[0].op;
    s = ok(s, { type: 'endTurn' }); // 상대 턴 끝 → 내 턴 시작
    expect(s.players[0].op).toBe(opBefore + 2);
  });
});

describe('강림 트랙', () => {
  it('문턱 도달 → 다음 단계, OP 0 초기화, 넘친 OP 버림, 그릇 상승', () => {
    let s = blank();
    s.players[0].op = 11;
    put(s, 0, 'PAT-U-003', 'day'); // 봉헌 2 → 13
    s = ok(s, { type: 'endTurn' });
    expect(s.players[0].stage).toBe(1);
    expect(s.players[0].op).toBe(0);
    s = ok(s, { type: 'endTurn' });
    expect(s.players[0].faith).toBe(6);
  });

  it('최종 문턱 완주 = 승리', () => {
    let s = blank(WCH, PAT);
    s.players[0].stage = 3;
    s.players[0].op = 13;
    put(s, 0, 'WCH-U-001', 'day');
    s = ok(s, { type: 'endTurn' });
    expect(s.winner).toBe(0);
    expect(s.phase).toBe('over');
  });
});
