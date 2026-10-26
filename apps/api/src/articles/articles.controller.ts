import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdPipe } from '../common/id-param';
import { ArticleQueryDto, CreateArticleDto, UpdateArticleDto } from './articles.dto';
import { ArticleView } from './articles.mapper';
import { ArticlesService } from './articles.service';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  /** Catalogue articles avec statut d'alerte calculé (CRITIQUE / LIMITE / CONFORME) */
  @Get()
  findAll(@Query() query: ArticleQueryDto): Promise<ArticleView[]> {
    return this.articles.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', IdPipe) id: number): Promise<ArticleView> {
    return this.articles.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateArticleDto): Promise<ArticleView> {
    return this.articles.create(dto);
  }

  @Patch(':id')
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateArticleDto): Promise<ArticleView> {
    return this.articles.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', IdPipe) id: number): Promise<void> {
    return this.articles.remove(id);
  }
}
