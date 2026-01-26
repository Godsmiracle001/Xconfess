export class ConfessionResponseDto {
  id: string;
  title?: string; // Optional since entity doesn't have this field
  body: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ConfessionResponseDto>) {
    Object.assign(this, partial);
  }
}
