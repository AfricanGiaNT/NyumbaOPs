import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { GuestsService } from './guests.service';

@ApiTags('Guests')
@Controller('guests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  @Roles('OWNER', 'STAFF')
  create(@Body() dto: CreateGuestDto, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.guestsService.create(dto, userId);
  }

  @Get()
  @Roles('OWNER', 'STAFF')
  findAll() {
    return this.guestsService.findAll();
  }

  @Get(':id')
  @Roles('OWNER', 'STAFF')
  findOne(@Param('id') id: string) {
    return this.guestsService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'STAFF')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGuestDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.guestsService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles('OWNER', 'STAFF')
  remove(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.guestsService.remove(id, userId);
  }
}
