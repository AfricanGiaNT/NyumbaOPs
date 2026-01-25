import {
  BookingStatus,
  CategoryType,
  Currency,
  GuestSource,
  PrismaClient,
  PropertyStatus,
  TransactionType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      name: 'Owner',
      role: 'OWNER',
    },
  });

  await prisma.notificationSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const properties = await Promise.all([
    prisma.property.create({
      data: {
        name: 'Area 43 - House A',
        location: 'Lilongwe',
        bedrooms: 3,
        bathrooms: 2,
        maxGuests: 6,
        nightlyRate: 55000,
        currency: Currency.MWK,
        status: PropertyStatus.ACTIVE,
      },
    }),
    prisma.property.create({
      data: {
        name: 'City Center - Flat 2B',
        location: 'Lilongwe',
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        nightlyRate: 45000,
        currency: Currency.MWK,
        status: PropertyStatus.ACTIVE,
      },
    }),
    prisma.property.create({
      data: {
        name: 'Cape Cottage',
        location: 'Cape Maclear',
        bedrooms: 4,
        bathrooms: 3,
        maxGuests: 8,
        nightlyRate: 120,
        currency: Currency.GBP,
        status: PropertyStatus.MAINTENANCE,
      },
    }),
  ]);

  const amenityNames = [
    'WiFi',
    'Parking',
    'Backup Power',
    'Kitchen',
    'Hot Water',
    'Security',
    'Air Conditioning',
  ];

  await prisma.amenity.createMany({
    data: amenityNames.map((name) => ({ name })),
    skipDuplicates: true,
  });

  const amenities = await prisma.amenity.findMany({
    where: { name: { in: amenityNames } },
  });
  const amenitiesByName = new Map(amenities.map((amenity) => [amenity.name, amenity.id]));

  await prisma.propertyAmenity.createMany({
    data: [
      {
        propertyId: properties[0].id,
        amenityId: amenitiesByName.get('WiFi')!,
      },
      {
        propertyId: properties[0].id,
        amenityId: amenitiesByName.get('Parking')!,
      },
      {
        propertyId: properties[0].id,
        amenityId: amenitiesByName.get('Backup Power')!,
      },
      {
        propertyId: properties[0].id,
        amenityId: amenitiesByName.get('Kitchen')!,
      },
      {
        propertyId: properties[1].id,
        amenityId: amenitiesByName.get('WiFi')!,
      },
      {
        propertyId: properties[1].id,
        amenityId: amenitiesByName.get('Hot Water')!,
      },
      {
        propertyId: properties[2].id,
        amenityId: amenitiesByName.get('Security')!,
      },
      {
        propertyId: properties[2].id,
        amenityId: amenitiesByName.get('Air Conditioning')!,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.propertyImage.createMany({
    data: [
      {
        propertyId: properties[0].id,
        url: 'https://images.example.com/area-43-house-a/cover.webp',
        alt: 'Area 43 house A exterior',
        sortOrder: 1,
        isCover: true,
      },
      {
        propertyId: properties[0].id,
        url: 'https://images.example.com/area-43-house-a/living-room.webp',
        alt: 'Area 43 house A living room',
        sortOrder: 2,
      },
      {
        propertyId: properties[1].id,
        url: 'https://images.example.com/city-center-flat-2b/cover.webp',
        alt: 'City Center flat 2B exterior',
        sortOrder: 1,
        isCover: true,
      },
      {
        propertyId: properties[2].id,
        url: 'https://images.example.com/cape-cottage/cover.webp',
        alt: 'Cape Cottage exterior',
        sortOrder: 1,
        isCover: true,
      },
    ],
    skipDuplicates: true,
  });

  const revenueCategories = [
    'Airbnb',
    'Local',
    'MobileMoney',
    'BankTransfer',
    'Cash',
  ];
  const expenseCategories = [
    'Utilities',
    'Repairs',
    'Cleaning',
    'Fuel',
    'Supplies',
    'Security',
    'Commission',
    'Other',
  ];

  const categories = await prisma.$transaction([
    ...revenueCategories.map((name) =>
      prisma.category.create({
        data: {
          name,
          type: CategoryType.REVENUE,
          isSystem: true,
          createdBy: user.id,
        },
      }),
    ),
    ...expenseCategories.map((name) =>
      prisma.category.create({
        data: {
          name,
          type: CategoryType.EXPENSE,
          isSystem: true,
          createdBy: user.id,
        },
      }),
    ),
  ]);

  const [airbnbCategory] = categories.filter((category) => category.type === 'REVENUE');
  const [utilitiesCategory] = categories.filter((category) => category.type === 'EXPENSE');

  const today = new Date();
  const months = [0, 1, 2, 3, 4];

  for (const property of properties) {
    for (const offset of months) {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 15));
      await prisma.transaction.create({
        data: {
          propertyId: property.id,
          type: TransactionType.REVENUE,
          categoryId: airbnbCategory.id,
          amount: property.currency === Currency.MWK ? 120000 + offset * 5000 : 180 + offset * 10,
          currency: property.currency,
          date,
          notes: `Monthly revenue for ${property.name}`,
          createdBy: user.id,
        },
      });

      await prisma.transaction.create({
        data: {
          propertyId: property.id,
          type: TransactionType.EXPENSE,
          categoryId: utilitiesCategory.id,
          amount: property.currency === Currency.MWK ? 20000 + offset * 1000 : 40 + offset * 5,
          currency: property.currency,
          date,
          notes: `Monthly expenses for ${property.name}`,
          createdBy: user.id,
        },
      });
    }
  }

  const guests = await prisma.$transaction([
    prisma.guest.create({
      data: {
        name: 'Chikondi Phiri',
        email: 'chikondi@example.com',
        phone: '+265991000111',
        source: GuestSource.LOCAL,
        notes: 'Prefers early check-in when possible.',
        rating: 4,
        createdBy: user.id,
      },
    }),
    prisma.guest.create({
      data: {
        name: 'Thandiwe Banda',
        email: 'thandiwe@example.com',
        phone: '+265881000222',
        source: GuestSource.AIRBNB,
        notes: 'Repeat guest, stays monthly.',
        rating: 5,
        createdBy: user.id,
      },
    }),
  ]);

  const [guestOne, guestTwo] = guests;

  await prisma.booking.create({
    data: {
      guestId: guestOne.id,
      propertyId: properties[0].id,
      status: BookingStatus.CONFIRMED,
      checkInDate: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 10)),
      checkOutDate: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 15)),
      notes: 'Airport pickup arranged.',
      createdBy: user.id,
    },
  });

  await prisma.booking.create({
    data: {
      guestId: guestTwo.id,
      propertyId: properties[1].id,
      status: BookingStatus.PENDING,
      checkInDate: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 20)),
      checkOutDate: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 25)),
      notes: 'Requires late checkout.',
      createdBy: user.id,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

