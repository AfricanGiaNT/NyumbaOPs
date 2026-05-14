import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { WorkQueryDto } from './dto/work-query.dto';
import { WorksService } from './works.service';

@ApiTags('works')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('works')
export class WorksController {
  constructor(private readonly worksService: WorksService) {}

  @Post()
  create(
    @Body() dto: CreateWorkDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.worksService.create(dto, userId);
  }

  @Get()
  findAll(@Query() query: WorkQueryDto) {
    return this.worksService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.worksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.worksService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.worksService.remove(id, userId);
  }
}
