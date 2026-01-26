export class TagResponseDto {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  confessionCount?: number;

  constructor(partial: Partial<TagResponseDto>) {
    Object.assign(this, partial);
  }
}
