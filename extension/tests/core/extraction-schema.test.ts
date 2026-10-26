import { describe, expect, it } from 'vitest';
import {
  EXTRACTION_RESPONSE_SCHEMA,
  EXTRACTION_WIRE_SCHEMA,
  parseRawExtraction,
  RawEventSchema,
} from '../../src/core/extraction/schema';
import { MOCK_EXTRACTION } from '../../src/core/extraction/mock-provider';
import { buildSystemPrompt } from '../../src/core/extraction/prompt';

interface SchemaNode {
  type?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
}

const wire = EXTRACTION_WIRE_SCHEMA as SchemaNode;

describe('schema output của model', () => {
  it('nhận fixture hợp lệ', () => {
    const result = parseRawExtraction(JSON.stringify(MOCK_EXTRACTION));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.events).toHaveLength(2);
  });

  it('bỏ rào markdown quanh JSON', () => {
    const result = parseRawExtraction('```json\n{"events": []}\n```');
    expect(result.ok).toBe(true);
  });

  it('bỏ khối <think> nếu model chèn suy luận vào content', () => {
    const result = parseRawExtraction('<think>đang suy luận…\n</think>\n{"events": []}');
    expect(result.ok).toBe(true);
  });

  it('từ chối JSON hỏng', () => {
    const result = parseRawExtraction('Đây là kết quả: {events: []}');
    expect(result.ok).toBe(false);
  });

  it('từ chối khi thiếu trường bắt buộc', () => {
    const result = parseRawExtraction(JSON.stringify({ events: [{ title: 'Thiếu hết' }] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('schema');
  });

  it('từ chối label ngoài enum và confidence ngoài [0,1]', () => {
    const base = MOCK_EXTRACTION.events[0];
    expect(
      parseRawExtraction(JSON.stringify({ events: [{ ...base, label: 'du_lich' }] })).ok,
    ).toBe(false);
    expect(
      parseRawExtraction(JSON.stringify({ events: [{ ...base, confidence: 1.5 }] })).ok,
    ).toBe(false);
  });

  it('từ chối quá 20 sự kiện trong một đoạn', () => {
    const events = Array.from({ length: 21 }, () => MOCK_EXTRACTION.events[0]);
    expect(parseRawExtraction(JSON.stringify({ events })).ok).toBe(false);
  });

  it('JSON Schema gửi kèm response_format khớp RawEventSchema', () => {
    const items = EXTRACTION_RESPONSE_SCHEMA.properties.events.items;
    expect([...items.required].sort()).toEqual(Object.keys(RawEventSchema.shape).sort());
    expect(items.properties).not.toHaveProperty('profileIds');
    expect(RawEventSchema.shape).not.toHaveProperty('profileIds');
  });

  it('bản schema gửi endpoint ngoài bỏ giới hạn sinh chuỗi nhưng giữ cấu trúc', () => {
    expect(JSON.stringify(wire)).not.toMatch(
      /"(maxItems|minItems|maxLength|minLength|minimum|maximum|uniqueItems)"\s*:/,
    );

    const event = wire.properties?.events?.items;
    expect(wire.required).toEqual(['events']);
    expect([...(event?.required ?? [])].sort()).toEqual(Object.keys(RawEventSchema.shape).sort());
    expect(event?.properties?.label).toMatchObject({ type: 'string' });
    expect(event?.properties?.start).toEqual({ type: ['string', 'null'] });
    expect(event?.properties?.confidence).toEqual({ type: 'number' });
  });

  it('system prompt không còn danh sách hồ sơ hay profileIds', () => {
    const system = buildSystemPrompt({
      document: { title: 'Thông báo lớp', sourceUrl: '' },
      now: new Date(2026, 9, 22, 8, 0, 0),
      timezone: 'Asia/Ho_Chi_Minh',
    });
    expect(system).not.toContain('profileIds');
    expect(system).not.toContain('Hồ sơ hợp lệ');
  });
});
