import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CalendarSyncService } from './calendar-sync.service';
import { CreateCalendarSyncDto } from './dto/create-calendar-sync.dto';
import { UpdateCalendarSyncDto } from './dto/update-calendar-sync.dto';

@ApiTags('Calendar Sync')
@Controller('calendar-syncs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalendarSyncController {
  constructor(private readonly calendarSyncService: CalendarSyncService) {}

  @Post()
  @Roles('OWNER')
  @ApiOperation({ summary: 'Create calendar sync configuration' })
  create(
    @Body() createCalendarSyncDto: CreateCalendarSyncDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.calendarSyncService.create(createCalendarSyncDto, userId);
  }

  @Get()
  @Roles('OWNER', 'STAFF')
  @ApiOperation({ summary: 'Get all calendar sync configurations' })
  findAll() {
    return this.calendarSyncService.findAll();
  }

  @Get('property/:propertyId')
  @Roles('OWNER', 'STAFF')
  @ApiOperation({ summary: 'Get calendar sync by property ID' })
  findByProperty(@Param('propertyId') propertyId: string) {
    return this.calendarSyncService.findByProperty(propertyId);
  }

  @Get(':id')
  @Roles('OWNER', 'STAFF')
  @ApiOperation({ summary: 'Get calendar sync by ID' })
  findOne(@Param('id') id: string) {
    return this.calendarSyncService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update calendar sync configuration' })
  update(
    @Param('id') id: string,
    @Body() updateCalendarSyncDto: UpdateCalendarSyncDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.calendarSyncService.update(id, updateCalendarSyncDto, userId);
  }

  @Delete(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Delete calendar sync configuration' })
  remove(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.calendarSyncService.remove(id, userId);
  }

  @Post(':id/sync')
  @Roles('OWNER', 'STAFF')
  @ApiOperation({ summary: 'Trigger manual sync' })
  triggerSync(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.calendarSyncService.triggerSync(id, userId);
  }

  @Get(':id/test')
  @Roles('OWNER', 'STAFF')
  @ApiOperation({ summary: 'Test iCal URL connection' })
  testConnection(@Param('id') id: string) {
    return this.calendarSyncService.testConnection(id);
  }

  @Get(':id/logs')
  @Roles('OWNER', 'STAFF')
  @ApiOperation({ summary: 'Get sync history logs' })
  getSyncLogs(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.calendarSyncService.getSyncLogs(id, limitNum);
  }
}
