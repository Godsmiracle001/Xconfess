import {
  insertBold,
  insertItalic,
  insertLink,
  insertEmoji,
} from "../markdown";

// Mock textarea element
function createMockTextarea(value: string, selectionStart: number, selectionEnd: number) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.selectionStart = selectionStart;
  textarea.selectionEnd = selectionEnd;
  return textarea;
}

describe("markdown utilities", () => {
  describe("insertBold", () => {
    it("should insert bold markdown around selected text", () => {
      const textarea = createMockTextarea("Hello world", 6, 11);
      insertBold(textarea);
      expect(textarea.value).toBe("Hello **world**");
    });

    it("should insert bold markdown at cursor when no selection", () => {
      const textarea = createMockTextarea("Hello world", 6, 6);
      insertBold(textarea);
      expect(textarea.value).toBe("Hello ****world");
    });
  });

  describe("insertItalic", () => {
    it("should insert italic markdown around selected text", () => {
      const textarea = createMockTextarea("Hello world", 6, 11);
      insertItalic(textarea);
      expect(textarea.value).toBe("Hello *world*");
    });
  });

  describe("insertLink", () => {
    it("should insert link markdown with selected text", () => {
      const textarea = createMockTextarea("Hello world", 6, 11);
      insertLink(textarea);
      expect(textarea.value).toBe("Hello [world](https://)");
    });

    it("should use default text when no selection", () => {
      const textarea = createMockTextarea("Hello world", 6, 6);
      insertLink(textarea);
      expect(textarea.value).toBe("Hello [link text](https://)world");
    });
  });

  describe("insertEmoji", () => {
    it("should insert emoji at cursor position", () => {
      const textarea = createMockTextarea("Hello world", 6, 6);
      insertEmoji(textarea, "😀");
      expect(textarea.value).toBe("Hello 😀world");
    });
  });
});
