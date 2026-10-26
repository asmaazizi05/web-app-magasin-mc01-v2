import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto, UpdateProfileDto } from './profiles.dto';

export type ProfileView = Pick<AppProfile, 'id' | 'name' | 'role' | 'phone' | 'email' | 'admin' | 'hiddenRoutes' | 'readOnlyRoutes'>;

const toView = ({ id, name, role, phone, email, admin, hiddenRoutes, readOnlyRoutes }: AppProfile): ProfileView => ({ id, name, role, phone, email, admin, hiddenRoutes, readOnlyRoutes });

/** Droits enregistrés : un administrateur voit et modifie tout ; une rubrique masquée n'est pas aussi « consultation seule » */
function rights(admin: boolean, hidden: string[], readOnly: string[]): { hiddenRoutes: string[]; readOnlyRoutes: string[] } {
  if (admin) return { hiddenRoutes: [], readOnlyRoutes: [] };
  return { hiddenRoutes: hidden, readOnlyRoutes: readOnly.filter((r) => !hidden.includes(r)) };
}

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ProfileView[]> {
    return (await this.prisma.appProfile.findMany({ orderBy: { id: 'asc' } })).map(toView);
  }

  async create(dto: CreateProfileDto): Promise<ProfileView> {
    const admin = dto.admin ?? false;
    return toView(
      await this.prisma.appProfile.create({
        data: { name: dto.name.trim(), role: dto.role.trim(), phone: dto.phone?.trim() || null, email: dto.email?.trim() || null, admin, ...rights(admin, dto.hiddenRoutes ?? [], dto.readOnlyRoutes ?? []) },
      }),
    );
  }

  async update(id: number, dto: UpdateProfileDto): Promise<ProfileView> {
    const current = await this.find(id);
    const admin = dto.admin ?? current.admin;
    if (current.admin && !admin) await this.keepOneAdmin(id);
    return toView(
      await this.prisma.appProfile.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          role: dto.role?.trim(),
          phone: dto.phone === undefined ? undefined : dto.phone?.trim() || null,
          email: dto.email === undefined ? undefined : dto.email?.trim() || null,
          admin,
          ...rights(admin, dto.hiddenRoutes ?? current.hiddenRoutes, dto.readOnlyRoutes ?? current.readOnlyRoutes),
        },
      }),
    );
  }

  async remove(id: number): Promise<void> {
    const current = await this.find(id);
    if (current.admin) await this.keepOneAdmin(id);
    await this.prisma.appProfile.delete({ where: { id } });
  }

  private async find(id: number): Promise<AppProfile> {
    const profile = await this.prisma.appProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException(`Profil ${id} introuvable.`);
    return profile;
  }

  /** Il doit toujours rester un administrateur, sinon plus personne n'accède aux paramètres */
  private async keepOneAdmin(exceptId: number): Promise<void> {
    const others = await this.prisma.appProfile.count({ where: { admin: true, id: { not: exceptId } } });
    if (others === 0) throw new BadRequestException('Il doit rester au moins un administrateur.');
  }
}
