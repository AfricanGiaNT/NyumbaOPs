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
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(
    @Body() dto: CreateInventoryItemDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.inventoryService.create(dto, userId);
  }

  @Get()
  findAll(@Query() query: InventoryQueryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.inventoryService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.inventoryService.remove(id, userId);
  }

  @Post(':id/movements')
  recordMovement(
    @Param('id') id: string,
    @Body() dto: CreateStockMovementDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.inventoryService.recordMovement(id, dto, userId);
  }

  @Get(':id/movements')
  getMovements(@Param('id') id: string) {
    return this.inventoryService.getMovements(id);
  }
}
