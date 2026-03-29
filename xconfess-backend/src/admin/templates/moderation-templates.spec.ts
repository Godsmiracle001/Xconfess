import { MODERATION_TEMPLATES, getTemplate } from './moderation-templates';

describe('moderation-templates', () => {
  it('exposes templates', () => {
    expect(MODERATION_TEMPLATES.report_resolved.length).toBeGreaterThan(0);
  });

  it('getTemplate returns a template or null', () => {
    expect(getTemplate('report_resolved', 0)).toBeTruthy();
    expect(getTemplate('nonexistent', 0)).toBeNull();
  });
});
