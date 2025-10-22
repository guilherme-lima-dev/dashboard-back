import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @RequirePermission('customers:read')
  @ApiOperation({ summary: 'List all customers with pagination' })
  async findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('customers:read')
  @ApiOperation({ summary: 'Get customer by ID with subscriptions and transactions' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findById(id);
  }
}