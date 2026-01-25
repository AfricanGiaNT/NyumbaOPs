import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { PublicPropertiesQueryDto } from './dto/public-properties-query.dto';
import { PublicUploadDto } from './dto/public-upload.dto';

@ApiTags('Public')
@Controller('v1/public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('properties')
  findAll(@Query() query: PublicPropertiesQueryDto) {
    return this.publicService.getPublicProperties(query);
  }

  @Get('properties/:id')
  findOne(@Param('id') id: string) {
    return this.publicService.getPublicProperty(id);
  }

  @Post('uploads')
  createUpload(@Body() payload: PublicUploadDto) {
    return this.publicService.createUploadUrl(payload);
  }
}
