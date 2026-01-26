import { validateConfessionForm, getCharacterCountWarning } from "../validation";

describe("validation", () => {
  describe("validateConfessionForm", () => {
    it("should validate a valid confession", () => {
      const errors = validateConfessionForm({
        title: "Test Title",
        body: "This is a valid confession with enough characters.",
        gender: undefined,
      });
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it("should reject confession with less than 10 characters", () => {
      const errors = validateConfessionForm({
        body: "Short",
      });
      expect(errors.body).toBeDefined();
    });

    it("should reject title exceeding 200 characters", () => {
      const longTitle = "a".repeat(201);
      const errors = validateConfessionForm({
        title: longTitle,
        body: "Valid confession body with enough characters.",
      });
      expect(errors.title).toBeDefined();
    });

    it("should reject body exceeding 5000 characters", () => {
      const longBody = "a".repeat(5001);
      const errors = validateConfessionForm({
        body: longBody,
      });
      expect(errors.body).toBeDefined();
    });
  });

  describe("getCharacterCountWarning", () => {
    it("should return 'none' for low usage", () => {
      expect(getCharacterCountWarning(50, 100)).toBe("none");
    });

    it("should return 'warning' for 90% usage", () => {
      expect(getCharacterCountWarning(90, 100)).toBe("warning");
    });

    it("should return 'error' for 100% usage", () => {
      expect(getCharacterCountWarning(100, 100)).toBe("error");
    });

    it("should return 'error' for over limit", () => {
      expect(getCharacterCountWarning(101, 100)).toBe("error");
    });
  });
});
