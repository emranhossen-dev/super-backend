import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // GET /categories — tree structure (parent + children)
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  // GET /categories/flat — flat list for dropdowns
  @Get('flat')
  findAllFlat() {
    return this.categoriesService.findAllFlat();
  }

  // GET /categories/:id/children — subcategories of a parent
  @Get(':id/children')
  findChildren(@Param('id') id: string) {
    return this.categoriesService.findChildren(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    name: string;
    slug?: string;
    description?: string;
    image?: string;
    parentId?: string | null;
  }) {
    return this.categoriesService.create(body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      slug?: string;
      description?: string;
      image?: string;
      parentId?: string | null;
    },
  ) {
    return this.categoriesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
