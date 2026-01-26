import { PartialType } from '@nestjs/mapped-types';
import { CreateEncryptionDto } from './create-encryption.dto';

export class UpdateEncryptionDto extends PartialType(CreateEncryptionDto) {}
