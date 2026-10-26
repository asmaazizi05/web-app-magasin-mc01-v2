import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdPipe } from '../common/id-param';
import { CreateProfileDto, UpdateProfileDto } from './profiles.dto';
import { ProfilesService, ProfileView } from './profiles.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  /** Personnes du sélecteur de profil et rubriques qui leur sont masquées */
  @Get()
  findAll(): Promise<ProfileView[]> {
    return this.profiles.findAll();
  }

  @Post()
  create(@Body() dto: CreateProfileDto): Promise<ProfileView> {
    return this.profiles.create(dto);
  }

  @Patch(':id')
  update(@Param('id', IdPipe) id: number, @Body() dto: UpdateProfileDto): Promise<ProfileView> {
    return this.profiles.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', IdPipe) id: number): Promise<void> {
    return this.profiles.remove(id);
  }
}
