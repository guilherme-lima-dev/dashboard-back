import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  @RequirePermission('transactions:read')
  @ApiOperation({ summary: 'List all transactions with filters' })
  async findAll(@Query() query: QueryTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('transactions:read')
  @ApiOperation({ summary: 'Get transaction by ID with full details' })
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findById(id);
  }
}
