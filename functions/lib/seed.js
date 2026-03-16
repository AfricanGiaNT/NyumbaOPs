"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("./lib/firebase");
async function seed() {
    const now = new Date().toISOString();
    const properties = [
        {
            name: "Area 43 - House A",
            location: "Lilongwe",
            bedrooms: 3,
            bathrooms: 2,
            maxGuests: 6,
            nightlyRate: 55000,
            currency: "MWK",
            status: "ACTIVE",
            amenities: ["WiFi", "Parking", "Backup Power", "Kitchen"],
            images: [
                {
                    url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop",
                    alt: "Area 43 house A exterior",
                    sortOrder: 1,
                    isCover: true,
                },
            ],
        },
        {
            name: "City Center - Flat 2B",
            location: "Lilongwe",
            bedrooms: 2,
            bathrooms: 1,
            maxGuests: 4,
            nightlyRate: 45000,
            currency: "MWK",
            status: "ACTIVE",
            amenities: ["WiFi", "Hot Water"],
            images: [
                {
                    url: "https://images.unsplash.com/photo-1502672260066-6bc35f0bbe86?w=800&h=600&fit=crop",
                    alt: "City Center flat 2B exterior",
                    sortOrder: 1,
                    isCover: true,
                },
            ],
        },
    ];
    const categoryDocs = [
        { name: "Airbnb", type: "REVENUE", isSystem: true },
        { name: "Local", type: "REVENUE", isSystem: true },
        { name: "Utilities", type: "EXPENSE", isSystem: true },
    ];
    const propertyIds = [];
    for (const property of properties) {
        const docRef = await firebase_1.db.collection("properties").add({
            ...property,
            createdAt: now,
            updatedAt: now,
        });
        propertyIds.push(docRef.id);
    }
    for (const category of categoryDocs) {
        await firebase_1.db.collection("categories").add({
            ...category,
            createdBy: "seed",
            createdAt: now,
            updatedAt: now,
        });
    }
    console.log("Seeded properties:", propertyIds);
}
seed()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
