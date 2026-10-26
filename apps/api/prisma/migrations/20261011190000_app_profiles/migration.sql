-- CreateTable
CREATE TABLE "AppProfile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "hiddenRoutes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppProfile_pkey" PRIMARY KEY ("id")
);

-- Profils d'origine (auparavant figés dans l'interface)
INSERT INTO "AppProfile" ("name", "role", "admin", "hiddenRoutes") VALUES
  ('EL ATYQY mohamed raid', 'Responsable Magasin / Propriétaire', true, ARRAY[]::TEXT[]),
  ('yassine AZIZI', 'Responsable Magasin / Propriétaire', true, ARRAY[]::TEXT[]),
  ('soufiane BOUHZAM', 'Approvisionneur Mécanique', false, ARRAY['/parametres', '/shifts']),
  ('Omar BENALLA', 'Approvisionneur Électrique', false, ARRAY['/parametres', '/shifts']),
  ('Ghizlan', 'Préparatrice', false, ARRAY['/parametres', '/receptions']);
