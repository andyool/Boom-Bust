import { describe, expect, it } from 'vitest';
import { newTable } from '../../engine/testkit';
import { recordCsv } from './recordCsv';

describe('Record CSV', () => {
  it('has one row per Payday; Level 2 columns blank at Level 1; names are escaped', () => {
    const t = newTable(1);
    t.do({ type: 'edit', edits: [{ target: 'player', playerId: 'p1', field: 'name', value: 'Mia, "the boss"' }] });
    t.fullPayday('N01').nextUntil('p1').fullPayday('N10');
    expect(recordCsv(t.g).trim().split('\n')).toEqual([
      'payday,player,news,economy,prices,wages,interest,out_of_work,treasury,bonds,projects_built',
      '1,"Mia, ""the boss""",N01,GROWTH,,,,0,200,0,0',
      '2,"Mia, ""the boss""",N10,STEADY,,,,0,210,0,0',
    ]);
  });
  it('fills Prices, Wages and Interest at Level 2', () => {
    const t = newTable(2).fullPayday('N17');
    expect(recordCsv(t.g).trim().split('\n')[1]).toBe('1,Mia,N17,STEADY,3,0,HIGH,0,200,0,0');
  });
});
