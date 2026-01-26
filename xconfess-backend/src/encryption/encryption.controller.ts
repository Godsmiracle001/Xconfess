import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { CreateEncryptionDto } from './dto/create-encryption.dto';
import { UpdateEncryptionDto } from './dto/update-encryption.dto';

@Controller('encryption')
export class EncryptionController {
  constructor(private readonly encryptionService: EncryptionService) {}

  @Post()
  create(@Body() createEncryptionDto: CreateEncryptionDto) {
    return this.encryptionService.create(createEncryptionDto);
  }

  @Get()
  findAll() {
    return this.encryptionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.encryptionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEncryptionDto: UpdateEncryptionDto) {
    return this.encryptionService.update(+id, updateEncryptionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.encryptionService.remove(+id);
  }
}
