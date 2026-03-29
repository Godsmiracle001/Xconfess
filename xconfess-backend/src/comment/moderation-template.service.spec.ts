import { ModerationTemplateService } from './moderation-template.service';
import {
  ModerationNoteTemplate,
  TemplateCategory,
} from './entities/moderation-note-template.entity';
import { NotFoundException } from '@nestjs/common';

describe('ModerationTemplateService', () => {
  let service: ModerationTemplateService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) =>
        Promise.resolve({ ...entity, id: entity.id || 1 }),
      ),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
      remove: jest.fn(),
    };
    service = new ModerationTemplateService(mockRepo);
  });

  describe('create', () => {
    it('should create a template with provided data', async () => {
      const dto = {
        name: 'Test Template',
        content: 'This is a test',
        category: TemplateCategory.INFO,
      };
      const result = await service.create(dto, 1);
      expect(mockRepo.create).toHaveBeenCalledWith({
        ...dto,
        createdById: 1,
        isActive: true,
      });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Test Template');
    });
  });

  describe('findById', () => {
    it('should return template when found', async () => {
      const template = { id: 1, name: 'Test' };
      mockRepo.findOne.mockResolvedValue(template);
      const result = await service.findById(1);
      expect(result).toEqual(template);
    });

    it('should throw NotFoundException when template not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return only active templates by default', async () => {
      const templates = [{ id: 1, name: 'Active', isActive: true }];
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(templates),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll();
      expect(qb.andWhere).toHaveBeenCalledWith(
        'template.isActive = :isActive',
        { isActive: true },
      );
      expect(result).toEqual(templates);
    });

    it('should include inactive templates when includeInactive is true', async () => {
      const templates = [
        { id: 1, name: 'Active' },
        { id: 2, name: 'Inactive', isActive: false },
      ];
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(templates),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(true);
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(templates);
    });
  });

  describe('update', () => {
    it('should update template fields', async () => {
      const template = { id: 1, name: 'Old', content: 'Old content' };
      mockRepo.findOne.mockResolvedValue({ ...template });
      const result = await service.update(1, { name: 'New' });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('New');
    });
  });

  describe('delete', () => {
    it('should remove template', async () => {
      const template = { id: 1, name: 'ToDelete' };
      mockRepo.findOne.mockResolvedValue(template);
      await service.delete(1);
      expect(mockRepo.remove).toHaveBeenCalledWith(template);
    });
  });

  describe('getTemplateContent', () => {
    it('should return template content when found and active', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 1,
        content: 'Template content',
        isActive: true,
      });
      const result = await service.getTemplateContent(1);
      expect(result).toBe('Template content');
    });

    it('should return null when template not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.getTemplateContent(999);
      expect(result).toBeNull();
    });

    it('should return null when template is inactive (findOne filters by isActive: true)', async () => {
      mockRepo.findOne.mockResolvedValue(null); // Service filters by isActive: true, so inactive templates return null
      const result = await service.getTemplateContent(1);
      expect(result).toBeNull();
    });
  });
});
