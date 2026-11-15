// Wording contract of command states, in every language: "sent"/"stored", never "applied"/"confirmed" as a fact.
import { describe, expect, it } from 'vitest';
import ptBR from '../i18n/messages/area/pt-BR';
import en from '../i18n/messages/area/en';
import es from '../i18n/messages/area/es';
import fr from '../i18n/messages/area/fr';
import de from '../i18n/messages/area/de';
import { COMMAND_STATES, type DeviceCommand } from './device';
import { commandText } from './SensorDetail';

const CATALOGS = { 'pt-BR': ptBR, en, es, fr, de } as Record<string, { command?: Record<string, string> }>;
/** Words that would state the setting took effect on the stake. */
const APPLIED = /\b(aplicad[oa]s?|applied|aplicad[oa]|appliquée?s?|angewendet|übernommen|in effect|em vigor|en vigor|en vigueur|wirksam)\b/i;
/** A confirmation may only be mentioned to deny it. */
const CONFIRM = /confirm|bestätig/i, DENIAL = /\b(não|not|sin|sans|keine?|no)\b/i;
const SENT: Record<string, RegExp> = { 'pt-BR': /^Enviado /, en: /^Sent /, es: /^Enviado /, fr: /^Envoyé /, de: /^Gesendet / };

describe.each(Object.keys(CATALOGS))('command wording in %s', (lang) => {
  const c = CATALOGS[lang].command!;
  it('has a message for every state and no state reads as applied', () => {
    for (const state of [...COMMAND_STATES, 'savedDemo', 'note']) {
      expect(c[state], `${lang}.${state}`).toBeTruthy();
      expect(c[state]).not.toMatch(APPLIED);
      if (CONFIRM.test(c[state])) expect(c[state], `${lang}.${state} mentions confirmation without denying it`).toMatch(DENIAL);
    }
  });
  it('"awaiting_device" starts with "sent" and the demonstration state says nothing was sent', () => {
    expect(c.awaiting_device).toMatch(SENT[lang]);
    expect(c.savedDemo).toMatch(/nada foi enviado|nothing was sent|no se envió nada|rien n’a été envoyé|nichts an den Messstab gesendet/);
  });
});

describe('which message a command shows', () => {
  const cmd = (over: Partial<DeviceCommand>): DeviceCommand => ({ id: 'c', deviceId: 'c4000110', revision: 1, config: { led: null, intervalMin: 30 }, state: 'saved', createdAt: 't', updatedAt: 't', transport: 'backend', ...over });
  it('a demonstration intent is never shown as sent', () => {
    expect(commandText(cmd({ transport: 'none', state: 'saved' }))).toBe('area.command.savedDemo');
    expect(commandText(cmd({ transport: 'none', state: 'superseded' }))).toBe('area.command.superseded');
  });
  it('a backend intent maps one to one to its state, and no state is "confirmed"', () => {
    for (const state of COMMAND_STATES) expect(commandText(cmd({ state }))).toBe(`area.command.${state}`);
    expect(COMMAND_STATES as readonly string[]).not.toContain('confirmed');
    expect(COMMAND_STATES as readonly string[]).not.toContain('applied');
  });
});
